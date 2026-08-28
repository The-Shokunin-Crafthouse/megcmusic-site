export type NavItem = {
  label: string;
  href: string;
  /** Route prefix that lights the tab when it differs from `href` — e.g. FYC
   *  links to the current campaign but owns every /fyc/<slug> page. */
  match?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Shows", href: "/shows" },
  { label: "Music", href: "/music" },
  { label: "FYC", href: "/fyc/shadows-of-a-ghost-town", match: "/fyc" },
  { label: "Media", href: "/media" },
  { label: "Poetry", href: "/poetry" },
  { label: "Booking", href: "/booking" },
  { label: "Shop", href: "/shop" },
];

// Home matches only exactly; every other route also matches its sub-paths so a
// future /shows/<slug> keeps the tab lit. `match` overrides the prefix when a
// tab links deeper than the route it owns (FYC → the current campaign page).
// Shared by the desktop nav and the mobile menu so the active rule never
// drifts.
export function isActiveRoute(
  pathname: string,
  { href, match }: Pick<NavItem, "href" | "match">,
): boolean {
  const base = match ?? href;
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}
