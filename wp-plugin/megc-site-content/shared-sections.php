<?php
/**
 * Shared sections (1.6.0, ADR 2026-09-23).
 *
 * Some of Meg's fields show on more than one page of the live site: the
 * press-kit downloads on Home and the EPK page, her bio on Home and the EPK
 * page, the release list on Home, Music and the EPK page, and so on. Each is
 * still stored once, on the page that keeps it. This file puts an editor for
 * those fields on every other page that shows them and saves what she types
 * there back to the page that keeps them, so there is one copy and she can
 * edit it from any page it appears on.
 *
 * What is shared, and where, comes from shared-sections.json, generated from
 * the site's page-layout registry (`npm run layout:build`; CI fails when it
 * drifts). Nothing here names a page or a field.
 *
 * One copy edited from several pages can be overwritten from a page opened
 * before someone else's change. Every editor for a shared set carries a
 * token of the stored values it was opened with; a save whose token is out
 * of date keeps the newer stored version and says so on the editor. The
 * block editor does not reload meta boxes after a save, so a page's own
 * earlier saves are followed through a short history (megc_shared_is_current).
 *
 * Plugin rules (see megc-site-content.php): every hook body is guarded and
 * exception-wrapped, and everything degrades to nothing when SCF/ACF is absent.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -------------------------------------------------------------------------
 * Pure helpers — no WordPress calls; unit-tested in tests/shared-sections.test.php.
 * ---------------------------------------------------------------------- */

/** Parse shared-sections.json into its three lists; anything malformed is dropped. */
function megc_shared_parse_config( string $json ): array {
	$config = array( 'groups' => array(), 'boxes' => array(), 'links' => array() );
	$data   = json_decode( $json, true );
	if ( ! is_array( $data ) ) {
		return $config;
	}
	foreach ( $data['groups'] ?? array() as $g ) {
		if ( is_array( $g ) && is_string( $g['id'] ?? null ) && is_int( $g['source'] ?? null )
			&& is_array( $g['fields'] ?? null ) && is_array( $g['names'] ?? null ) && is_array( $g['shownOn'] ?? null ) ) {
			$config['groups'][ $g['id'] ] = $g;
		}
	}
	foreach ( $data['boxes'] ?? array() as $b ) {
		if ( is_array( $b ) && is_string( $b['id'] ?? null ) && is_int( $b['host'] ?? null )
			&& isset( $config['groups'][ $b['group'] ?? '' ] ) && is_array( $b['sections'] ?? null ) ) {
			$config['boxes'][] = $b;
		}
	}
	foreach ( $data['links'] ?? array() as $l ) {
		if ( is_array( $l ) && is_int( $l['host'] ?? null ) && is_string( $l['section'] ?? null ) && is_string( $l['what'] ?? null ) ) {
			$config['links'][] = $l;
		}
	}
	return $config;
}

/** "A", "A and B", "A, B and C". */
function megc_shared_join( array $names ): string {
	$names = array_values( array_filter( array_map( 'strval', $names ), 'strlen' ) );
	if ( count( $names ) < 2 ) {
		return $names[0] ?? '';
	}
	$last = array_pop( $names );
	return implode( ', ', $names ) . ' and ' . $last;
}

/** The pages other than $current that show a group, then the page that keeps it if it shows nowhere itself. */
function megc_shared_elsewhere( array $group, int $current ): array {
	$ids = array_map( 'intval', $group['shownOn'] );
	if ( ! in_array( (int) $group['source'], $ids, true ) ) {
		$ids[] = (int) $group['source'];
	}
	return array_values( array_diff( array_unique( $ids ), array( $current ) ) );
}

/** Only the values of the group's own fields: a posted key the editor was not given is never saved. */
function megc_shared_pick( $posted, array $group ): array {
	return is_array( $posted ) ? array_intersect_key( $posted, array_flip( $group['fields'] ) ) : array();
}

/** The stored meta of a group's fields — each field and, for a repeater, its rows. */
function megc_shared_meta_of( array $all_meta, array $group ): array {
	$out = array();
	foreach ( $all_meta as $key => $value ) {
		$key = (string) $key;
		foreach ( $group['names'] as $name ) {
			if ( $key === $name || 0 === strpos( $key, $name . '_' ) ) {
				$out[ $key ] = $value;
				break;
			}
		}
	}
	ksort( $out );
	return $out;
}

/** A token for a set of stored values: equal tokens, equal values. */
function megc_shared_token_of( array $meta ): string {
	return md5( (string) json_encode( $meta ) );
}

/**
 * Whether an editor opened on $client may save over the stored $now. It may
 * when nothing changed since it opened, or when every change since was made
 * by the same person from the same page — their own earlier saves, which the
 * block editor never reloads the editor for. Any other change in between
 * means the editor is out of date. $history is oldest first:
 * [ [ 'from' => token, 'to' => token, 'user' => id, 'host' => page ], … ].
 */
function megc_shared_is_current( string $client, string $now, array $history, int $user, int $host ): bool {
	if ( '' === $client || $client === $now ) {
		return '' !== $client;
	}
	$at = $client;
	foreach ( $history as $step ) {
		if ( ( $step['from'] ?? null ) !== $at ) {
			continue;
		}
		if ( (int) ( $step['user'] ?? 0 ) !== $user || (int) ( $step['host'] ?? 0 ) !== $host ) {
			return false;
		}
		$at = (string) ( $step['to'] ?? '' );
	}
	return $at === $now;
}

/* -------------------------------------------------------------------------
 * WordPress side.
 * ---------------------------------------------------------------------- */

const MEGC_SHARED_HISTORY_OPTION = 'megc_shared_history';
const MEGC_SHARED_HISTORY_LENGTH = 20;

function megc_shared_config(): array {
	static $config = null;
	if ( null === $config ) {
		$raw    = @file_get_contents( __DIR__ . '/shared-sections.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- bundled file
		$config = megc_shared_parse_config( is_string( $raw ) ? $raw : '' );
	}
	return $config;
}

/** SCF/ACF is active with every function this file calls. */
function megc_shared_ready(): bool {
	return function_exists( 'acf_get_field' ) && function_exists( 'acf_render_fields' )
		&& function_exists( 'acf_save_post' ) && function_exists( 'acf_get_value' );
}

function megc_shared_current_token( array $group ): string {
	$meta = get_post_meta( (int) $group['source'] );
	return megc_shared_token_of( megc_shared_meta_of( is_array( $meta ) ? $meta : array(), $group ) );
}

function megc_shared_history( string $group_id ): array {
	$all = get_option( MEGC_SHARED_HISTORY_OPTION, array() );
	return is_array( $all ) && is_array( $all[ $group_id ] ?? null ) ? $all[ $group_id ] : array();
}

function megc_shared_remember( string $group_id, string $from, string $to, int $host ): void {
	if ( $from === $to ) {
		return;
	}
	$all = get_option( MEGC_SHARED_HISTORY_OPTION, array() );
	$all = is_array( $all ) ? $all : array();
	$log = is_array( $all[ $group_id ] ?? null ) ? $all[ $group_id ] : array();
	$log[] = array( 'from' => $from, 'to' => $to, 'user' => get_current_user_id(), 'host' => $host, 'at' => time() );
	$all[ $group_id ] = array_slice( $log, -MEGC_SHARED_HISTORY_LENGTH );
	update_option( MEGC_SHARED_HISTORY_OPTION, $all, false );
}

function megc_shared_page_name( int $id ): string {
	$title = get_the_title( $id );
	return '' !== $title ? $title : sprintf( 'page %d', $id );
}

function megc_shared_names( array $ids ): string {
	return megc_shared_join( array_map( 'megc_shared_page_name', $ids ) );
}

/** The post being edited on this admin screen, or 0. */
function megc_shared_screen_post_id(): int {
	global $post;
	return $post instanceof WP_Post ? (int) $post->ID : 0;
}

function megc_shared_can_edit_source( array $group ): bool {
	$source = get_post( (int) $group['source'] );
	return $source instanceof WP_Post && current_user_can( 'edit_post', $source->ID );
}

/* ---- "Not saved" notes, for the person whose save was held back on that page.
 * The block editor never reloads its meta boxes, and the request it follows
 * after a save renders them unseen, so a note is not used up by being shown:
 * it stays until that person's next save of the section from that page goes
 * through (their editor is then current), or for an hour. The editor script
 * below also shows it as an editor notice straight after the save. */

function megc_shared_note_key( int $host, string $group_id ): string {
	return 'megc_shared_note_' . get_current_user_id() . '_' . $host . '_' . md5( $group_id );
}

function megc_shared_hold_back( int $host, string $group_id ): void {
	set_transient( megc_shared_note_key( $host, $group_id ), 1, HOUR_IN_SECONDS );
}

function megc_shared_clear_note( int $host, string $group_id ): void {
	delete_transient( megc_shared_note_key( $host, $group_id ) );
}

function megc_shared_has_note( int $host, string $group_id ): bool {
	return false !== get_transient( megc_shared_note_key( $host, $group_id ) );
}

/** The note shown on the editor after a reload, or ''. */
function megc_shared_note( int $host, string $group_id, string $what ): string {
	if ( ! megc_shared_has_note( $host, $group_id ) ) {
		return '';
	}
	return sprintf(
		'Your last save did not change %s: it had been changed on another page after you opened this one, so that newer version was kept. What you see now is the current version. If you had changed it here too, make that change again.',
		$what
	);
}

function megc_shared_note_html( string $note ): string {
	return '' === $note ? '' : '<div class="notice notice-warning inline" style="margin:0 0 12px"><p>' . esc_html( $note ) . '</p></div>';
}

/** Each shared set on this page — its editor box or its own fields — with what to call it: [ group id => words ]. */
function megc_shared_sets_on( int $host ): array {
	$config = megc_shared_config();
	$out    = array();
	foreach ( $config['boxes'] as $box ) {
		if ( (int) $box['host'] === $host ) {
			$out[ $box['group'] ] = 'the ' . megc_shared_join( $box['sections'] );
		}
	}
	foreach ( $config['groups'] as $group ) {
		if ( (int) $group['source'] === $host ) {
			$out[ $group['id'] ] = ( megc_shared_field_label( (string) $group['fields'][0] ) ?: 'a section' ) . ' (shared)';
		}
	}
	return $out;
}

function megc_shared_field_label( string $key ): string {
	$field = function_exists( 'acf_get_field' ) ? acf_get_field( $key ) : null;
	return is_array( $field ) ? (string) ( $field['label'] ?? '' ) : '';
}

/** Straight after a block-editor save: the sections that save held back, as editor notices. */
add_action( 'wp_ajax_megc_shared_notes', function () {
	try {
		check_ajax_referer( 'megc_shared_notes' );
		$host = isset( $_POST['post'] ) ? (int) $_POST['post'] : 0;
		if ( ! $host || ! current_user_can( 'edit_post', $host ) ) {
			wp_send_json_success( array() );
		}
		$messages = array();
		foreach ( megc_shared_sets_on( $host ) as $group_id => $what ) {
			if ( megc_shared_has_note( $host, $group_id ) ) {
				$messages[] = sprintf(
					'Not saved: %s. It was changed on another page after you opened this one, and that newer version was kept. Reload this page to see it, then make your change again.',
					$what
				);
			}
		}
		wp_send_json_success( $messages );
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: shared notes suppressed — ' . $e->getMessage() );
		wp_send_json_success( array() );
	}
} );

add_action( 'enqueue_block_editor_assets', function () {
	try {
		$post_id = megc_shared_screen_post_id();
		if ( ! $post_id || ! megc_shared_sets_on( $post_id ) ) {
			return;
		}
		$config = wp_json_encode( array( 'post' => $post_id, 'nonce' => wp_create_nonce( 'megc_shared_notes' ), 'url' => admin_url( 'admin-ajax.php' ) ) );
		$script = <<<'JS'
( function ( cfg ) {
	var data = window.wp && window.wp.data;
	if ( ! data ) { return; }
	var was = false;
	data.subscribe( function () {
		var editPost = data.select( 'core/edit-post' );
		var now = !! ( editPost && editPost.isSavingMetaBoxes && editPost.isSavingMetaBoxes() );
		if ( was && ! now ) {
			var body = new FormData();
			body.append( 'action', 'megc_shared_notes' );
			body.append( 'post', cfg.post );
			body.append( '_ajax_nonce', cfg.nonce );
			fetch( cfg.url, { method: 'POST', body: body, credentials: 'same-origin' } )
				.then( function ( r ) { return r.json(); } )
				.then( function ( res ) {
					( ( res && res.data ) || [] ).forEach( function ( message, i ) {
						data.dispatch( 'core/notices' ).createWarningNotice( message, { id: 'megc-shared-' + i, isDismissible: true } );
					} );
				} )
				.catch( function () {} );
		}
		was = now;
	} );
} )( CONFIG );
JS;
		wp_register_script( 'megc-shared-notes', false, array( 'wp-data', 'wp-notices', 'wp-edit-post' ), '1.6.0', true );
		wp_enqueue_script( 'megc-shared-notes' );
		wp_add_inline_script( 'megc-shared-notes', str_replace( 'CONFIG', (string) $config, $script ) );
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: shared notes script suppressed — ' . $e->getMessage() );
	}
} );

/* ---- The editor on every other page. */

add_action( 'add_meta_boxes_page', function ( $post ) {
	try {
		if ( ! megc_shared_ready() || ! $post instanceof WP_Post ) {
			return;
		}
		$config = megc_shared_config();
		foreach ( $config['boxes'] as $box ) {
			if ( (int) $box['host'] !== (int) $post->ID ) {
				continue;
			}
			$group = $config['groups'][ $box['group'] ];
			if ( ! megc_shared_can_edit_source( $group ) ) {
				continue; // The page that keeps it is missing on this install, or this person cannot edit it.
			}
			add_meta_box(
				'megc-shared-' . sanitize_key( $box['id'] ),
				sprintf( '%s — shared with %s', megc_shared_join( $box['sections'] ), megc_shared_names( megc_shared_elsewhere( $group, (int) $post->ID ) ) ),
				'megc_shared_render_box',
				'page',
				'normal',
				'high',
				array( 'box' => $box )
			);
		}

		$links = array_values( array_filter( $config['links'], fn( $l ) => (int) $l['host'] === (int) $post->ID && megc_shared_link_target( $l ) ) );
		if ( $links ) {
			add_meta_box( 'megc-shared-links', 'Sections edited somewhere else', 'megc_shared_render_links', 'page', 'normal', 'high', array( 'links' => $links ) );
		}
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: shared boxes suppressed — ' . $e->getMessage() );
	}
}, 20 );

function megc_shared_render_box( $post, $meta_box ): void {
	try {
		$box    = $meta_box['args']['box'];
		$group  = megc_shared_config()['groups'][ $box['group'] ];
		$source = (int) $group['source'];
		$host   = (int) $post->ID;

		$fields = array();
		foreach ( $group['fields'] as $key ) {
			$field = acf_get_field( $key );
			if ( ! is_array( $field ) ) {
				continue;
			}
			$field['prefix'] = 'megc_shared[' . $box['id'] . ']';
			$field['value']  = acf_get_value( $source, $field );
			$fields[]        = $field;
		}
		if ( ! $fields ) {
			echo '<p>' . esc_html( 'These fields are not available right now. Edit them on the ' . megc_shared_page_name( $source ) . ' page.' ) . '</p>';
			return;
		}

		echo '<div style="padding:12px 16px 0">';
		echo megc_shared_note_html( megc_shared_note( $host, $group['id'], 'the ' . megc_shared_join( $box['sections'] ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in megc_shared_note_html
		printf(
			'<p class="description" style="margin:0">%s</p></div>',
			esc_html(
				sprintf(
					'One copy, also shown on %s. Change it here or there: every page that shows it updates when you save.',
					megc_shared_names( megc_shared_elsewhere( $group, $host ) )
				)
			)
		);
		wp_nonce_field( 'megc_shared_' . $host . '_' . $box['id'], 'megc_shared_nonce[' . $box['id'] . ']', false );
		printf(
			'<input type="hidden" name="megc_shared_token[%s]" value="%s">',
			esc_attr( $box['id'] ),
			esc_attr( megc_shared_current_token( $group ) )
		);
		echo '<div class="acf-fields -top">';
		acf_render_fields( $fields, $source, 'div', 'label' );
		echo '</div>';
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: shared box render suppressed — ' . $e->getMessage() );
		echo '<p>This shared section could not be shown. Nothing on this page is affected.</p>';
	}
}

/** Where a link goes, or '' when there is nowhere to go on this install (page missing, plugin inactive, no rights). */
function megc_shared_link_target( array $link ): string {
	if ( isset( $link['page'] ) ) {
		return (string) get_edit_post_link( (int) $link['page'], 'raw' );
	}
	parse_str( (string) wp_parse_url( (string) ( $link['screen'] ?? '' ), PHP_URL_QUERY ), $query );
	$type = isset( $query['post_type'] ) ? get_post_type_object( (string) $query['post_type'] ) : null;
	if ( isset( $query['post_type'] ) && ( ! $type || ! current_user_can( $type->cap->edit_posts ) ) ) {
		return '';
	}
	return admin_url( (string) ( $link['screen'] ?? '' ) );
}

function megc_shared_render_links( $post, $meta_box ): void {
	try {
		echo '<ul style="margin:0">';
		foreach ( $meta_box['args']['links'] as $link ) {
			$url = megc_shared_link_target( $link );
			if ( isset( $link['page'] ) ) {
				$name = megc_shared_page_name( (int) $link['page'] );
				$text = sprintf( '%s are edited on the %s page.', ucfirst( $link['what'] ), $name );
				$cta  = 'Edit ' . $name;
			} else {
				$text = sprintf( '%s are edited on their own screen.', ucfirst( $link['what'] ) );
				$cta  = 'Open it';
			}
			printf(
				'<li style="margin:0 0 8px"><strong>%s</strong> — %s <a href="%s">%s</a></li>',
				esc_html( $link['section'] ),
				esc_html( $text ),
				esc_url( $url ),
				esc_html( $cta )
			);
		}
		echo '</ul>';
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: shared links render suppressed — ' . $e->getMessage() );
	}
}

/* ---- On the page that keeps a shared set: say where else it shows, and carry its token. */

/** The shared group whose first field is $field on the page being edited, or null. */
function megc_shared_group_led_by( array $field ): ?array {
	if ( 'acf' !== ( $field['prefix'] ?? 'acf' ) ) {
		return null; // Rendered inside a shared editor box, which says it itself.
	}
	$post_id = megc_shared_screen_post_id();
	foreach ( megc_shared_config()['groups'] as $group ) {
		if ( (int) $group['source'] === $post_id && ( $group['fields'][0] ?? '' ) === ( $field['key'] ?? '' ) ) {
			return $group;
		}
	}
	return null;
}

add_filter( 'acf/prepare_field', function ( $field ) {
	try {
		if ( ! is_array( $field ) || ! is_admin() ) {
			return $field;
		}
		$group = megc_shared_group_led_by( $field );
		if ( null === $group ) {
			return $field;
		}
		$host  = (int) $group['source'];
		$note  = megc_shared_note( $host, $group['id'], 'this shared section' );
		$lead  = sprintf(
			'Shared: this also shows on %s. It is one copy, so a change here or there shows on every page that uses it.',
			megc_shared_names( megc_shared_elsewhere( $group, $host ) )
		);
		$field['instructions'] = trim( ( '' !== $note ? $note . ' ' : '' ) . $lead . ' ' . (string) ( $field['instructions'] ?? '' ) );
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: shared banner suppressed — ' . $e->getMessage() );
	}
	return $field;
} );

add_action( 'acf/render_field', function ( $field ) {
	try {
		if ( ! is_array( $field ) || ! is_admin() ) {
			return;
		}
		$group = megc_shared_group_led_by( $field );
		if ( null !== $group ) {
			printf(
				'<input type="hidden" name="megc_shared_native[%s]" value="%s">',
				esc_attr( $group['id'] ),
				esc_attr( megc_shared_current_token( $group ) )
			);
		}
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: shared token suppressed — ' . $e->getMessage() );
	}
} );

/* ---- Saving. */

/** The page whose editor form was submitted, when this request is that form's save. */
function megc_shared_form_post_id( int $post_id, $post ): int {
	if ( ! $post instanceof WP_Post || 'page' !== $post->post_type ) {
		return 0;
	}
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) || ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) ) {
		return 0;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- identity check only; each write verifies its own nonce or ACF's.
	return isset( $_POST['post_ID'] ) && (int) $_POST['post_ID'] === $post_id ? $post_id : 0;
}

/** Tokens before ACF saves this page, for the shared sets it keeps: [ group id => token ]. */
$GLOBALS['megc_shared_before'] = array();

/**
 * Before ACF saves the page that keeps a shared set (priority 5; ACF is 10):
 * if the editor was opened before a change made from another page, take the
 * set out of what ACF saves, so the newer stored version stays.
 */
add_action( 'save_post', function ( $post_id, $post ) {
	try {
		$host = megc_shared_form_post_id( (int) $post_id, $post );
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- this only removes data from ACF's own nonce-checked save.
		if ( ! $host || ! megc_shared_ready() || ! isset( $_POST['acf'] ) || ! is_array( $_POST['acf'] ) ) {
			return;
		}
		foreach ( megc_shared_config()['groups'] as $group ) {
			if ( (int) $group['source'] !== $host ) {
				continue;
			}
			$now                                         = megc_shared_current_token( $group );
			$GLOBALS['megc_shared_before'][ $group['id'] ] = $now;
			// phpcs:ignore WordPress.Security.NonceVerification.Missing
			$client = isset( $_POST['megc_shared_native'][ $group['id'] ] ) ? sanitize_text_field( wp_unslash( $_POST['megc_shared_native'][ $group['id'] ] ) ) : null;
			if ( null === $client ) {
				continue; // Opened before 1.6.0, or the field is not on this form: nothing to compare.
			}
			if ( megc_shared_is_current( $client, $now, megc_shared_history( $group['id'] ), get_current_user_id(), $host ) ) {
				megc_shared_clear_note( $host, $group['id'] );
			} else {
				foreach ( $group['fields'] as $key ) {
					unset( $_POST['acf'][ $key ] );
				}
				megc_shared_hold_back( $host, $group['id'] );
			}
		}
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: shared pre-save suppressed — ' . $e->getMessage() );
	}
}, 5, 2 );

/**
 * After ACF has saved this page (priority 30): record what its save did to
 * the shared sets it keeps, then save each shared editor box on it back to
 * the page that keeps that set.
 */
add_action( 'save_post', function ( $post_id, $post ) {
	static $running = false;
	if ( $running ) {
		return;
	}
	try {
		$host = megc_shared_form_post_id( (int) $post_id, $post );
		if ( ! $host || ! megc_shared_ready() ) {
			return;
		}
		$running = true;
		$config  = megc_shared_config();

		foreach ( $GLOBALS['megc_shared_before'] as $group_id => $before ) {
			if ( isset( $config['groups'][ $group_id ] ) ) {
				megc_shared_remember( $group_id, $before, megc_shared_current_token( $config['groups'][ $group_id ] ), $host );
			}
		}
		$GLOBALS['megc_shared_before'] = array();

		foreach ( $config['boxes'] as $box ) {
			if ( (int) $box['host'] === $host ) {
				megc_shared_save_box( $host, $box, $config['groups'][ $box['group'] ] );
			}
		}
	} catch ( Throwable $e ) {
		error_log( 'megc-site-content: shared save suppressed — ' . $e->getMessage() );
	} finally {
		$running = false;
	}
}, 30, 2 );

function megc_shared_save_box( int $host, array $box, array $group ): void {
	$id = (string) $box['id'];
	// phpcs:disable WordPress.Security.NonceVerification.Missing -- verified just below.
	$posted = $_POST['megc_shared'][ $id ] ?? null;
	$nonce  = isset( $_POST['megc_shared_nonce'][ $id ] ) ? sanitize_text_field( wp_unslash( $_POST['megc_shared_nonce'][ $id ] ) ) : '';
	$client = isset( $_POST['megc_shared_token'][ $id ] ) ? sanitize_text_field( wp_unslash( $_POST['megc_shared_token'][ $id ] ) ) : '';
	// phpcs:enable WordPress.Security.NonceVerification.Missing
	if ( null === $posted || ! wp_verify_nonce( $nonce, 'megc_shared_' . $host . '_' . $id ) || ! megc_shared_can_edit_source( $group ) ) {
		return;
	}
	$values = megc_shared_pick( $posted, $group );
	if ( ! $values ) {
		return;
	}

	$before = megc_shared_current_token( $group );
	if ( ! megc_shared_is_current( $client, $before, megc_shared_history( $group['id'] ), get_current_user_id(), $host ) ) {
		megc_shared_hold_back( $host, $group['id'] );
		return;
	}

	$had_acf = array_key_exists( 'acf', $_POST );
	$acf     = $had_acf ? $_POST['acf'] : null; // phpcs:ignore WordPress.Security.NonceVerification.Missing
	try {
		acf_save_post( (int) $group['source'], $values );
	} finally {
		if ( $had_acf ) {
			$_POST['acf'] = $acf;
		} else {
			unset( $_POST['acf'] );
		}
		if ( function_exists( 'acf_set_form_data' ) ) {
			acf_set_form_data( 'post_id', $host );
		}
	}
	megc_shared_remember( $group['id'], $before, megc_shared_current_token( $group ), $host );
	megc_shared_clear_note( $host, $group['id'] );
}
