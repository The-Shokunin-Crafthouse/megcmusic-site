/**
 * Cart state — Zustand with localStorage persistence (the studio cart default,
 * specified in the project brief). The cart is the single source of truth for
 * the shop's browse UX: instant add / qty / remove with no server round-trip.
 * Payment is a hand-off — at checkout these lines are replayed into the real
 * WooCommerce cart via the Store API, then the visitor is redirected to her
 * existing Woo/PayPal checkout (see the checkout hand-off ADR). So the cart
 * persists a self-contained line snapshot, not live product references.
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type CartLine, type ShopProduct } from "@/lib/shop";

interface CartState {
  lines: CartLine[];
  isOpen: boolean;
  /** True once the persisted cart has rehydrated — lets consumers avoid an
   *  SSR/client count mismatch by rendering cart-dependent UI only after it. */
  hydrated: boolean;

  add: (product: ShopProduct, quantity?: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  /** Adjust a line by a delta, computed from current state (not a render
   *  closure) so rapid +/- taps can't lose updates. Clamped to [1, MAX]. */
  changeQuantity: (id: number, delta: number) => void;
  remove: (id: number) => void;
  clear: () => void;

  open: () => void;
  close: () => void;
  toggle: () => void;
}

function lineFrom(product: ShopProduct, quantity: number): CartLine {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    priceMinor: product.priceMinor,
    currency: product.currency,
    image: product.images[0],
    quantity,
  };
}

const MAX_QTY = 99;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      hydrated: false,

      add: (product, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.id === product.id);
          const lines = existing
            ? state.lines.map((l) =>
                l.id === product.id
                  ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_QTY) }
                  : l,
              )
            : [...state.lines, lineFrom(product, Math.min(quantity, MAX_QTY))];
          // Opening on add gives the action a visible result (the drawer slides
          // in showing what was added) — the standard add-to-cart affordance.
          return { lines, isOpen: true };
        }),

      setQuantity: (id, quantity) =>
        set((state) => {
          const clamped = Math.max(1, Math.min(quantity, MAX_QTY));
          return {
            lines: state.lines.map((l) =>
              l.id === id ? { ...l, quantity: clamped } : l,
            ),
          };
        }),

      changeQuantity: (id, delta) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.id === id
              ? {
                  ...l,
                  quantity: Math.max(1, Math.min(l.quantity + delta, MAX_QTY)),
                }
              : l,
          ),
        })),

      remove: (id) =>
        set((state) => ({ lines: state.lines.filter((l) => l.id !== id) })),

      clear: () => set({ lines: [] }),

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "mcc-cart",
      version: 1,
      // Persist only the lines; open/hydrated are session UI state.
      partialize: (state) => ({ lines: state.lines }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
