# OnamDelivery — "Swiggy for Flowers"

A flower-delivery marketplace for Kannur / Onam: connect flower vendors to
customers, with a delivery-partner fleet and a company-owner dashboard.

Repo: github.com/AanandAB/OnamDelivery

## Surfaces

| Surface | Tech | Platform | Status |
|---------|------|----------|--------|
| Customer app | Flutter | Android APK + web | Phase 2 |
| Delivery partner app | Flutter | Android APK | Phase 3 |
| Backend API | Cloudflare Workers | — | Phase 1 |
| Owner + vendor admin | Cloudflare Pages | web | Phase 5–6 |

## Layout

```
apps/customer_app/    Flutter — customers browse & order flowers
apps/delivery_app/    Flutter — partners accept & deliver orders
backend/worker/       Cloudflare Worker — REST API (D1 + R2 + KV)
backend/admin/        Cloudflare Pages — owner dashboard + vendor console
backend/migrations/   D1 SQL migrations
packages/shared/      shared Dart models + API client (future)
docs/                 plan + architecture
```

## Stack

- Flutter 3.24 (flutter_riverpod, go_router, dio)
- Maps: flutter_map + OpenStreetMap tiles, OSRM routing
- Backend: Cloudflare Workers + D1 (SQLite) + R2 (images) + KV (realtime)
- Auth: phone OTP (JWT)
- Payments: COD first, UPI (Razorpay) later
- Push: FCM / OneSignal

## Decisions (locked)

- Owner dashboard = web (Pages). Customer = Android + web. Partner = Android only.
- COD first, UPI later.
- flutter_map + OSM tiles + OSRM routing.

See `docs/PLAN.md` for the full plan and phases.
