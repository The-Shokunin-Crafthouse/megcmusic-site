<?php
/**
 * Unit tests for the pure helpers in page-layout.php. Plain `php`, no
 * WordPress (wp-plugin-lint.yml):
 *
 *   php wp-plugin/megc-site-content/tests/page-layout.test.php
 */

declare( strict_types=1 );

define( 'ABSPATH', __DIR__ . '/' );
function add_filter( ...$args ) { return true; }
function add_action( ...$args ) { return true; }

require dirname( __DIR__ ) . '/page-layout.php';

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

// The FYC group as the plugin ships it: six sections, then the blocks.
$fyc     = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/acf-json/group_megc_layout_fyc.json' ), true );
$field   = $fyc['fields'][0];
$layouts = array_values( $field['layouts'] );
$names   = fn( array $rows ) => array_map( fn( $r ) => $r['acf_fc_layout'], $rows );

expect( 'the Page layout field is recognised', megc_layout_is_layout_field( $field ), true );
expect( 'another flexible field is not', megc_layout_is_layout_field( array( 'type' => 'flexible_content', 'name' => 'home_blocks' ) ), false );
expect( 'a text field named layout_x is not', megc_layout_is_layout_field( array( 'type' => 'text', 'name' => 'layout_x' ) ), false );

expect(
	'an empty list (ACF gives false) becomes every section in registry order',
	$names( megc_layout_prefill( false, $layouts ) ),
	array( 'section_press', 'section_about', 'section_watch', 'section_lyrics', 'section_listen', 'section_more' )
);

$stored = array(
	array( 'acf_fc_layout' => 'section_watch', 'field_megc_layout_fyc_section_watch_hidden' => '1' ),
	array( 'acf_fc_layout' => 'announcement', 'field_megc_layout_fyc_ann_headline' => 'New single' ),
	array( 'acf_fc_layout' => 'section_press', 'field_megc_layout_fyc_section_press_hidden' => '0' ),
);
$filled = megc_layout_prefill( $stored, $layouts );
expect(
	"Meg's rows stay first in her order; the sections she left out follow",
	$names( $filled ),
	array( 'section_watch', 'announcement', 'section_press', 'section_about', 'section_lyrics', 'section_listen', 'section_more' )
);
expect( 'a listed row keeps its values (the hidden switch stays on)', $filled[0]['field_megc_layout_fyc_section_watch_hidden'], '1' );
expect( 'an added row carries only its layout name — every sub-field takes its default', $filled[3], array( 'acf_fc_layout' => 'section_about' ) );
expect( 'no block is ever added', in_array( 'video', $names( $filled ), true ), false );
expect( 'a full list is returned unchanged', megc_layout_prefill( $filled, $layouts ), $filled );
expect( 'a malformed row is kept and does not stop the fill', count( megc_layout_prefill( array( 'junk', null ), $layouts ) ), 8 );

echo "\n{$count} tests, {$failures} failed\n";
exit( $failures ? 1 : 0 );
