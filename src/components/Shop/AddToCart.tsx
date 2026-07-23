"use client";

import { useEffect, useRef, useState } from "react";
import { Minus } from "@phosphor-icons/react/dist/ssr/Minus";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { Check } from "@phosphor-icons/react/dist/ssr/Check";
import { useCart } from "@/lib/cart-store";
import { type ShopProduct } from "@/lib/shop";
import styles from "./AddToCart.module.css";

const MAX_QTY = 99;

// Quantity stepper + add-to-cart button for a simple product. Adding opens the
// cart drawer (the visible result of the action) and flashes a brief "Added"
// confirmation on the button itself (state indication, per the motion skill).
export function AddToCart({ product }: { product: ShopProduct }) {
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const disabled = !product.inStock || !product.purchasable;

  function handleAdd() {
    if (disabled) return;
    add(product, qty);
    setAdded(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.qty}>
        <span id="qty-label" className={styles.qtyLabel}>
          Quantity
        </span>
        <div className={styles.stepper} role="group" aria-labelledby="qty-label">
          <button
            type="button"
            className={styles.step}
            onClick={() => setQty((n) => Math.max(1, n - 1))}
            disabled={disabled || qty <= 1}
            aria-label="Decrease quantity"
          >
            <Minus size={16} weight="bold" aria-hidden="true" />
          </button>
          <input
            className={styles.qtyInput}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QTY}
            value={qty}
            disabled={disabled}
            aria-label="Quantity"
            onChange={(e) => {
              const next = Number.parseInt(e.target.value, 10);
              setQty(Number.isNaN(next) ? 1 : Math.max(1, Math.min(next, MAX_QTY)));
            }}
          />
          <button
            type="button"
            className={styles.step}
            onClick={() => setQty((n) => Math.min(MAX_QTY, n + 1))}
            disabled={disabled || qty >= MAX_QTY}
            aria-label="Increase quantity"
          >
            <Plus size={16} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>

      <button
        type="button"
        className={styles.add}
        onClick={handleAdd}
        disabled={disabled}
        data-added={added || undefined}
      >
        {disabled ? (
          "Sold out"
        ) : added ? (
          <>
            <Check size={18} weight="bold" aria-hidden="true" />
            Added to cart
          </>
        ) : (
          "Add to cart"
        )}
      </button>
      {/* Announce the add for screen readers without moving focus. */}
      <span className={styles.srOnly} role="status" aria-live="polite">
        {added ? `${qty} × ${product.name} added to your cart` : ""}
      </span>
    </div>
  );
}
