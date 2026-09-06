<?php
/**
 * Plugin Name: MegC Site Content
 * Description: Registers the megcmusic.com site-content field groups (Secure Custom Fields / ACF) from bundled JSON and pings GitHub to rebuild the site when a site-content page is saved.
 * Version: 1.2.0
 * Requires PHP: 8.1
 * Author: The Shokunin Crafthouse
 * License: GPL-2.0-or-later
 *
 * Design constraints (sprint-11 contract, decisions.md 2026-08-29):
 * - No admin-hook fatals, ever: every hook body is guarded and exception-wrapped.
 *   Two abandoned plugins fataling on admin hooks took down wp-admin on 2026-08-27;
 *   this plugin must be incapable of joining that class.
 * - Degrades silently when SCF/ACF is absent or the wp-config constants are unset.
 * - Never uses wp-cron: this install's cron option intermittently fails to persist
 *   (Bluehost logs, 2026-08-27), so the 60s debounce is a transient, not a
 *   scheduled event. Bursts beyond the window are collapsed by the GitHub Actions
 *   concurrency group on the receiving workflow.
 *
 * Configuration — define in wp-config.php (never in this file, never in the DB):
 *   define( 'MEGC_GH_PAT',  '...' );  // fine-grained PAT, this repo only
 *   define( 'MEGC_GH_REPO', 'The-Shokunin-Crafthouse/megcmusic-site' );
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** WP page IDs whose saves should trigger a site rebuild (the editing surfaces). */
function megc_site_content_page_ids(): array {
	return array(
		4,    // home
		5,    // contact-me (booking)
		10,   // media
		20,   // events (shows lede)
		608,  // press-kit
		1847, // shop (lede)
		2931, // solo-acoustic
		2939, // full-band
		3742, // collabs (work with me)
		4350, // shadows-of-a-ghost-town (release + live FYC campaign)
		4378, // kindred-spirits (release)
		4395, // songs-from-the-sofa-2 (canonical release page)
		4403, // breaker-breaker (release)
		4411, // aint-going-back (release)
		4566, // fyc-kindred-spirits-meghan-clarisse (archived FYC campaign)
		5520, // photos (media gallery source)
		5560, // videos
		5562, // music
		3666, // sample-set-list (EPK set list source)
	);
}

/**
 * Register this plugin's acf-json directory as a Local JSON load point.
 * SCF keeps ACF's filter names, so this works under either plugin; with
 * neither active the filter simply never fires.
 */
add_filter( 'acf/settings/load_json', function ( $paths ) {
	if ( ! is_array( $paths ) ) {
		$paths = array();
	}
	$paths[] = __DIR__ . '/acf-json';
	return $paths;
} );

/**
 * Custom location rule "Page slug", used so the poetry field group can target
 * the site-poetry page before its ID exists (the page is created in Phase 2).
 */
add_filter( 'acf/location/rule_types', function ( $choices ) {
	if ( is_array( $choices ) ) {
		$choices['Page']['megc_page_slug'] = 'Page slug (MegC)';
	}
	return $choices;
} );

add_filter( 'acf/location/rule_values/megc_page_slug', function ( $choices ) {
	return is_array( $choices ) ? $choices : array();
} );

add_filter( 'acf/location/rule_match/megc_page_slug', function ( $match, $rule, $screen ) {
	try {
		$post_id = $screen['post_id'] ?? 0;
		if ( ! $post_id ) {
			return (bool) $match;
		}
		$post = get_post( $post_id );
		if ( ! $post instanceof WP_Post ) {
			return (bool) $match;
		}
		$is = ( $post->post_name === (string) ( $rule['value'] ?? '' ) );
		return ( ( $rule['operator'] ?? '==' ) === '!=' ) ? ! $is : $is;
	} catch ( Throwable $e ) {
		return (bool) $match;
	}
}, 10, 3 );

/**
 * Rebuild ping: fires on save of any tracked page (native editor save and
 * ACF field save both funnel through save_post). Leading-edge debounce via a
 * 60s transient — the first save dispatches immediately, saves inside the
 * window are suppressed here and collapsed by GHA concurrency; the nightly
 * scheduled rebuild (Phase 4) self-heals anything that slips through.
 */
add_action( 'save_post_page', function ( $post_id, $post, $update ) {
	try {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}
		if ( ! defined( 'MEGC_GH_PAT' ) || ! defined( 'MEGC_GH_REPO' ) ) {
			return; // Unconfigured: degrade silently.
		}
		if ( $post instanceof WP_Post && 'publish' !== $post->post_status ) {
			return;
		}

		$tracked = in_array( (int) $post_id, megc_site_content_page_ids(), true )
			|| ( $post instanceof WP_Post && 'site-poetry' === $post->post_name );
		if ( ! $tracked ) {
			return;
		}

		if ( false !== get_transient( 'megc_dispatch_lock' ) ) {
			return; // Within the debounce window.
		}
		set_transient( 'megc_dispatch_lock', time(), 60 );

		$response = wp_remote_post(
			'https://api.github.com/repos/' . MEGC_GH_REPO . '/dispatches',
			array(
				'timeout' => 10,
				'headers' => array(
					'Accept'               => 'application/vnd.github+json',
					'Authorization'        => 'Bearer ' . MEGC_GH_PAT,
					'X-GitHub-Api-Version' => '2022-11-28',
					'User-Agent'           => 'megc-site-content/1.2.0',
				),
				'body'    => wp_json_encode(
					array(
						'event_type'     => 'wp-content-updated',
						'client_payload' => array(
							'page_id' => (int) $post_id,
							'slug'    => $post instanceof WP_Post ? $post->post_name : '',
						),
					)
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			error_log( 'megc-site-content: dispatch failed — ' . $response->get_error_message() );
		} else {
			$code = (int) wp_remote_retrieve_response_code( $response );
			if ( 204 !== $code ) {
				error_log( 'megc-site-content: dispatch HTTP ' . $code . ' — ' . substr( (string) wp_remote_retrieve_body( $response ), 0, 300 ) );
			}
		}
	} catch ( Throwable $e ) {
		// The one rule that outranks all others: never fatal on a save hook.
		error_log( 'megc-site-content: suppressed exception — ' . $e->getMessage() );
	}
}, 20, 3 );
