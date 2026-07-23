"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Minus } from "@phosphor-icons/react/dist/ssr/Minus";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { X } from "@phosphor-icons/react/dist/ssr/X";
import { useCart } from "@/lib/cart-store";
import {
  cartCount,
  formatPrice,
  photonWidth,
  subtotalMinor,
  USD,
} from "@/lib/shop";
import {
  handoffToCheckout,
  CheckoutOriginError,
  LIVE_CHECKOUT_URL,
} from "@/lib/checkout";
import styles from "./CartDrawer.module.css";

type Checkout =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "origin" } // cross-origin: can't populate the real cart here
  | { phase: "error"; message: string };

// Slide-in cart sheet. Line-item qty edit + remove, subtotal, and the checkout
// hand-off. Driven by the shared cart store's `isOpen`. Escape / backdrop close,
// focus trapped while open, body scroll locked, focus restored to the trigger.
export function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen);
  const lines = useCart((s) => s.lines);
  const close = useCart((s) => s.close);
  const changeQuantity = useCart((s) => s.changeQuantity);
  const remove = useCart((s) => s.remove);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [checkout, setCheckout] = useState<Checkout>({ phase: "idle" });

  // Reset any transient checkout state each time the drawer opens.
  useEffect(() => {
    if (isOpen) setCheckout({ phase: "idle" });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeAndRestore();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled)',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function closeAndRestore() {
    close();
    // Restore focus to the persistent trigger (it stays mounted).
    requestAnimationFrame(() => document.getElementById("cart-trigger")?.focus());
  }

  async function onCheckout() {
    setCheckout({ phase: "working" });
    try {
      await handoffToCheckout(lines);
      // Navigation happens inside handoff; nothing else to do.
    } catch (err) {
      if (err instanceof CheckoutOriginError) {
        setCheckout({ phase: "origin" });
      } else {
        setCheckout({
          phase: "error",
          message:
            err instanceof Error ? err.message : "Checkout couldn't start.",
        });
      }
    }
  }

  if (!isOpen) return null;

  const currency = lines[0]?.currency ?? USD;
  const count = cartCount(lines);
  const subtotal = subtotalMinor(lines);
  const empty = lines.length === 0;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close cart"
        tabIndex={-1}
        onClick={closeAndRestore}
      />

      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <header className={styles.head}>
          <h2 className={styles.title}>
            Your cart
            {count > 0 && <span className={styles.count}> · {count}</span>}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close cart"
            onClick={closeAndRestore}
          >
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
        </header>

        {empty ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nothing here yet</p>
            <p className={styles.emptyText}>
              Records, books, and merch are waiting in the shop.
            </p>
            <Link
              className={styles.emptyLink}
              href="/shop"
              onClick={closeAndRestore}
            >
              Browse the shop
            </Link>
          </div>
        ) : (
          <>
            <ul className={styles.lines}>
              {lines.map((line) => (
                <li key={line.id} className={styles.line}>
                  <div className={styles.thumb}>
                    {line.image ? (
                      <img
                        src={line.image.thumbnail ?? photonWidth(line.image.src, 160)}
                        alt=""
                        width={64}
                        height={64}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className={styles.thumbFallback} aria-hidden="true">
                        ★
                      </span>
                    )}
                  </div>

                  <div className={styles.lineBody}>
                    <p className={styles.lineName}>
                      <Link
                        href={`/shop/${line.slug}`}
                        className={styles.lineLink}
                        onClick={closeAndRestore}
                      >
                        {line.name}
                      </Link>
                    </p>
                    <p className={styles.linePrice}>
                      {formatPrice(line.priceMinor, line.currency)}
                    </p>

                    <div className={styles.lineControls}>
                      <div
                        className={styles.stepper}
                        role="group"
                        aria-label={`Quantity for ${line.name}`}
                      >
                        <button
                          type="button"
                          className={styles.step}
                          onClick={() => changeQuantity(line.id, -1)}
                          disabled={line.quantity <= 1}
                          aria-label={`Decrease quantity of ${line.name}`}
                        >
                          <Minus size={14} weight="bold" aria-hidden="true" />
                        </button>
                        <span className={styles.qtyValue} aria-live="polite">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          className={styles.step}
                          onClick={() => changeQuantity(line.id, 1)}
                          aria-label={`Increase quantity of ${line.name}`}
                        >
                          <Plus size={14} weight="bold" aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => remove(line.id)}
                        aria-label={`Remove ${line.name} from cart`}
                      >
                        <Trash size={16} aria-hidden="true" />
                        <span className={styles.removeLabel}>Remove</span>
                      </button>
                    </div>
                  </div>

                  <p className={styles.lineTotal}>
                    {formatPrice(line.priceMinor * line.quantity, line.currency)}
                  </p>
                </li>
              ))}
            </ul>

            <footer className={styles.foot}>
              <div className={styles.subtotalRow}>
                <span className={styles.subtotalLabel}>Subtotal</span>
                <span className={styles.subtotalValue}>
                  {formatPrice(subtotal, currency)}
                </span>
              </div>
              <p className={styles.footNote}>
                Shipping and taxes are calculated at checkout.
              </p>

              {checkout.phase === "origin" ? (
                <div className={styles.notice} role="alert">
                  <p className={styles.noticeText}>
                    Checkout opens on Meghan&apos;s store, where PayPal is set up.
                  </p>
                  <a
                    className={styles.checkout}
                    href={LIVE_CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Continue on megcmusic.com
                  </a>
                </div>
              ) : (
                <>
                  {checkout.phase === "error" && (
                    <p className={styles.errorText} role="alert">
                      {checkout.message} Please try again.
                    </p>
                  )}
                  <button
                    type="button"
                    className={styles.checkout}
                    onClick={onCheckout}
                    disabled={checkout.phase === "working"}
                    data-busy={checkout.phase === "working" || undefined}
                  >
                    {checkout.phase === "working"
                      ? "Starting checkout…"
                      : "Checkout"}
                  </button>
                </>
              )}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
