<?php
/**
 * Unit tests for the pure helpers in shared-sections.php, and for the
 * shared-sections.json it ships with. Plain `php`, no WordPress
 * (wp-plugin-lint.yml):
 *
 *   php wp-plugin/megc-site-content/tests/shared-sections.test.php
 */

declare( strict_types=1 );

define( 'ABSPATH', __DIR__ . '/' );
function add_filter( ...$args ) { return true; }
function add_action( ...$args ) { return true; }

require dirname( __DIR__ ) . '/shared-sections.php';

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

// ---- The bundled config parses whole: nothing the generator wrote is dropped.
$raw    = (string) file_get_contents( dirname( __DIR__ ) . '/shared-sections.json' );
$json   = json_decode( $raw, true );
$config = megc_shared_parse_config( $raw );
expect( 'every shared set parses', count( $config['groups'] ), count( $json['groups'] ) );
expect( 'every editor box parses', count( $config['boxes'] ), count( $json['boxes'] ) );
expect( 'every link parses', count( $config['links'] ), count( $json['links'] ) );
expect( 'Home carries an editor for the press-kit downloads', in_array( '4-608-kit_items', array_column( $config['boxes'], 'id' ), true ), true );
expect( 'garbage is an empty config, not a fatal', megc_shared_parse_config( 'not json' ), array( 'groups' => array(), 'boxes' => array(), 'links' => array() ) );
expect(
	'a box naming a set that is not there is dropped',
	count( megc_shared_parse_config( '{"groups":[],"boxes":[{"id":"x","host":4,"group":"nope","sections":["X"]}]}' )['boxes'] ),
	0
);

// Every field a box can save is a field the plugin registers.
$keys = array();
foreach ( glob( dirname( __DIR__ ) . '/acf-json/*.json' ) as $file ) {
	foreach ( json_decode( (string) file_get_contents( $file ), true )['fields'] as $f ) {
		$keys[ $f['key'] ] = true;
	}
}
foreach ( $config['groups'] as $g ) {
	foreach ( $g['fields'] as $k ) {
		expect( "{$g['id']} field {$k} is registered", isset( $keys[ $k ] ), true );
	}
}

// ---- Wording.
expect( 'one name', megc_shared_join( array( 'EPK' ) ), 'EPK' );
expect( 'two names', megc_shared_join( array( 'Home', 'EPK' ) ), 'Home and EPK' );
expect( 'three names', megc_shared_join( array( 'Home', 'EPK', 'Music' ) ), 'Home, EPK and Music' );

$videos = array( 'id' => '5560-x', 'source' => 5560, 'fields' => array(), 'names' => array(), 'shownOn' => array( 4, 10 ) );
expect( 'from Home, the videos are also on Media and kept on Videos', megc_shared_elsewhere( $videos, 4 ), array( 10, 5560 ) );
expect( 'on the page that keeps them, both pages that show them', megc_shared_elsewhere( $videos, 5560 ), array( 4, 10 ) );
$kit = array( 'id' => '608-kit_items', 'source' => 608, 'fields' => array( 'field_kit' ), 'names' => array( 'kit_items' ), 'shownOn' => array( 4, 608 ) );
expect( 'from Home, the press kit is shared with the EPK page only', megc_shared_elsewhere( $kit, 4 ), array( 608 ) );

// ---- Only the box's own fields are ever saved.
expect(
	'a posted field the box was not given is dropped',
	megc_shared_pick( array( 'field_kit' => 'rows', 'field_meta_title' => 'hijack' ), $kit ),
	array( 'field_kit' => 'rows' )
);
expect( 'nothing posted, nothing saved', megc_shared_pick( null, $kit ), array() );

// ---- The token covers a repeater's rows and nothing else on the page.
$meta = array(
	'kit_items'         => array( '2' ),
	'_kit_items'        => array( 'field_kit' ),
	'kit_items_0_title' => array( 'EPK' ),
	'kit_items_1_title' => array( 'Sample Set List' ),
	'meta_title'        => array( 'Press Kit' ),
);
expect(
	'the rows are in, the field reference and other fields are out',
	array_keys( megc_shared_meta_of( $meta, $kit ) ),
	array( 'kit_items', 'kit_items_0_title', 'kit_items_1_title' )
);
$renamed = $meta;
$renamed['kit_items_0_title'] = array( 'Press Kit' );
expect( 'a changed row changes the token', megc_shared_token_of( megc_shared_meta_of( $renamed, $kit ) ) === megc_shared_token_of( megc_shared_meta_of( $meta, $kit ) ), false );
$other = $meta;
$other['meta_title'] = array( 'Something else' );
expect( 'another field on the page leaves the token alone', megc_shared_token_of( megc_shared_meta_of( $other, $kit ) ), megc_shared_token_of( megc_shared_meta_of( $meta, $kit ) ) );

// ---- Out-of-date editors. Meg (user 1) on Home (4); the EPK page is 608.
$t0 = 'T0';
$t1 = 'T1';
$t2 = 'T2';
expect( 'nothing changed since it opened: saves', megc_shared_is_current( $t0, $t0, array(), 1, 4 ), true );
expect( 'no token at all: held back', megc_shared_is_current( '', $t0, array(), 1, 4 ), false );
expect( 'changed from the EPK page since it opened: held back', megc_shared_is_current( $t0, $t1, array( array( 'from' => $t0, 'to' => $t1, 'user' => 1, 'host' => 608 ) ), 1, 4 ), false );
expect( 'changed by someone else on this page since it opened: held back', megc_shared_is_current( $t0, $t1, array( array( 'from' => $t0, 'to' => $t1, 'user' => 2, 'host' => 4 ) ), 1, 4 ), false );
expect(
	'her own earlier saves from this page, never reloaded by the block editor: saves',
	megc_shared_is_current( $t0, $t2, array( array( 'from' => $t0, 'to' => $t1, 'user' => 1, 'host' => 4 ), array( 'from' => $t1, 'to' => $t2, 'user' => 1, 'host' => 4 ) ), 1, 4 ),
	true
);
expect(
	'her own save, then one from the EPK page: held back',
	megc_shared_is_current( $t0, $t2, array( array( 'from' => $t0, 'to' => $t1, 'user' => 1, 'host' => 4 ), array( 'from' => $t1, 'to' => $t2, 'user' => 1, 'host' => 608 ) ), 1, 4 ),
	false
);
expect( 'a token the history has never seen: held back', megc_shared_is_current( 'T9', $t1, array( array( 'from' => $t0, 'to' => $t1, 'user' => 1, 'host' => 4 ) ), 1, 4 ), false );

echo "\n{$count} assertions, {$failures} failed\n";
exit( $failures > 0 ? 1 : 0 );
