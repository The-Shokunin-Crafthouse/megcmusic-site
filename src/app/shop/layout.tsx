import { CartTrigger } from "@/components/Shop/CartTrigger";
import { CartDrawer } from "@/components/Shop/CartDrawer";

// Shop routes (/shop and /shop/[slug]) carry the persistent cart trigger + the
// cart drawer. The cart STATE persists site-wide (localStorage via the Zustand
// store); its trigger is scoped to the shop so the global chrome stays
// untouched — see the shop ADR.
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <CartTrigger />
      <CartDrawer />
    </>
  );
}
