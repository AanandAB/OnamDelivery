"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrders, formatRupees, type Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

const STATUS_LABEL: Record<string, string> = {
  placed: "Placed",
  accepted: "Accepted",
  picked_up: "Picked up",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrdersPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

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

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="text-5xl">📦</span>
        <p className="mt-4 text-muted">Sign in to see your orders.</p>
        <Link
          href="/login"
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

      {orders === null && !error && (
        <p className="mt-6 text-muted">Loading…</p>
      )}
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
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted">
                  {o.items && typeof o.items === "string"
                    ? (JSON.parse(o.items) as { name_en: string; qty: number }[])
                        .map((i) => `${i.qty} × ${i.name_en}`)
                        .join(", ")
                    : ""}
                </span>
                <span className="font-semibold text-ink">
                  {formatRupees(o.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
