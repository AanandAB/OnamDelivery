"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrders, createReview, formatRupees, type Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

const ACTIVE = ["placed", "accepted", "picked_up", "out_for_delivery"];

export default function OrdersPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  // review modal state
  const [reviewing, setReviewing] = useState<Order | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    getOrders()
      .then((o) => {
        if (mounted) setOrders(o);
      })
      .catch((e) => {
        if (mounted) setError((e as Error).message);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  async function submitReview() {
    if (!reviewing || stars === 0) return;
    setBusy(true);
    try {
      await createReview(reviewing.id, stars, comment.trim() || undefined);
      setReviewedIds((prev) => new Set(prev).add(reviewing.id));
      setReviewing(null);
      setStars(0);
      setComment("");
    } catch (e) {
      setError((e as Error).message);
      setReviewing(null);
    } finally {
      setBusy(false);
    }
  }

  const itemsOf = (o: Order): { name_en: string; qty: number }[] =>
    typeof o.items === "string" ? JSON.parse(o.items || "[]") : [];

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="text-5xl">📦</span>
        <p className="mt-4 text-muted">Sign in to see your orders.</p>
        <Link
          href="/login?next=/orders"
          className="mt-6 inline-block rounded-full bg-rose px-6 py-3 font-semibold text-white transition-colors hover:bg-rose-dark"
        >
          {t.nav.login}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">{t.nav.orders}</h1>

      {orders === null && !error && <p className="mt-6 text-muted">Loading…</p>}
      {error && <p className="mt-6 text-rose">{error}</p>}
      {orders && orders.length === 0 && (
        <p className="mt-6 text-muted">No orders yet.</p>
      )}

      {orders && orders.length > 0 && (
        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-2xl border border-line bg-card p-4 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">{o.id}</span>
                <span className="rounded-full bg-cream-dark px-2.5 py-1 text-xs font-semibold text-muted">
                  {t.track.status[o.status] ?? o.status}
                </span>
              </div>
              <div className="mt-2 text-sm text-muted">
                {itemsOf(o)
                  .map((i) => `${i.qty} × ${i.name_en}`)
                  .join(", ")}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-semibold text-ink">
                  {formatRupees(o.total)}
                </span>
                <div className="flex items-center gap-2">
                  {ACTIVE.includes(o.status) && (
                    <Link
                      href={`/track?order=${o.id}`}
                      className="rounded-full border border-rose px-3 py-1 text-xs font-semibold text-rose transition-colors hover:bg-rose hover:text-white"
                    >
                      {t.checkout.track}
                    </Link>
                  )}
                  {o.status === "delivered" && !reviewedIds.has(o.id) && (
                    <button
                      onClick={() => setReviewing(o)}
                      className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
                    >
                      ★ {t.review.rateThis}
                    </button>
                  )}
                  {reviewedIds.has(o.id) && (
                    <span className="text-xs text-leaf">✓ {t.review.thanks}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setReviewing(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-line bg-card p-6 shadow-soft-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-bold text-ink">
              {t.review.rateThis}
            </h2>
            <p className="mt-1 text-sm text-muted">{reviewing.id}</p>

            <div className="mt-4 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  className={`text-3xl transition-transform hover:scale-110 ${
                    n <= stars ? "text-gold" : "text-cream-dark"
                  }`}
                  aria-label={`${n} star`}
                >
                  ★
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="mt-1 text-center text-sm text-muted">
                {t.review.yourRating}: {stars}/5
              </p>
            )}

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t.review.commentPlaceholder}
              rows={3}
              className="mt-4 w-full rounded-xl border border-line bg-cream px-4 py-3 text-ink outline-none focus:border-rose"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setReviewing(null)}
                className="flex-1 rounded-full border border-line py-2.5 text-sm font-semibold text-muted hover:bg-cream"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={busy || stars === 0}
                className="flex-1 rounded-full bg-rose py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-dark disabled:opacity-60"
              >
                {t.review.submit}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
