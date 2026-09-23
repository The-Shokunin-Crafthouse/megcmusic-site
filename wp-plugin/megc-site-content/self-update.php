<?php
/**
 * Self-update from GitHub releases (1.7.0, ADR 2026-09-23).
 *
 * Every earlier version of this plugin reached WordPress as a zip Levi
 * uploaded by hand. From 1.7.0 the plugin updates itself: the main file's
 * `Update URI` header points WordPress (5.8+) at github.com, and the
 * `update_plugins_github.com` filter below answers with the newest
 * `plugin-v<version>` release of this repo when — and only when — its
 * version is strictly higher than the one installed. The repo is public, so
 * the read needs no token. WordPress then shows the usual "Update now" on
 * the Plugins screen.
 *
 * WordPress checks for updates on its own schedule (and wp-cron here is not
 * to be trusted), so the release workflow does not wait for it: after it
 * publishes a release it POSTs /wp-json/megc/v1/self-update, which runs the
 * same Plugin_Upgrader that "Update now" runs and answers with the version
 * now on disk. "Update now" stays as the by-hand fallback.
 *
 * Plugin rules (see megc-site-content.php): every hook body is guarded and
 * exception-wrapped, every error is logged with the `megc-site-content:`
 * prefix, and nothing here can fatal wp-admin. A failed lookup means no
 * update is offered, never a broken screen.
 *
 * Pure helpers (no WordPress calls) are unit-tested in tests/self-update.test.php.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const MEGC_UPDATE_REPO   = 'The-Shokunin-Crafthouse/megcmusic-site';
const MEGC_UPDATE_SLUG   = 'megc-site-content';
const MEGC_UPDATE_ASSET  = 'megc-site-content.zip';
const MEGC_UPDATE_PLUGIN = 'megc-site-content/megc-site-content.php';
const MEGC_UPDATE_CACHE  = 'megc_update_release';

/* -------------------------------------------------------------------------
 * Pure helpers.
 * ---------------------------------------------------------------------- */

/** "plugin-v1.7.0" → "1.7.0". Anything that is not exactly a plugin tag is null. */
function megc_update_version_from_tag( string $tag ): ?string {
	return preg_match( '/^plugin-v(\d+\.\d+\.\d+)$/', $tag, $m ) ? $m[1] : null;
}

/**
 * True only when $candidate is strictly higher than $installed, both being
 * plain x.y.z. A malformed version on either side is never an update: the
 * safe direction is to leave what is installed alone.
 */
function megc_update_is_newer( string $candidate, string $installed ): bool {
	$semver = '/^\d+\.\d+\.\d+$/';
	if ( ! preg_match( $semver, $candidate ) || ! preg_match( $semver, $installed ) ) {
		return false;
	}
	return version_compare( $candidate, $installed, '>' );
}

/** Only a release asset of this repo is ever handed to the upgrader. */
function megc_update_package_is_trusted( string $url ): bool {
	return 0 === strpos( $url, 'https://github.com/' . MEGC_UPDATE_REPO . '/releases/download/' );
}

/**
 * From GitHub's /releases list, the newest published plugin release that
 * carries the plugin zip: drafts, pre-releases, releases of anything else
 * and releases without the zip are passed over. Null when there is none.
 */
function megc_update_pick_release( array $releases ): ?array {
	$best = null;
	foreach ( $releases as $r ) {
		if ( ! is_array( $r ) || ! empty( $r['draft'] ) || ! empty( $r['prerelease'] ) ) {
			continue;
		}
		$version = megc_update_version_from_tag( (string) ( $r['tag_name'] ?? '' ) );
		if ( null === $version ) {
			continue;
		}
		$package = null;
		foreach ( ( is_array( $r['assets'] ?? null ) ? $r['assets'] : array() ) as $asset ) {
			if ( is_array( $asset ) && MEGC_UPDATE_ASSET === ( $asset['name'] ?? '' ) && is_string( $asset['browser_download_url'] ?? null ) ) {
				$package = $asset['browser_download_url'];
				break;
			}
		}
		if ( null === $package ) {
			continue;
		}
		if ( null !== $best && ! megc_update_is_newer( $version, $best['version'] ) ) {
			continue;
		}
		$best = array(
			'version'   => $version,
			'tag'       => (string) $r['tag_name'],
			'package'   => $package,
			'url'       => (string) ( $r['html_url'] ?? '' ),
			'notes'     => (string) ( $r['body'] ?? '' ),
			'published' => (string) ( $r['published_at'] ?? '' ),
		);
	}
	return $best;
}

/**
 * What the update_plugins_github.com filter hands WordPress: the release,
 * shaped as WordPress wants it, when it is strictly newer than what is
 * installed and its package comes from this repo. Null otherwise — WordPress
 * then offers nothing, and nothing is ever downgraded.
 */
function megc_update_offer( ?array $release, string $installed ): ?array {
	if ( null === $release ) {
		return null;
	}
	$version = (string) ( $release['version'] ?? '' );
	$package = (string) ( $release['package'] ?? '' );
	if ( ! megc_update_is_newer( $version, $installed ) || ! megc_update_package_is_trusted( $package ) ) {
		return null;
	}
	return array(
		'slug'         => MEGC_UPDATE_SLUG,
		'version'      => $version,
		'url'          => (string) ( $release['url'] ?? '' ),
		'package'      => $package,
		'requires_php' => '8.1',
	);
}

/* -------------------------------------------------------------------------
 * WordPress.
 * ---------------------------------------------------------------------- */

/** The version on disk, read from the main file's header (fresh every call — after an upgrade the file is new, the running code is not). */
function megc_update_installed_version(): string {
	try {
		$data = get_file_data( __DIR__ . '/megc-site-content.php', array( 'Version' => 'Version' ) );
		return trim( (string) ( $data['Version'] ?? '' ) );
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: version read suppressed — ' . $e->getMessage() );
		return '';
	}
}

/**
 * The newest plugin release on GitHub, cached in a transient for six hours
 * (a failed lookup is remembered for fifteen minutes, so a GitHub outage
 * does not turn every wp-admin page load into a slow request). $fresh skips
 * the cache — the push-install route uses it, so it never installs a stale
 * answer. Null when there is no release or GitHub cannot be read.
 */
function megc_update_fetch_release( bool $fresh = false ): ?array {
	try {
		if ( ! $fresh ) {
			$cached = get_transient( MEGC_UPDATE_CACHE );
			if ( is_array( $cached ) && array_key_exists( 'release', $cached ) ) {
				return $cached['release'];
			}
		}
		$response = wp_remote_get(
			'https://api.github.com/repos/' . MEGC_UPDATE_REPO . '/releases?per_page=20',
			array(
				'timeout' => 10,
				'headers' => array(
					'Accept'               => 'application/vnd.github+json',
					'X-GitHub-Api-Version' => '2022-11-28',
					'User-Agent'           => 'megc-site-content/' . megc_update_installed_version(),
				),
			)
		);
		if ( is_wp_error( $response ) ) {
			error_log( 'megc-site-content: release lookup failed — ' . $response->get_error_message() );
			set_transient( MEGC_UPDATE_CACHE, array( 'release' => null ), 15 * MINUTE_IN_SECONDS );
			return null;
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		$body = (string) wp_remote_retrieve_body( $response );
		if ( 200 !== $code ) {
			error_log( 'megc-site-content: release lookup HTTP ' . $code . ' — ' . substr( $body, 0, 300 ) );
			set_transient( MEGC_UPDATE_CACHE, array( 'release' => null ), 15 * MINUTE_IN_SECONDS );
			return null;
		}
		$list    = json_decode( $body, true );
		$release = is_array( $list ) ? megc_update_pick_release( $list ) : null;
		set_transient( MEGC_UPDATE_CACHE, array( 'release' => $release ), 6 * HOUR_IN_SECONDS );
		return $release;
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: release lookup suppressed — ' . $e->getMessage() );
		return null;
	}
}

/**
 * WordPress asks here (5.8+) because the main file's `Update URI` is on
 * github.com. $update arrives as false; false back means "nothing to offer".
 */
add_filter( 'update_plugins_github.com', function ( $update, $plugin_data, $plugin_file, $locales ) {
	try {
		if ( MEGC_UPDATE_PLUGIN !== $plugin_file ) {
			return $update; // Some other plugin hosted on GitHub: not ours to answer.
		}
		$installed = (string) ( is_array( $plugin_data ) ? ( $plugin_data['Version'] ?? '' ) : '' );
		$offer     = megc_update_offer( megc_update_fetch_release(), $installed );
		return null === $offer ? $update : $offer;
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: update check suppressed — ' . $e->getMessage() );
		return $update;
	}
}, 10, 4 );

/** "Check again" on Dashboard → Updates drops our cache too, so it really checks again. */
add_action( 'load-update-core.php', function () {
	try {
		if ( isset( $_GET['force-check'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only cache drop
			delete_transient( MEGC_UPDATE_CACHE );
		}
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: cache drop suppressed — ' . $e->getMessage() );
	}
} );

/**
 * The "View version x.y.z details" link on the Plugins screen asks
 * wordpress.org for a plugin of this slug, which does not exist there.
 * Answer it from the release instead: the release notes are the changelog.
 */
add_filter( 'plugins_api', function ( $result, $action, $args ) {
	try {
		$slug = is_object( $args ) ? ( $args->slug ?? null ) : ( is_array( $args ) ? ( $args['slug'] ?? null ) : null );
		if ( 'plugin_information' !== $action || MEGC_UPDATE_SLUG !== $slug ) {
			return $result;
		}
		$release = megc_update_fetch_release();
		if ( null === $release ) {
			return $result;
		}
		return (object) array(
			'name'          => 'MegC Site Content',
			'slug'          => MEGC_UPDATE_SLUG,
			'version'       => $release['version'],
			'author'        => 'The Shokunin Crafthouse',
			'homepage'      => 'https://github.com/' . MEGC_UPDATE_REPO,
			'download_link' => $release['package'],
			'requires_php'  => '8.1',
			'last_updated'  => $release['published'],
			'sections'      => array(
				'changelog' => '<pre style="white-space:pre-wrap">' . esc_html( $release['notes'] ) . '</pre>',
			),
		);
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: plugin information suppressed — ' . $e->getMessage() );
		return $result;
	}
}, 10, 3 );

/**
 * POST /wp-json/megc/v1/self-update — the push install. Needs a user who
 * can update plugins (the release workflow authenticates with the
 * megc-automation application password). Installs the newest release when
 * it is newer than what is on disk, and answers with the version now on
 * disk either way, so the caller can verify it.
 */
add_action( 'rest_api_init', function () {
	try {
		register_rest_route(
			'megc/v1',
			'/self-update',
			array(
				'methods'             => 'POST',
				'callback'            => 'megc_update_rest_self_update',
				'permission_callback' => function () {
					return current_user_can( 'update_plugins' );
				},
			)
		);
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: route registration suppressed — ' . $e->getMessage() );
	}
} );

function megc_update_rest_self_update( $request ) {
	$before = megc_update_installed_version();
	try {
		if ( ! wp_is_file_mod_allowed( 'megc_self_update' ) ) {
			return new WP_REST_Response( array( 'ok' => false, 'error' => 'file_mods_disallowed', 'installed' => $before ), 403 );
		}
		$release = megc_update_fetch_release( true );
		if ( null === $release ) {
			return new WP_REST_Response( array( 'ok' => false, 'error' => 'release_unavailable', 'installed' => $before ), 502 );
		}
		$offer = megc_update_offer( $release, $before );
		if ( null === $offer ) {
			return new WP_REST_Response( array( 'ok' => true, 'updated' => false, 'installed' => $before, 'latest' => $release['version'] ), 200 );
		}

		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/misc.php';

		// Plugin_Upgrader::bulk_upgrade() installs whatever the update_plugins
		// transient says, so hand it this release directly rather than waiting
		// for wp_update_plugins() (which returns early when wordpress.org is slow).
		$current = get_site_transient( 'update_plugins' );
		if ( ! is_object( $current ) ) {
			$current = new stdClass();
		}
		if ( ! isset( $current->response ) || ! is_array( $current->response ) ) {
			$current->response = array();
		}
		$entry              = (object) $offer;
		$entry->id          = 'https://github.com/' . MEGC_UPDATE_REPO;
		$entry->plugin      = MEGC_UPDATE_PLUGIN;
		$entry->new_version = $offer['version'];
		$current->response[ MEGC_UPDATE_PLUGIN ] = $entry;
		set_site_transient( 'update_plugins', $current );

		// The same path as the Plugins screen's "Update now" (wp_ajax_update_plugin):
		// the folder is replaced in place, the plugin stays active. Any output
		// the skin might emit is swallowed so the response stays JSON.
		ob_start();
		$skin     = new WP_Ajax_Upgrader_Skin();
		$upgrader = new Plugin_Upgrader( $skin );
		$result   = $upgrader->bulk_upgrade( array( MEGC_UPDATE_PLUGIN ) );
		ob_end_clean();

		$errors = $skin->get_error_messages();
		$item   = is_array( $result ) ? ( $result[ MEGC_UPDATE_PLUGIN ] ?? null ) : $result;
		if ( is_wp_error( $item ) ) {
			$errors[] = $item->get_error_message();
		} elseif ( ! $item ) {
			$errors[] = 'the upgrader did not run (filesystem credentials?)';
		}
		$after = megc_update_installed_version();
		$ok    = empty( $errors ) && $after === $offer['version'];
		if ( ! $ok ) {
			error_log( 'megc-site-content: self-update to ' . $offer['version'] . ' failed — ' . implode( '; ', $errors ) . ' (on disk: ' . $after . ')' );
		}
		return new WP_REST_Response(
			array(
				'ok'        => $ok,
				'updated'   => $after !== $before,
				'installed' => $after,
				'previous'  => $before,
				'latest'    => $release['version'],
				'errors'    => array_values( array_unique( array_map( 'strval', $errors ) ) ),
			),
			$ok ? 200 : 500
		);
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: self-update suppressed — ' . $e->getMessage() );
		return new WP_REST_Response( array( 'ok' => false, 'error' => 'exception', 'message' => $e->getMessage(), 'installed' => megc_update_installed_version() ?: $before ), 500 );
	}
}
