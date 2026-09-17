<?php
/**
 * Unit tests for the pure route map in megc-site-content.php. Runs with plain
 * `php` (wp-plugin-lint.yml); WordPress is stubbed to the four calls the
 * plugin makes at load time, so a stub that goes missing fails loudly here
 * rather than fataling on the live install.
 *
 *   php wp-plugin/megc-site-content/tests/live-routes.test.php
 */

declare( strict_types=1 );

define( 'ABSPATH', __DIR__ . '/' );
function add_filter( ...$args ) { return true; }
function add_action( ...$args ) { return true; }

require dirname( __DIR__ ) . '/megc-site-content.php';

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

// Every tracked editing surface has a live route.
foreach ( megc_site_content_page_ids() as $id ) {
	expect( "tracked page {$id} has a live route", is_string( megc_live_route_for( $id, '' ) ), true );
}

// The poetry page is found by slug, because its id was minted after the plugin.
expect( 'site-poetry by slug', megc_live_route_for( 999999, 'site-poetry' ), '/poetry' );

// Exact routes that the front-end serves today (src/app/**/page.tsx).
expect( 'home', megc_live_route_for( 4, 'home' ), '/' );
expect( 'booking', megc_live_route_for( 5, 'contact-me' ), '/booking' );
expect( 'epk', megc_live_route_for( 608, 'press-kit' ), '/epk' );
expect( 'music', megc_live_route_for( 5562, 'music' ), '/music' );
expect( 'songs from the sofa drops the -2', megc_live_route_for( 4395, 'songs-from-the-sofa-2' ), '/music/songs-from-the-sofa' );
expect( 'FYC shadows', megc_live_route_for( 4350, 'shadows-of-a-ghost-town' ), '/fyc/shadows-of-a-ghost-town' );
expect( 'FYC kindred (slug differs from route)', megc_live_route_for( 4566, 'fyc-kindred-spirits-meghan-clarisse' ), '/fyc/kindred-spirits' );
expect( 'videos feed a section of /media', megc_live_route_for( 5560, 'videos' ), '/media#media-watch' );
expect( 'set list feeds a section of /epk', megc_live_route_for( 3666, 'sample-set-list' ), '/epk#epk-setlist' );

// Commerce and ticketing stay on WordPress.
foreach ( array( 1848 => 'cart', 1849 => 'checkout', 1850 => 'my-account', 3547 => 'tickets-checkout', 3548 => 'tickets-order' ) as $id => $slug ) {
	expect( "{$slug} stays on WordPress", megc_live_route_for( $id, $slug ), null );
}

// Pages the live site still links to on this host stay until they have a home.
foreach ( array( 5520 => 'photos', 5339 => 'kindred-spirits-review', 5134 => 'reviews-shadows-of-a-ghost-town' ) as $id => $slug ) {
	expect( "{$slug} stays on WordPress", megc_live_route_for( $id, $slug ), null );
}

// The origin is overridable and never carries a trailing slash.
expect( 'default origin', megc_live_origin(), 'https://megcmusic.com' );

echo "\n{$count} assertions, {$failures} failed\n";
exit( $failures > 0 ? 1 : 0 );
