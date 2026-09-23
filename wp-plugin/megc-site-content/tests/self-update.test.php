<?php
/**
 * Unit tests for the pure helpers in self-update.php: reading a version out
 * of a release tag, choosing the release to offer from GitHub's list, the
 * strictly-newer rule, and the package-origin check. Plain `php`, no
 * WordPress (wp-plugin-lint.yml):
 *
 *   php wp-plugin/megc-site-content/tests/self-update.test.php
 */

declare( strict_types=1 );

define( 'ABSPATH', __DIR__ . '/' );
function add_filter( ...$args ) { return true; }
function add_action( ...$args ) { return true; }

require dirname( __DIR__ ) . '/self-update.php';

$failures = 0;
$count    = 0;
function expect( string $name, $actual, $expected ): void {
	global $failures, $count;
	$count++;
	if ( $actual === $expected ) {
		echo "ok - {$name}\n";
		return;
	}
	$failures++;
	echo "not ok - {$name}\n    expected: " . var_export( $expected, true ) . "\n    actual:   " . var_export( $actual, true ) . "\n";
}

const OWNER_REPO = 'The-Shokunin-Crafthouse/megcmusic-site';
const DOWNLOAD   = 'https://github.com/' . OWNER_REPO . '/releases/download/';

/** A GitHub release object as the /releases list returns it, with one zip asset. */
function release( string $tag, array $over = array() ): array {
	$version = substr( $tag, strlen( 'plugin-v' ) );
	return array_merge(
		array(
			'tag_name'     => $tag,
			'name'         => "megc-site-content {$version}",
			'draft'        => false,
			'prerelease'   => false,
			'html_url'     => 'https://github.com/' . OWNER_REPO . '/releases/tag/' . $tag,
			'body'         => "Notes for {$version}",
			'published_at' => '2026-09-23T12:00:00Z',
			'assets'       => array(
				array(
					'name'                 => 'megc-site-content.zip',
					'browser_download_url' => DOWNLOAD . $tag . '/megc-site-content.zip',
				),
			),
		),
		$over
	);
}

// ---- The version is read from the tag, and only from a plugin tag.
expect( 'plugin-v1.7.0 is 1.7.0', megc_update_version_from_tag( 'plugin-v1.7.0' ), '1.7.0' );
expect( 'plugin-v10.20.30 keeps every digit', megc_update_version_from_tag( 'plugin-v10.20.30' ), '10.20.30' );
expect( 'a site tag is not a plugin version', megc_update_version_from_tag( 'v1.7.0' ), null );
expect( 'a two-part version is refused', megc_update_version_from_tag( 'plugin-v1.7' ), null );
expect( 'a pre-release suffix is refused', megc_update_version_from_tag( 'plugin-v1.7.0-rc1' ), null );
expect( 'an empty tag is refused', megc_update_version_from_tag( '' ), null );
expect( 'trailing garbage is refused', megc_update_version_from_tag( 'plugin-v1.7.0.zip' ), null );

// ---- Strictly newer, never a downgrade, never a sideways move.
expect( '1.7.0 is newer than 1.6.1', megc_update_is_newer( '1.7.0', '1.6.1' ), true );
expect( '1.6.2 is newer than 1.6.1', megc_update_is_newer( '1.6.2', '1.6.1' ), true );
expect( '2.0.0 is newer than 1.99.99', megc_update_is_newer( '2.0.0', '1.99.99' ), true );
expect( '1.10.0 is newer than 1.9.0 (numeric, not lexical)', megc_update_is_newer( '1.10.0', '1.9.0' ), true );
expect( 'the same version is not an update', megc_update_is_newer( '1.7.0', '1.7.0' ), false );
expect( 'an older release is never offered', megc_update_is_newer( '1.6.1', '1.7.0' ), false );
expect( 'a malformed candidate is never offered', megc_update_is_newer( 'latest', '1.7.0' ), false );
expect( 'a malformed installed version blocks the offer', megc_update_is_newer( '1.7.0', '' ), false );

// ---- Choosing the release from GitHub's list.
$list = array( release( 'plugin-v1.6.2' ), release( 'plugin-v1.7.0' ), release( 'plugin-v1.6.1' ) );
$pick = megc_update_pick_release( $list );
expect( 'the highest plugin release wins, whatever the list order', $pick['version'] ?? null, '1.7.0' );
expect( 'the pick carries its tag', $pick['tag'] ?? null, 'plugin-v1.7.0' );
expect( 'the pick carries the zip download', $pick['package'] ?? null, DOWNLOAD . 'plugin-v1.7.0/megc-site-content.zip' );
expect( 'the pick carries the release page', $pick['url'] ?? null, 'https://github.com/' . OWNER_REPO . '/releases/tag/plugin-v1.7.0' );
expect( 'the pick carries the notes', $pick['notes'] ?? null, 'Notes for 1.7.0' );

expect( 'a draft is skipped', megc_update_pick_release( array( release( 'plugin-v1.8.0', array( 'draft' => true ) ), release( 'plugin-v1.7.0' ) ) )['version'] ?? null, '1.7.0' );
expect( 'a pre-release is skipped', megc_update_pick_release( array( release( 'plugin-v1.8.0', array( 'prerelease' => true ) ), release( 'plugin-v1.7.0' ) ) )['version'] ?? null, '1.7.0' );
expect( 'a release of something else is skipped', megc_update_pick_release( array( release( 'plugin-v1.7.0', array( 'tag_name' => 'v9.0.0' ) ), release( 'plugin-v1.7.0' ) ) )['version'] ?? null, '1.7.0' );
expect( 'a release with no zip is skipped', megc_update_pick_release( array( release( 'plugin-v1.8.0', array( 'assets' => array() ) ), release( 'plugin-v1.7.0' ) ) )['version'] ?? null, '1.7.0' );
expect(
	'a release whose zip has another name is skipped',
	megc_update_pick_release( array( release( 'plugin-v1.8.0', array( 'assets' => array( array( 'name' => 'source.zip', 'browser_download_url' => DOWNLOAD . 'plugin-v1.8.0/source.zip' ) ) ) ), release( 'plugin-v1.7.0' ) ) )['version'] ?? null,
	'1.7.0'
);
expect( 'no plugin release at all is null, not a fatal', megc_update_pick_release( array( release( 'x', array( 'tag_name' => 'v1.0.0' ) ) ) ), null );
expect( 'an empty list is null', megc_update_pick_release( array() ), null );
expect( 'garbage entries are ignored', megc_update_pick_release( array( 'not a release', 42, null, release( 'plugin-v1.7.0' ) ) )['version'] ?? null, '1.7.0' );

// ---- Only this repo's release assets are ever installed.
expect( 'this repo\'s release download is trusted', megc_update_package_is_trusted( DOWNLOAD . 'plugin-v1.7.0/megc-site-content.zip' ), true );
expect( 'another repo is not', megc_update_package_is_trusted( 'https://github.com/someone-else/megcmusic-site/releases/download/plugin-v1.7.0/megc-site-content.zip' ), false );
expect( 'plain http is not', megc_update_package_is_trusted( 'http://github.com/' . OWNER_REPO . '/releases/download/plugin-v1.7.0/megc-site-content.zip' ), false );
expect( 'a look-alike host is not', megc_update_package_is_trusted( 'https://github.com.evil.example/' . OWNER_REPO . '/releases/download/plugin-v1.7.0/megc-site-content.zip' ), false );
expect( 'a path outside releases/download is not', megc_update_package_is_trusted( 'https://github.com/' . OWNER_REPO . '/archive/refs/heads/main.zip' ), false );
expect( 'an empty url is not', megc_update_package_is_trusted( '' ), false );

// ---- The offer WordPress is handed.
$offer = megc_update_offer( $pick, '1.6.1' );
expect( 'a newer release is offered', is_array( $offer ), true );
expect( 'the offer names the plugin slug', $offer['slug'] ?? null, 'megc-site-content' );
expect( 'the offer carries the new version', $offer['version'] ?? null, '1.7.0' );
expect( 'the offer carries the package', $offer['package'] ?? null, DOWNLOAD . 'plugin-v1.7.0/megc-site-content.zip' );
expect( 'the offer carries the release page', $offer['url'] ?? null, 'https://github.com/' . OWNER_REPO . '/releases/tag/plugin-v1.7.0' );
expect( 'the offer states the PHP floor', $offer['requires_php'] ?? null, '8.1' );
expect( 'the same version is no offer', megc_update_offer( $pick, '1.7.0' ), null );
expect( 'a newer installed version is no offer (never downgrade)', megc_update_offer( $pick, '1.8.0' ), null );
expect( 'no release is no offer', megc_update_offer( null, '1.6.1' ), null );
$foreign = $pick;
$foreign['package'] = 'https://example.com/megc-site-content.zip';
expect( 'a package from anywhere else is no offer', megc_update_offer( $foreign, '1.6.1' ), null );

echo "\n{$count} assertions, {$failures} failed\n";
exit( $failures > 0 ? 1 : 0 );
