export type NavItem = { label: string; href: string };

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Shows", href: "/shows" },
  { label: "Media", href: "/media" },
  { label: "Booking", href: "/booking" },
  { label: "Shop", href: "/shop" },
];

// Home matches only exactly; every other route also matches its sub-paths so a
// future /shows/<slug> keeps the tab lit. Shared by the desktop nav and the
// mobile menu so the active rule never drifts.
export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
