"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { useLang } from "@/lib/i18n";
import { formatRupees, type Product } from "@/lib/api";

export default function CartPage() {
  const { t, lang } = useLang();
  const { items, setQty, remove, subtotal } = useCart();

  const pname = (p: Product) =>
    lang === "ml" && p.name_ml ? p.name_ml : p.name_en;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="text-5xl">🛒</span>
        <p className="mt-4 text-muted">Your cart is empty.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-rose px-6 py-3 font-semibold text-white transition-colors hover:bg-rose-dark"
        >
          {t.hero.cta}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">
        {t.nav.cart}
      </h1>

      <div className="mt-6 space-y-3">
        {items.map(({ product, qty }) => (
          <div
            key={product.id}
            className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4 shadow-soft"
          >
            <div className="flex-1">
              <p className="font-semibold text-ink">{pname(product)}</p>
              <p className="text-sm text-muted">
                {formatRupees(product.price)} / {product.unit}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty(product.id, qty - 1)}
                className="h-8 w-8 rounded-full border border-line text-ink hover:bg-cream"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button
                onClick={() => setQty(product.id, qty + 1)}
                className="h-8 w-8 rounded-full border border-line text-ink hover:bg-cream"
              >
                +
              </button>
            </div>
            <div className="w-20 text-right font-bold text-ink">
              {formatRupees(product.price * qty)}
            </div>
            <button
              onClick={() => remove(product.id)}
              className="text-muted hover:text-rose"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between text-lg">
          <span className="text-muted">Subtotal</span>
          <span className="font-bold text-ink">{formatRupees(subtotal)}</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Delivery fee is calculated at checkout based on your location.
        </p>
        <Link
          href="/checkout"
          className="mt-4 block w-full rounded-full bg-rose py-3 text-center font-semibold text-white transition-colors hover:bg-rose-dark"
        >
          Proceed to checkout
        </Link>
      </div>
    </div>
  );
}
