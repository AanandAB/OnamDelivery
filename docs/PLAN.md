# Onam Flowers — Full Plan

"Swiggy for Flowers" — a flower-delivery marketplace connecting vendors,
customers, and delivery partners, plus a company-owner dashboard.

## Surfaces (locked decisions)

1. **Customer app** — Flutter, Android APK + web. Browse vendors, order
   flowers, live-track delivery.
2. **Delivery partner app** — Flutter, Android APK only. Accept orders,
   navigate, deliver.
3. **Backend API** — Cloudflare Workers (TypeScript). D1 + R2 + KV.
4. **Admin console** — Cloudflare Pages (web). Owner (super-admin) + vendor
   consoles, role-gated.

## Stack

- Flutter 3.24 / Dart 3.5 — flutter_riverpod, go_router, dio
- Maps: flutter_map + OpenStreetMap tiles, OSRM routing (Leaflet-equivalent)
- Backend: Cloudflare Workers + D1 (SQLite) + R2 (images) + KV (realtime,
  Durable Objects later)
- Auth: phone OTP → JWT
- Payments: COD first, UPI (Razorpay) later
- Push: FCM / OneSignal

## D1 draft schema

- users(id, phone, name, addresses[])
- vendors(id, name, lat, lng, radius_km, rating, is_open, license, banner)
- products(id, vendor_id, name, category, unit, price, stock, images, occasion)
- orders(id, user_id, vendor_id, partner_id, status, items[], subtotal,
  delivery_fee, delivery_slot, pickup_lat, pickup_lng, drop_lat, drop_lng,
  otp, timestamps)
- partners(id, phone, name, vehicle, kyc_status, is_online, lat, lng)
- partner_locations(partner_id, lat, lng, ts)
- reviews(id, order_id, vendor_id, rating, comment)
- coupons(id, code, type, value, phone, used)
- settlements(vendor_id, order_id, amount, status)

## Phases

- **Phase 0** — Scaffold (DONE): folder tree, 2 Flutter apps, Worker health
  endpoint, admin placeholder, docs.
- **Phase 1** — Backend: D1 migrations, Workers API routes, R2 image upload.
- **Phase 2** — Customer app core: OTP → browse → cart → checkout (COD).
- **Phase 3** — Delivery partner app core: accept → navigate → deliver.
- **Phase 4** — Maps + live tracking: flutter_map + OSRM + breadcrumbs.
- **Phase 5** — Vendor console (Pages): catalog, stock, order queue.
- **Phase 6** — Owner dashboard (Pages): ops map, analytics, settlements,
  approvals.
- **Phase 7** — UPI payments, push notifications, reviews, polish.

## Flower-business differentiators

1. Delivery-slot scheduling (freshness)
2. "Order a day ahead" notice
3. Occasion-based browsing (Birthday/Wedding/Onam/Puja/...)
4. Unit-aware pricing (bunch/kg/piece) with dynamic totals
5. Live stock with cart clamping
6. Vendor radius zones (only show deliverable vendors)
7. Substitution toggle for out-of-stock flowers
8. Onam/seasonal specials
