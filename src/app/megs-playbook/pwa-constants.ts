/**
 * PWA install-metadata constants that can't read CSS custom properties
 * (viewport `themeColor`, the manifest file, the icon-generation script) —
 * kept in one `.ts` module, in lockstep with `--pb-bg`
 * (`_config/design-system/token-map.css`). Update all three together if
 * that token ever changes.
 */
export const PB_BG_HEX = "#241420";
