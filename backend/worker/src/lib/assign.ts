// Nearest-partner auto-assignment + 60s offer escalation.
//
// When a platform order is placed we offer it to the NEAREST online partner
// for a short window (60s). If they decline, or the window lapses without an
// accept, the offer rolls to the next-nearest partner, and so on. If nobody is
// online the order stays in the open pool, where any partner can still pull it
// manually (the original first-come-first-serve model remains as a fallback).
//
// Escalation is "lazy": it happens the next time a partner polls their order
// feed (settleExpiredOffers). Partners poll every few seconds, so a lapsed
// offer is handed to the next partner within one poll cycle — no cron or
// Durable Objects needed.

import type { Env } from "../env";
import { distanceKm } from "./geo";

/** How long a partner has to accept an offer before it escalates. */
export const OFFER_WINDOW_SECONDS = 60;

interface PartnerRow {
  id: string;
  current_lat: number;
  current_lng: number;
}

interface Candidate {
  id: string;
  km: number;
}

/** The pickup point for an order (fall back to the vendor's own coordinates). */
async function orderPickup(env: Env, orderId: string): Promise<{ lat: number; lng: number }> {
  const row = await env.DB.prepare(
    `SELECT o.pickup_lat, o.pickup_lng, v.lat, v.lng
     FROM orders o JOIN vendors v ON v.id = o.vendor_id WHERE o.id = ?1`,
  )
    .bind(orderId)
    .first<{ pickup_lat: number | null; pickup_lng: number | null; lat: number; lng: number }>();
  return { lat: row?.pickup_lat ?? row?.lat ?? 0, lng: row?.pickup_lng ?? row?.lng ?? 0 };
}

/** Online partners with a live location, sorted nearest-first, excluding ids. */
async function nearestPartner(
  env: Env,
  lat: number,
  lng: number,
  excludeIds: string[],
): Promise<Candidate | null> {
  const { results } = await env.DB.prepare(
    `SELECT id, current_lat, current_lng FROM partners
     WHERE is_online = 1 AND current_lat IS NOT NULL AND current_lng IS NOT NULL`,
  ).all<PartnerRow>();
  const candidates = results
    .filter((p) => !excludeIds.includes(p.id))
    .map((p) => ({ id: p.id, km: distanceKm(lat, lng, p.current_lat, p.current_lng) }))
    .sort((a, b) => a.km - b.km);
  return candidates[0] ?? null;
}

/** Offer an unassigned platform order to the nearest online partner. */
export async function assignNearest(
  env: Env,
  orderId: string,
  excludeIds: string[] = [],
): Promise<void> {
  const order = await env.DB.prepare(
    "SELECT id, partner_id, delivery_type FROM orders WHERE id = ?1",
  )
    .bind(orderId)
    .first<{ id: string; partner_id: string | null; delivery_type: string }>();
  if (!order || order.partner_id || order.delivery_type !== "platform") return;

  const { lat, lng } = await orderPickup(env, orderId);
  const nearest = await nearestPartner(env, lat, lng, excludeIds);
  const now = Math.floor(Date.now() / 1000);

  if (!nearest) {
    // No candidate left — clear any stale offer and leave it in the open pool.
    await env.DB.prepare(
      "UPDATE orders SET offered_partner_id = NULL, offer_expires_at = NULL WHERE id = ?1",
    )
      .bind(orderId)
      .run();
    return;
  }

  await env.DB.prepare(
    "UPDATE orders SET offered_partner_id = ?1, offer_expires_at = ?2 WHERE id = ?3",
  )
    .bind(nearest.id, now + OFFER_WINDOW_SECONDS, orderId)
    .run();
}

/** Escalate every offer whose window has lapsed to the next-nearest partner. */
export async function settleExpiredOffers(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const { results } = await env.DB.prepare(
    `SELECT id, offered_partner_id FROM orders
     WHERE partner_id IS NULL AND offered_partner_id IS NOT NULL AND offer_expires_at <= ?1`,
  )
    .bind(now)
    .all<{ id: string; offered_partner_id: string }>();
  for (const r of results) {
    await assignNearest(env, r.id, [r.offered_partner_id]);
  }
}
