<?php
/**
 * Plugin Name: MegC Site Content
 * Description: Registers the megcmusic.com site-content field groups (Secure Custom Fields / ACF) from bundled JSON, puts an editor for every shared section on each page that shows it, pings GitHub to rebuild the site when a site-content page is saved, and points every "View", "Preview" and "Visit Site" link — and every visitor who lands on this host's front end — at the live site on megcmusic.com.
 * Version: 1.6.2
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
 *   define( 'MEGC_LIVE_ORIGIN', 'https://megcmusic.com' ); // optional; this is the default
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Shared sections (1.6.0): an editor for shared fields on every page that shows them.
require_once __DIR__ . '/shared-sections.php';

/** WP page IDs whose saves should trigger a site rebuild (the editing surfaces). */
function megc_site_content_page_ids(): array {
	return array(
		4,    // home
		5,    // contact-me (booking)
		10,   // media
		20,   // events (shows lede)
		608,  // press-kit
		1847, // shop (lede)
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
		5134, // reviews-shadows-of-a-ghost-town (absorbed as /music/shadows-of-a-ghost-town/reviews)
		5339, // kindred-spirits-review (absorbed as /music/kindred-spirits/reviews)
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
					'User-Agent'           => 'megc-site-content/1.6.2',
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

/* -------------------------------------------------------------------------
 * The front door (1.4.0).
 *
 * WordPress on this host is Meg's editing surface; the site visitors see is
 * the Next.js front-end on megcmusic.com, rebuilt from her fields. WordPress
 * does not know that: its `home` option is this host, so "Visit Site", every
 * page's "View" link and the editor's "Preview" button all open the old
 * Storefront theme here, which renders none of her fields. The three hooks
 * below give WordPress the live address for every page it has one for.
 *
 * `home`/`siteurl` are deliberately left alone: moving `home` to the apex
 * would also move `rest_url()` (the block editor's API root), WooCommerce's
 * cart/checkout permalinks and The Events Calendar's ticket pages onto a host
 * that does not serve them.
 * ---------------------------------------------------------------------- */

/** Origin of the live site. Overridable from wp-config for a staging host. */
function megc_live_origin(): string {
	$origin = defined( 'MEGC_LIVE_ORIGIN' ) ? (string) MEGC_LIVE_ORIGIN : 'https://megcmusic.com';
	return rtrim( $origin, '/' );
}

/**
 * The live route for a WordPress page, or null when the page has no home on
 * the live site and must keep being served here (WooCommerce cart, checkout
 * and account; Event Tickets checkout). Pure: no WordPress calls, so it is unit-tested in
 * tests/live-routes.test.php. Keep the ids in step with
 * megc_site_content_page_ids() and with src/app/**\/page.tsx.
 *
 * A route may carry a fragment: the section of the live page that the
 * WordPress page feeds (the ids in src/app/**\/page.tsx).
 */
function megc_live_route_for( int $post_id, string $slug ): ?string {
	$by_id = array(
		4    => '/',                                   // home
		5    => '/booking',                            // contact-me
		10   => '/media',                              // media
		20   => '/shows',                              // events (Shows lede)
		608  => '/epk',                                // press-kit
		1847 => '/shop',                               // shop (lede)
		// Retired 2026-09-23: the Live Formats cards left Music and nothing reads
		// these pages. They stay published, so their View link still lands on Music.
		2931 => '/music',                              // solo-acoustic
		2939 => '/music',                              // full-band
		3742 => '/music#music-collab',                 // collabs (Work With Me)
		3666 => '/epk#epk-setlist',                    // sample-set-list
		4350 => '/fyc/shadows-of-a-ghost-town',        // FYC campaign + release page
		4566 => '/fyc/kindred-spirits',                // archived FYC campaign
		4378 => '/music/kindred-spirits',              // release
		4395 => '/music/songs-from-the-sofa',          // release (WP slug carries a "-2")
		4403 => '/music/breaker-breaker',              // release
		4411 => '/music/aint-going-back',              // release
		5560 => '/media#media-watch',                  // videos
		5562 => '/music',                              // music
		// Absorbed from the old theme, 2026-09-17: the gallery page and the
		// two review pages now render on the live site.
		5520 => '/media#media-photos',                 // photos (the gallery's source)
		5134 => '/music/shadows-of-a-ghost-town/reviews', // Reviews: Shadows of a Ghost Town
		5339 => '/music/kindred-spirits/reviews',      // Kindred Spirits Review
	);
	if ( isset( $by_id[ $post_id ] ) ) {
		return $by_id[ $post_id ];
	}
	if ( 'site-poetry' === $slug ) {
		return '/poetry';
	}
	return null;
}

/**
 * A release page Meg adds later has no id above; it is found through the
 * Music page's "Your releases" rows, exactly as the site finds it. Null when
 * the page is not a release or the field API is unavailable.
 */
function megc_release_route_for( int $post_id ): ?string {
	try {
		if ( ! function_exists( 'get_field' ) ) {
			return null;
		}
		$rows = get_field( 'releases', 5562 );
		if ( ! is_array( $rows ) ) {
			return null;
		}
		foreach ( $rows as $row ) {
			$page = is_array( $row ) ? ( $row['release_page'] ?? null ) : null;
			$id   = $page instanceof WP_Post ? $page->ID : ( is_array( $page ) ? (int) ( $page['ID'] ?? 0 ) : (int) $page );
			if ( $id === $post_id ) {
				$post = get_post( $post_id );
				return $post instanceof WP_Post && '' !== $post->post_name ? '/music/' . $post->post_name : null;
			}
		}
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: release route lookup suppressed — ' . $e->getMessage() );
	}
	return null;
}

/** Absolute live URL for a page, or null when it stays on this host. */
function megc_live_url_for_post( $post ): ?string {
	try {
		$post = get_post( $post );
		if ( ! $post instanceof WP_Post || 'page' !== $post->post_type ) {
			return null;
		}
		$route = megc_live_route_for( (int) $post->ID, (string) $post->post_name );
		if ( null === $route ) {
			$route = megc_release_route_for( (int) $post->ID );
		}
		return null === $route ? null : megc_live_origin() . $route;
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: live url suppressed — ' . $e->getMessage() );
		return null;
	}
}

/** "View" links everywhere WordPress builds a page permalink (list table,
 *  editor, admin bar, REST `link`). WooCommerce and Event Tickets pages map
 *  to null and keep their own permalinks. */
add_filter( 'page_link', function ( $link, $post_id ) {
	$live = megc_live_url_for_post( $post_id );
	return null === $live ? $link : $live;
}, 10, 2 );

/** The editor's "Preview" button. The live site renders what is published,
 *  so the preview is the published page; the guide says to Update, wait,
 *  then look. */
add_filter( 'preview_post_link', function ( $link, $post ) {
	$live = megc_live_url_for_post( $post );
	return null === $live ? $link : $live;
}, 10, 2 );

/** The admin bar's site name and "Visit Site" open the live site. */
add_action( 'admin_bar_menu', function ( $bar ) {
	try {
		if ( ! $bar instanceof WP_Admin_Bar ) {
			return;
		}
		foreach ( array( 'site-name', 'view-site' ) as $id ) {
			$node = $bar->get_node( $id );
			if ( $node ) {
				$bar->add_node( array( 'id' => $id, 'href' => megc_live_origin() . '/' ) );
			}
		}
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: admin bar suppressed — ' . $e->getMessage() );
	}
}, 100 );

/**
 * A visitor (Meg included) who reaches this host's front end is sent to the
 * live page. Only requests the live site has a home for are redirected;
 * WooCommerce, Event Tickets and The Events Calendar keep serving here, as
 * do feeds, previews of nothing, and any page mapped to null. `?megc_wp=1`
 * shows the WordPress theme anyway, for debugging.
 */
add_action( 'template_redirect', function () {
	try {
		if ( is_admin() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}
		if ( isset( $_GET['megc_wp'] ) || is_feed() || is_robots() || is_trackback() ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}
		if ( function_exists( 'is_woocommerce' ) && ( is_woocommerce() || is_cart() || is_checkout() || is_account_page() ) ) {
			return;
		}
		if ( is_singular( 'tribe_events' ) || is_post_type_archive( 'tribe_events' ) || is_tax( 'tribe_events_cat' ) ) {
			return;
		}

		$target = null;
		if ( is_front_page() ) {
			$target = megc_live_origin() . '/';
		} elseif ( is_page() ) {
			$target = megc_live_url_for_post( get_queried_object() );
		}
		if ( null === $target ) {
			return;
		}
		// 302, not 301: browsers cache a 301 forever, and this map will change
		// as pages are added; the live site is where the page is shown, not
		// where it lives.
		wp_redirect( $target, 302 ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect -- fixed origin from megc_live_origin(), never user input
		exit;
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: front-door redirect suppressed — ' . $e->getMessage() );
	}
}, 1 );

