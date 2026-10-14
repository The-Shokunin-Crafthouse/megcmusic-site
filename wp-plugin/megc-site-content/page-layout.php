<?php
/**
 * Page layout, pre-filled (1.8.0, ADR 2026-10-14).
 *
 * Until 1.8.0 the "Page layout" list on a page showed only the rows someone
 * had added to it, while the live site rendered every section regardless
 * (the ones not listed followed, in their usual order). Two sections could
 * be on the live page and nowhere in the dashboard, and the only way to move
 * one was to know its name and add it first. This file fills the list in the
 * editor: every section layout the field offers that is not already a row is
 * appended, in the order the registry gives them, so what Meg sees is the
 * page, top to bottom. Nothing is written until she presses Update; the site
 * build reads the stored value and resolves it exactly as before.
 *
 * Plugin rules (see megc-site-content.php): every hook body is guarded and
 * exception-wrapped, and everything degrades to nothing when SCF/ACF is absent.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const MEGC_LAYOUT_FIELD_PREFIX = 'layout_';
const MEGC_LAYOUT_SECTION_PREFIX = 'section_';

/* -------------------------------------------------------------------------
 * Pure helpers — no WordPress calls; unit-tested in tests/page-layout.test.php.
 * ---------------------------------------------------------------------- */

/** Whether a field is a route's Page layout list. */
function megc_layout_is_layout_field( array $field ): bool {
	return 'flexible_content' === ( $field['type'] ?? '' )
		&& 0 === strpos( (string) ( $field['name'] ?? '' ), MEGC_LAYOUT_FIELD_PREFIX );
}

/**
 * The rows the editor shows: the stored rows as they are, then one row for
 * every section layout not among them, in the field's layout order. Blocks
 * are never added — only the page's own sections. Rows that are not arrays,
 * or name no layout, are kept untouched (ACF decides what to do with them).
 */
function megc_layout_prefill( $rows, array $layouts ): array {
	$rows   = is_array( $rows ) ? array_values( $rows ) : array();
	$listed = array();
	foreach ( $rows as $row ) {
		if ( is_array( $row ) && isset( $row['acf_fc_layout'] ) ) {
			$listed[ (string) $row['acf_fc_layout'] ] = true;
		}
	}
	foreach ( $layouts as $layout ) {
		$name = is_array( $layout ) ? (string) ( $layout['name'] ?? '' ) : '';
		if ( '' === $name || 0 !== strpos( $name, MEGC_LAYOUT_SECTION_PREFIX ) || isset( $listed[ $name ] ) ) {
			continue;
		}
		$rows[]          = array( 'acf_fc_layout' => $name );
		$listed[ $name ] = true;
	}
	return $rows;
}

/* -------------------------------------------------------------------------
 * WordPress side.
 * ---------------------------------------------------------------------- */

/**
 * After ACF has turned the stored layout names into rows (its own filter
 * runs at 10), append the missing sections — in the editor only. A REST
 * read (the site build) and the front end get the stored value untouched.
 */
add_filter( 'acf/load_value/type=flexible_content', function ( $value, $post_id, $field ) {
	try {
		if ( ! is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || wp_doing_ajax() ) {
			return $value;
		}
		if ( ! is_array( $field ) || ! megc_layout_is_layout_field( $field ) ) {
			return $value;
		}
		return megc_layout_prefill( $value, is_array( $field['layouts'] ?? null ) ? $field['layouts'] : array() );
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: page-layout prefill suppressed — ' . $e->getMessage() );
		return $value;
	}
}, 20, 3 );
