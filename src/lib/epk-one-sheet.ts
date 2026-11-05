// Meg's Canva one-sheet, served from /public so it never depends on the WP host
// (which blocks datacenter reads). To update: replace both files, then fix
// sizeLabel — src/lib/epk-one-sheet.test.ts checks it against the real file.
export const ONE_SHEET = {
  pdf: "/press/meghan-clarisse-epk.pdf",
  preview: "/press/meghan-clarisse-epk-preview.jpg",
  sizeLabel: "1.1 MB",
} as const;
