# OnamDelivery — "Swiggy for Flowers"

A flower-delivery marketplace for Kannur / Onam: connect flower vendors to
customers, with a delivery-partner fleet and a company-owner dashboard.

> **Repo:** `github.com/AanandAB/OnamDelivery` · **Live:** see URLs below

## Live

| Component | URL |
|-----------|-----|
| Customer storefront | https://onam-flowers-shop.pages.dev |
| Owner + vendor admin | https://onam-flowers-admin.pages.dev |
| Backend API | https://onam-flowers-api.aanandab44.workers.dev |
| Delivery partner app | Android APK (sideloaded — `apps/delivery_app`) |

## Surfaces

| Surface | Tech | Status |
|---------|------|--------|
| Customer website | Next.js 16 + Tailwind 4 (static export → Cloudflare Pages) | ✅ live |
| Delivery partner app | Flutter Android APK | ✅ built |
| Backend API | Cloudflare Worker (TypeScript) + D1 | ✅ live |
| Owner + vendor admin | Vanilla JS + Leaflet + Chart.js (Cloudflare Pages) | ✅ live |

## Architecture

```
Customers (web) ──────────────┐
Vendor/Owner (admin web) ─────┼──▶ Cloudflare Worker (API) ──▶ D1 (14 tables)
Delivery partners (APK) ──────┘        │
                                       ├─ OSM tiles (Leaflet / flutter_map)
                                       ├─ OSRM routing (partner app)
                                       ├─ WhatsApp Cloud API (OTP — prod)
                                       └─ Nominatim (reverse geocode)
```

One Worker serves every client over a method+regex router. The storefront and
admin are static and call the API from the browser (CORS enabled). Four JWT
roles — **user · partner · vendor · owner** — all phone-OTP login with DPDP Act
2023 consent.

## Layout

```
backend/worker/        Cloudflare Worker — REST API (routes/, lib/, migrations/0001…0009.sql)
backend/admin/         Cloudflare Pages — owner dashboard + vendor console (+ track-driver.html)
apps/customer_web/     Next.js 16 customer storefront (static export → out/)
apps/delivery_app/     Flutter delivery-partner Android APK
packages/shared/       shared Dart models (legacy — review if still needed)
docs/                  ARCHITECTURE(.html/.pdf), API.md, PLAN.md
FEATURES.md            full feature list
```

## Stack

- **Customer site** — Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Leaflet
- **Partner app** — Flutter 3.47 / Dart 3.13 · Riverpod · go_router · dio ·
  flutter_map + latlong2 + geolocator (OSM tiles + OSRM routing)
- **Backend** — Cloudflare Workers · TypeScript · D1 (SQLite) · Web-Crypto JWT
- **Admin** — vanilla JS · Leaflet · Chart.js (CDN)
- **Payments** — COD first; UPI intent (GPay/PhonePe) when a UPI ID is set
- **OTP** — dev mode (code returned) or WhatsApp Cloud API (free auth template)

## Delivery economics

Customer pays ₹40 + ₹15/km · partner earns ₹30 + ₹10/km (beats ₹5.80/km fuel) ·
platform keeps ₹20 flat on every order. All rates live in the `settings` table.

## How it assigns delivery boys

Platform orders are auto-offered to the **nearest online partner** for 60s;
decline/timeout escalates to the next-nearest, then the open pool. The owner can
force-assign / reassign / unassign any order from the admin. Vendors can opt for
self-delivery and onboard + live-track their own boys.

## Quick start

```bash
# Backend
cd backend/worker && npx wrangler deploy
npx wrangler d1 execute onam-flowers-db --remote --file=migrations/0009_assignment.sql  # new migrations

# Admin (static)
cd backend/admin && npx wrangler pages deploy . --project-name=onam-flowers-admin --commit-dirty=true

# Customer storefront (static export)
cd apps/customer_web && npm install && npm run build
npx wrangler pages deploy out --project-name=onam-flowers-shop --commit-dirty=true

# Delivery partner APK
cd apps/delivery_app && flutter build apk
```

## Test credentials (dev mode — OTP shown on screen)

| Role | Phone |
|------|-------|
| Owner | `7034026295` |
| Vendor | `9747123456` / `9747234567` / `9747345678` |
| Customer / partner | any 10-digit number |

## Docs

- **[FEATURES.md](FEATURES.md)** — full feature list
- **[docs/API.md](docs/API.md)** — API reference
- **[docs/PLAN.md](docs/PLAN.md)** — roadmap
- **docs/ARCHITECTURE.html / .pdf** — architecture + tech-stack doc
