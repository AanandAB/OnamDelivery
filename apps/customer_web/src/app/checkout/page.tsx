"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import {
  getVendor,
  getSettings,
  validateCoupon,
  createOrder,
  formatRupees,
  upiIntent,
  type Product,
  type Vendor,
  type Settings,
  type Order,
} from "@/lib/api";
import { haversineKm, reverseGeocode } from "@/lib/geo";

// Leaflet touches `window` — load it client-only.
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded-2xl bg-cream-dark" />
  ),
});

const KANNUR = { lat: 11.8745, lng: 75.3704 };

interface AppliedCoupon {
  type: string;
  value: number;
  discount: number;
}

export default function CheckoutPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { items, vendorId, subtotal, clear } = useCart();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [rates, setRates] = useState<Settings | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!vendorId) return;
    getVendor(vendorId).then(setVendor).catch(() => {});
    getSettings().then(setRates).catch(() => {});
  }, [vendorId]);

  const pname = (p: Product) =>
    lang === "ml" && p.name_ml ? p.name_ml : p.name_en;

  // ---- Pricing (client estimate; the backend re-computes authoritatively) ----
  const baseFee = rates ? Number(rates.delivery_base_fee) : 40;
  const perKm = rates ? Number(rates.delivery_rate_per_km) : 15;
  const platformFee = rates ? Number(rates.platform_fee) : 20;

  const distance =
    location && vendor
      ? haversineKm(vendor.lat, vendor.lng, location.lat, location.lng)
      : null;
  const rawDeliveryFee =
    distance != null ? baseFee + perKm * distance : baseFee;
  const freeDelivery = coupon?.type === "free_delivery";
  const deliveryFee = freeDelivery ? 0 : Math.round(rawDeliveryFee);
  const discount = coupon?.discount ?? 0;
  const total = subtotal - discount + deliveryFee + platformFee;

  async function shareLocation() {
    setLocError("");
    if (!("geolocation" in navigator)) {
      setLocError(t.checkout.locationError);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        const addr = await reverseGeocode(latitude, longitude);
        if (addr) setAddress(addr);
        setLocating(false);
      },
      () => {
        setLocError(t.checkout.locationError);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function applyCoupon() {
    setCouponError("");
    if (!couponCode.trim()) return;
    try {
      const r = await validateCoupon(
        couponCode.trim(),
        user?.phone ?? "",
        subtotal,
      );
      setCoupon(r);
    } catch (e) {
      setCouponError((e as Error).message);
      setCoupon(null);
    }
  }

  async function placeOrder() {
    if (!location) return setError(t.checkout.locationRequired);
    if (!address.trim()) return setError(t.checkout.addressRequired);
    setBusy(true);
    setError("");
    try {
      const order = await createOrder({
        vendor_id: vendorId!,
        items: items.map((i) => ({ product_id: i.product.id, qty: i.qty })),
        drop_lat: location.lat,
        drop_lng: location.lng,
        drop_address: address.trim(),
        payment_method: "cod",
        coupon_code: coupon ? couponCode.trim().toUpperCase() : undefined,
      });
      clear();
      setPlaced(order);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ---- Guards ----
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="text-5xl">🔐</span>
        <h1 className="mt-4 font-display text-2xl font-bold">{t.checkout.signIn}</h1>
        <p className="mt-2 text-muted">{t.checkout.signInPrompt}</p>
        <Link
          href="/login?next=/checkout"
          className="mt-6 inline-block rounded-full bg-rose px-6 py-3 font-semibold text-white transition-colors hover:bg-rose-dark"
        >
          {t.nav.login}
        </Link>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="text-5xl">🎉</span>
        <h1 className="mt-4 font-display text-2xl font-bold">{t.checkout.success}</h1>
        <p className="mt-2 text-muted">{t.checkout.successSub}</p>
        <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
          <p className="text-sm text-muted">{t.nav.orders}</p>
          <p className="mt-1 text-xl font-bold text-ink">{placed.id}</p>
          <p className="mt-2 text-lg font-semibold text-leaf">
            {formatRupees(placed.total)}
          </p>
        </div>

        {rates?.upi_id && (
          <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
            <p className="text-sm font-semibold text-ink">{t.upi.payWithUpi}</p>
            <a
              href={upiIntent(rates.upi_id, "OnamDelivery", placed.total, `Order ${placed.id}`)}
              className="mt-3 block w-full rounded-full bg-leaf py-3 text-center font-bold text-white transition-opacity hover:opacity-90"
            >
              {t.upi.payWithUpi} · {formatRupees(placed.total)}
            </a>
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(rates.upi_id!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className="mt-2 w-full text-center text-sm text-muted hover:text-ink"
            >
              {copied ? t.upi.copied : t.upi.orCopy}: <b>{rates.upi_id}</b>
            </button>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link
            href="/orders"
            className="flex-1 rounded-full bg-rose px-6 py-3 font-semibold text-white transition-colors hover:bg-rose-dark"
          >
            {t.checkout.track}
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-full border border-rose px-6 py-3 font-semibold text-rose transition-colors hover:bg-rose hover:text-white"
          >
            {t.checkout.browse}
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="text-5xl">🛒</span>
        <p className="mt-4 text-muted">{t.checkout.empty}</p>
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">
        {t.checkout.title}
      </h1>

      {/* Items */}
      <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-muted">{t.checkout.summary}</h2>
        <div className="mt-3 space-y-2">
          {items.map(({ product, qty }) => (
            <div key={product.id} className="flex justify-between text-sm">
              <span className="text-ink">
                {qty} × {pname(product)}
              </span>
              <span className="text-muted">
                {formatRupees(product.price * qty)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">{t.checkout.locationTitle}</h2>
        <p className="mt-1 text-sm text-muted">{t.checkout.pinHint}</p>

        <button
          onClick={shareLocation}
          disabled={locating}
          className="mt-4 w-full rounded-full border-2 border-rose px-6 py-3 font-semibold text-rose transition-colors hover:bg-rose hover:text-white disabled:opacity-60"
        >
          {locating ? t.checkout.locating : t.checkout.shareLocation}
        </button>

        <div className="mt-4">
          <LocationPicker
            value={location}
            center={vendor ? { lat: vendor.lat, lng: vendor.lng } : KANNUR}
            onChange={(lat, lng) => setLocation({ lat, lng })}
          />
        </div>

        {location && distance != null && (
          <p className="mt-2 text-sm text-muted">
            📍 {distance.toFixed(1)} {t.checkout.distance}
          </p>
        )}
        {locError && <p className="mt-2 text-sm text-rose">{locError}</p>}

        <label className="mt-4 block text-sm font-semibold text-ink">
          {t.checkout.address}
        </label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t.checkout.addressPlaceholder}
          rows={2}
          className="mt-1 w-full rounded-xl border border-line bg-cream px-4 py-3 text-ink outline-none focus:border-rose"
        />
      </div>

      {/* Coupon */}
      <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
        <label className="block text-sm font-semibold text-ink">
          {t.checkout.coupon}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder={t.checkout.couponPlaceholder}
            className="flex-1 rounded-xl border border-line bg-cream px-4 py-3 text-ink outline-none focus:border-rose"
          />
          <button
            onClick={applyCoupon}
            className="rounded-xl bg-ink px-5 font-semibold text-white transition-colors hover:opacity-90"
          >
            {t.checkout.apply}
          </button>
        </div>
        {coupon && (
          <p className="mt-2 text-sm font-semibold text-leaf">
            ✓ {t.checkout.couponApplied}
          </p>
        )}
        {couponError && <p className="mt-2 text-sm text-rose">{couponError}</p>}
      </div>

      {/* Payment + totals */}
      <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">{t.checkout.payment}</h2>
        <p className="mt-1 text-sm text-muted">
          💵 {t.checkout.cod} — {t.checkout.codNote}
        </p>

        <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">{t.checkout.subtotal}</span>
            <span className="text-ink">{formatRupees(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t.checkout.deliveryFee}</span>
            <span className="text-ink">{formatRupees(deliveryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t.checkout.serviceFee}</span>
            <span className="text-ink">{formatRupees(platformFee)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <span className="text-leaf">{t.checkout.discount}</span>
              <span className="text-leaf">−{formatRupees(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
            <span className="text-ink">{t.checkout.total}</span>
            <span className="text-ink">{formatRupees(total)}</span>
          </div>
        </div>

        <button
          onClick={placeOrder}
          disabled={busy}
          className="mt-5 w-full rounded-full bg-rose py-3.5 text-base font-bold text-white transition-colors hover:bg-rose-dark disabled:opacity-60"
        >
          {busy ? t.checkout.placing : t.checkout.placeOrder}
        </button>

        {error && <p className="mt-3 text-center text-sm text-rose">{error}</p>}
      </div>
    </div>
  );
}
