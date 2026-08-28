"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trackOrder, type TrackInfo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

const TrackingMap = dynamic(() => import("@/components/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full animate-pulse rounded-2xl bg-cream-dark" />
  ),
});

export function TrackView() {
  const { t } = useLang();
  const { user } = useAuth();
  const params = useSearchParams();
  const orderId = params.get("order") ?? "";

  const [info, setInfo] = useState<TrackInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId || !user) return;
    let stopped = false;
    const load = async () => {
      try {
        const d = await trackOrder(orderId);
        if (!stopped) setInfo(d);
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [orderId, user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-muted">Sign in to track your order.</p>
        <Link
          href="/login?next=/track?order="
          className="mt-6 inline-block rounded-full bg-rose px-6 py-3 font-semibold text-white"
        >
          {t.nav.login}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-rose">{error}</p>
        <Link href="/orders" className="mt-4 inline-block text-rose underline">
          {t.shop.back}
        </Link>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted">
        Loading…
      </div>
    );
  }

  const partner =
    info.partner && info.partner.current_lat != null && info.partner.current_lng != null
      ? { lat: info.partner.current_lat, lng: info.partner.current_lng }
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/orders" className="text-sm font-medium text-rose hover:underline">
        ← {t.shop.back}
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">
          {t.track.title}
        </h1>
        <span className="text-sm text-muted">{orderId}</span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="rounded-full bg-cream-dark px-3 py-1 text-sm font-semibold text-ink">
          {t.track.status[info.status] ?? info.status}
        </span>
        {info.status === "delivered" && <span className="text-leaf">✅</span>}
      </div>

      <div className="mt-4">
        <TrackingMap
          pickup={{ lat: info.pickup_lat, lng: info.pickup_lng }}
          drop={{ lat: info.drop_lat, lng: info.drop_lng }}
          partner={partner}
        />
      </div>
      <p className="mt-2 text-xs text-muted">{t.track.refreshHint}</p>

      <div className="mt-4 rounded-2xl border border-line bg-card p-4 shadow-soft">
        {partner ? (
          <p className="text-sm text-ink">
            🛵 {info.partner?.name || t.track.partner}
            {info.partner?.vehicle ? ` · ${info.partner.vehicle}` : ""}
          </p>
        ) : (
          <p className="text-sm text-muted">{t.track.waiting}</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-4 shadow-soft">
        <p className="text-sm text-ink">
          🏪 {t.track.pickup}: <b>{info.vendor_name}</b>
        </p>
        <p className="mt-2 text-sm text-ink">
          🏠 {t.track.drop}: {info.drop_address}
        </p>
      </div>
    </div>
  );
}
