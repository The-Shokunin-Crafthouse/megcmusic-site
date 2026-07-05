"use client";

import { Handbag } from "@phosphor-icons/react/dist/ssr/Handbag";
import { useCart } from "@/lib/cart-store";
import { cartCount } from "@/lib/shop";
import styles from "./CartTrigger.module.css";

// Persistent floating cart button for the shop routes. Anchored bottom-right so
// it never collides with the top logo / nav / Menu chrome. The badge count is
// gated on the store's `hydrated` flag so it never mismatches the server render
// (the persisted cart only exists in the browser).
export function CartTrigger() {
  const open = useCart((s) => s.open);
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const count = hydrated ? cartCount(lines) : 0;

  return (
    <button
      id="cart-trigger"
      type="button"
      className={styles.trigger}
      onClick={open}
      aria-haspopup="dialog"
      aria-label={count > 0 ? `Open cart, ${count} item${count === 1 ? "" : "s"}` : "Open cart"}
    >
      <Handbag size={24} weight="regular" aria-hidden="true" />
      {count > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  );
}
