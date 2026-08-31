# OnamDelivery — Feature List

Everything the platform does today, organised by who uses it. Live URLs and
credentials are in the README.

---

## 🛍️ Customer (website — `onam-flowers-shop.pages.dev`)

Next.js 16 + Tailwind 4 static site, bilingual English / മലയാളം.

- **Phone OTP login** — dev OTP shown on screen (prod: WhatsApp); DPDP Act 2023
  consent required at every sign-in.
- **Language toggle** — English ⇄ Malayalam, header switch, persists for the visit.
- **Browse shops** — live vendor grid with open/closed badge and rating.
- **Shop page** — live products (name, unit, price, stock, occasion) and reviews.
- **Cart** — single-shop cart in localStorage, quantity +/−, live subtotal.
- **Checkout**
  - **"Share my location"** — browser geolocation + reverse-geocoded address, OR
    **drop a pin** on a Leaflet map (exact coordinate either way).
  - **Live delivery fee** — ₹40 + ₹15/km computed from shop → drop point, plus the
    ₹20 service fee.
  - **Coupon** — apply percent / flat / free-delivery codes (phone-bound, single-use).
  - **Cash on delivery**.
- **Order confirmation** — order ID + total; **UPI pay button** (GPay/PhonePe deep
  link) + copyable UPI ID when a UPI ID is configured.
- **Order history** — status badge per order.
- **Live tracking** — Leaflet map showing 🏪 pickup, 🏠 drop and the 🛵 partner's
  live position (5s polling), status label, partner name/vehicle.
- **Reviews** — rate a delivered order 1–5 stars + comment; rolls into shop rating.
- **Privacy policy** — EN + ML (DPDP Act 2023 · IT Act 2000).

## 🛵 Delivery partner (Flutter Android APK — `apps/delivery_app`)

- **Phone OTP login** + consent.
- **Go online/offline** — online streams live GPS breadcrumbs.
- **Nearest-boy auto-assignment** — incoming OFFERS with a 60-second accept window
  and an **Accept / Decline** pair; the open pool of unassigned orders as fallback.
- **Fulfilment ladder** — accepted → picked_up → out_for_delivery → delivered;
  "delivered" requires the customer's 4-digit handover OTP.
- **Live earnings** — per-trip pay and running total.
- **Live map** — OSM tiles + OSRM route from pickup to drop, own position.

## 🏪 Vendor (admin console — `onam-flowers-admin.pages.dev`)

- **Phone OTP login** (registered shop phone only).
- **Catalog** — inline price/stock edit, add products (EN + ML), hide/unhide.
- **Order queue** — incoming orders for the shop.
- **Self-delivery** — onboard delivery boys (name + phone → tracking link), live
  map of their positions, copy/remove.
- **Settings** — open/closed toggle, "use my own delivery boy", delivery radius.

## 👑 Owner (admin console — same URL, Owner tab)

- **Overview** — revenue, platform profit, vendor payout, partner earnings, counts.
- **Reports** — Chart.js: 14-day orders/revenue/profit line chart, order-status
  doughnut, top vendors by payout, top products by quantity.
- **Ops map** — vendors + online partners + self-delivery drivers (Leaflet).
- **Vendors** — add/edit shops, manage ANY vendor's catalog (edit any stock/price).
- **Orders** — full list + **assignment override** (assign / reassign / unassign a
  partner), live assignment state (unassigned / offering → X / assigned to Y).
- **Partners** — approve KYC status.
- **Settlements** — per-vendor payout owed.
- **Settings** — economics rates, UPI ID, owner phone.

## ⚙️ Backend (Cloudflare Worker — `onam-flowers-api.aanandab44.workers.dev`)

- **4-role JWT auth** — user / partner / vendor / owner, role-gated routes (HS256).
- **OTP provider layer** — `dev` (code returned) or `whatsapp` (WhatsApp Cloud API
  free auth template).
- **Nearest-partner assignment engine** — offer to nearest online partner (60s),
  escalate to next-nearest on decline/timeout, open-pool fallback, atomic claims
  (409 on double-accept).
- **Owner override** — force-assign / reassign / unassign any platform order.
- **Live tracking endpoint** — pickup/drop coords + partner live position.
- **Reviews** — one per delivered order, rolled into vendor rating.
- **Coupons** — percent / flat / free-delivery, phone-bound, single-use.
- **Settlements ledger** — per-order vendor payout.
- **Delivery economics** — all rates live in the `settings` table.
- **Compliance** — DPDP Act 2023 consent recorded per role; grievance officer.
- **CORS + health check**.

## 💰 Economics

| Item | Amount |
|------|--------|
| Customer delivery fee | ₹40 base + ₹15/km |
| Partner pay | ₹30 base + ₹10/km (vs ₹5.80/km fuel → ~₹4.2/km profit) |
| Platform profit | ₹20 flat on every order (incl. self-delivery) |

`total = subtotal − coupon_discount + delivery_fee + platform_fee`.
The backend recomputes the authoritative fee from the drop coordinates — clients
never set prices.

## 🔐 Data model (D1 — 14 tables)

users · addresses · vendors · categories · products · partners ·
partner_locations · orders · reviews · coupons · settlements · otp_codes ·
settings · vendor_drivers
