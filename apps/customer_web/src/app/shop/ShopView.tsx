"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getVendor, getReviews, formatRupees, type Product, type Review } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useCart } from "@/lib/cart";

type VendorData = Awaited<ReturnType<typeof getVendor>>;

export function ShopView() {
  const { t, lang } = useLang();
  const { add } = useCart();
  const params = useSearchParams();
  const vendorId = params.get("vendor") ?? "";

  const [data, setData] = useState<VendorData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vendorId) return;
    let mounted = true;
    getVendor(vendorId)
      .then((v) => {
        if (mounted) setData(v);
      })
      .catch((e) => {
        if (mounted) setError((e as Error).message);
      });
    getReviews(vendorId)
      .then((r) => {
        if (mounted) setReviews(r);
      })
      .catch(() => {
        /* reviews are optional */
      });
    return () => {
      mounted = false;
    };
  }, [vendorId]);

  const pname = (p: Product) =>
    lang === "ml" && p.name_ml ? p.name_ml : p.name_en;

  if (!vendorId || error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-rose">{error || t.shop.noProducts}</p>
        <Link href="/" className="mt-4 inline-block text-rose underline">
          {t.shop.back}
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted">
        Loading…
      </div>
    );
  }

  const open = data.is_open === 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/" className="text-sm font-medium text-rose hover:underline">
        ← {t.shop.back}
      </Link>

      {/* Shop header */}
      <div className="mt-4 rounded-3xl border border-line bg-card p-6 shadow-soft">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              🏵️ {data.name}
            </h1>
            {data.rating > 0 && (
              <p className="mt-1 text-sm">
                <span className="text-gold">★ {data.rating.toFixed(1)}</span>{" "}
                <span className="text-muted">
                  ({data.rating_count} {t.vendors.rating})
                </span>
              </p>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              open ? "bg-leaf/15 text-leaf-dark" : "bg-cream-dark text-muted"
            }`}
          >
            {open ? t.vendors.open : t.vendors.closed}
          </span>
        </div>
      </div>

      {/* Products */}
      <h2 className="mt-8 text-xl font-bold text-ink">{t.shop.products}</h2>
      {data.products.length === 0 ? (
        <p className="mt-4 text-muted">{t.shop.noProducts}</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.products.map((p) => (
            <div
              key={p.id}
              className="flex flex-col rounded-2xl border border-line bg-card p-5 shadow-soft"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-ink">{pname(p)}</h3>
                  {p.occasion && (
                    <span className="rounded-full bg-cream-dark px-2 py-0.5 text-xs text-muted">
                      {p.occasion}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">/ {p.unit}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-bold text-ink">
                  {formatRupees(p.price)}
                </span>
                <button
                  onClick={() => add(p)}
                  disabled={p.stock <= 0}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    p.stock <= 0
                      ? "cursor-not-allowed bg-cream-dark text-muted"
                      : "bg-rose text-white hover:bg-rose-dark"
                  }`}
                >
                  {p.stock <= 0 ? t.shop.outOfStock : t.shop.addToCart}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reviews */}
      <h2 className="mt-10 text-xl font-bold text-ink">{t.shop.reviews}</h2>
      {reviews.length === 0 ? (
        <p className="mt-4 text-muted">{t.shop.reviewsEmpty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-line bg-card p-4 shadow-soft"
            >
              <p className="text-gold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
              {r.comment && <p className="mt-1 text-ink">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
