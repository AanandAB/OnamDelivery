// Partner routes — login, profile, live location, order discovery + fulfilment.
//
// Delivery partners are the fleet. They log in with phone OTP, go online,
// see unclaimed platform orders, accept one, pick up from the vendor, and
// deliver to the customer (verifying the handover OTP at the door). Every
// completed order earns them `delivery_pay` (₹30 base + ₹10/km), which the
// app surfaces live so partners always see exactly what they're earning.

import type { Env } from "../env";
import { json, error, readBody, requireString } from "../lib/http";
import { issueOtp, checkOtp, signToken, secret, requirePartner } from "../lib/auth";
import { id } from "../lib/id";
import { assignNearest, settleExpiredOffers } from "../lib/assign";

interface PartnerRow {
  id: string;
  phone: string;
  name: string | null;
  vehicle: string | null;
  kyc_status: string;
  is_online: number;
  current_lat: number | null;
  current_lng: number | null;
}

/** POST /api/partner/otp  { phone } — request a login code (dev returns it). */
export async function requestOtp(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const body = await readBody(req);
  const phone = requireString(body, "phone");
  if (phone instanceof Response) return phone;
  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 10) return error("Invalid phone number", 400);

  const { code, devMode } = await issueOtp(env, normalized);
  return devMode
    ? json({ ok: true, dev_otp: code, note: "dev mode" })
    : json({ ok: true, via: "whatsapp", note: "OTP sent via WhatsApp" });
}

/** POST /api/partner/verify  { phone, code, name?, vehicle?, consent, consent_version? } */
export async function verifyOtp(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const body = await readBody(req);
  const phone = requireString(body, "phone");
  if (phone instanceof Response) return phone;
  const code = requireString(body, "code");
  if (code instanceof Response) return code;

  // DPDP Act 2023 — partners must explicitly consent to processing of their
  // name, phone, vehicle and live location before we store any of it.
  if (body.consent !== true) {
    return error("Consent required — please accept the privacy policy (DPDP Act 2023)", 400);
  }
  const consentVersion = typeof body.consent_version === "string" ? body.consent_version : "1.0";

  const normalized = phone.replace(/\D/g, "");
  if (!(await checkOtp(env, normalized, code))) return error("Invalid or expired code", 401);

  const now = Math.floor(Date.now() / 1000);
  const name = typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : null;
  const vehicle = typeof body.vehicle === "string" && body.vehicle.trim() !== "" ? body.vehicle.trim() : null;

  let partner = await env.DB.prepare("SELECT * FROM partners WHERE phone = ?1")
    .bind(normalized)
    .first<PartnerRow>();

  if (!partner) {
    const partnerId = id();
    await env.DB.prepare(
      "INSERT INTO partners (id, phone, name, vehicle, consented_at, consent_version) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
      .bind(partnerId, normalized, name, vehicle, now, consentVersion)
      .run();
    partner = (await env.DB.prepare("SELECT * FROM partners WHERE phone = ?1")
      .bind(normalized)
      .first<PartnerRow>())!;
  } else {
    await env.DB.prepare(
      "UPDATE partners SET consented_at = ?1, consent_version = ?2, name = COALESCE(?3, name), vehicle = COALESCE(?4, vehicle) WHERE id = ?5",
    )
      .bind(now, consentVersion, name, vehicle, partner.id)
      .run();
  }

  const token = await signToken({ sub: partner.id, phone: normalized, role: "partner" }, secret(env));
  return json({
    token,
    partner: {
      id: partner.id,
      phone: normalized,
      name: name ?? partner.name,
      vehicle: vehicle ?? partner.vehicle,
    },
  });
}

function partnerJson(p: PartnerRow) {
  return {
    id: p.id,
    phone: p.phone,
    name: p.name,
    vehicle: p.vehicle,
    kyc_status: p.kyc_status,
    is_online: p.is_online === 1,
    current_lat: p.current_lat,
    current_lng: p.current_lng,
  };
}

/** GET /api/partner/me — profile + online status. */
export async function getMe(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requirePartner(req, env);
  if (auth instanceof Response) return auth;
  const p = await env.DB.prepare("SELECT * FROM partners WHERE id = ?1")
    .bind(auth.partnerId)
    .first<PartnerRow>();
  if (!p) return error("Partner not found", 404);
  return json(partnerJson(p));
}

/** PATCH /api/partner/me — { is_online?, current_lat?, current_lng?, name?, vehicle? } */
export async function updateMe(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requirePartner(req, env);
  if (auth instanceof Response) return auth;

  const body = await readBody(req);
  const sets: string[] = [];
  const vals: (string | number)[] = [];

  if (typeof body.is_online === "boolean") {
    sets.push("is_online = ?");
    vals.push(body.is_online ? 1 : 0);
  }
  if (typeof body.name === "string" && body.name.trim() !== "") {
    sets.push("name = ?");
    vals.push(body.name.trim());
  }
  if (typeof body.vehicle === "string" && body.vehicle.trim() !== "") {
    sets.push("vehicle = ?");
    vals.push(body.vehicle.trim());
  }

  const lat = typeof body.current_lat === "number" ? body.current_lat : null;
  const lng = typeof body.current_lng === "number" ? body.current_lng : null;
  if (lat !== null && lng !== null) {
    sets.push("current_lat = ?", "current_lng = ?");
    vals.push(lat, lng);
  }

  if (sets.length > 0) {
    await env.DB.prepare(`UPDATE partners SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...vals, auth.partnerId)
      .run();
  }

  // Persist a location breadcrumb so the customer/admin can live-track.
  if (lat !== null && lng !== null) {
    await env.DB.prepare("INSERT INTO partner_locations (partner_id, lat, lng) VALUES (?1, ?2, ?3)")
      .bind(auth.partnerId, lat, lng)
      .run();
  }

  const p = await env.DB.prepare("SELECT * FROM partners WHERE id = ?1")
    .bind(auth.partnerId)
    .first<PartnerRow>();
  return json(partnerJson(p!));
}

// Order payload for the partner app. Deliberately omits the handover `otp` —
// the customer tells the partner the OTP at the door; the partner app should
// never see it ahead of delivery.
function orderJson(row: Record<string, unknown>) {
  return {
    id: row.id,
    vendor_name: row.vendor_name,
    status: row.status,
    items: JSON.parse((row.items as string) || "[]"),
    subtotal: row.subtotal,
    delivery_pay: row.delivery_pay,
    payment_method: row.payment_method,
    distance_km: row.distance_km,
    pickup_lat: row.pickup_lat,
    pickup_lng: row.pickup_lng,
    drop_lat: row.drop_lat,
    drop_lng: row.drop_lng,
    drop_address: row.drop_address,
    created_at: row.created_at,
  };
}

const ORDER_SELECT = `
  SELECT o.*, v.name AS vendor_name
  FROM orders o JOIN vendors v ON v.id = o.vendor_id
`;

/** GET /api/partner/orders/available — my active offers + the open pool. */
export async function listAvailable(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requirePartner(req, env);
  if (auth instanceof Response) return auth;

  // First escalate any lapsed offers so the next-nearest partner gets them.
  await settleExpiredOffers(env);
  const now = Math.floor(Date.now() / 1000);

  // Offers directed at ME, still inside their acceptance window.
  const offers = await env.DB.prepare(
    `${ORDER_SELECT} WHERE o.status = 'placed' AND o.delivery_type = 'platform'
       AND o.partner_id IS NULL AND o.offered_partner_id = ?1 AND o.offer_expires_at > ?2
     ORDER BY o.created_at ASC`,
  )
    .bind(auth.partnerId, now)
    .all<Record<string, unknown>>();

  // The open pool — unassigned orders any partner can pull.
  const pool = await env.DB.prepare(
    `${ORDER_SELECT} WHERE o.status = 'placed' AND o.delivery_type = 'platform'
       AND o.partner_id IS NULL AND o.offered_partner_id IS NULL
     ORDER BY o.created_at ASC`,
  ).all<Record<string, unknown>>();

  return json({
    offers: offers.results.map((o) => ({
      ...orderJson(o),
      offer_expires_in: Math.max(0, ((o.offer_expires_at as number) ?? 0) - now),
    })),
    pool: pool.results.map(orderJson),
  });
}

/** GET /api/partner/orders — my assigned orders (any status). */
export async function listMine(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requirePartner(req, env);
  if (auth instanceof Response) return auth;
  const { results } = await env.DB.prepare(
    `${ORDER_SELECT} WHERE o.partner_id = ?1 ORDER BY o.updated_at DESC`,
  )
    .bind(auth.partnerId)
    .all<Record<string, unknown>>();
  return json(results.map(orderJson));
}

/** POST /api/partner/orders/:id/accept — atomically claim an order. */
export async function acceptOrder(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requirePartner(req, env);
  if (auth instanceof Response) return auth;
  const orderId = params[0];
  const now = Math.floor(Date.now() / 1000);

  // Atomic claim. Acceptable if (a) the order is in the open pool, or (b) it's
  // currently offered to THIS partner and the window hasn't expired. Any other
  // partner grabbing a reserved order gets 0 changes → 409.
  const res = await env.DB.prepare(
    `UPDATE orders SET partner_id = ?1, status = 'accepted',
       offered_partner_id = NULL, offer_expires_at = NULL, updated_at = ?2
     WHERE id = ?3 AND status = 'placed' AND delivery_type = 'platform' AND partner_id IS NULL
       AND (offered_partner_id IS NULL OR (offered_partner_id = ?4 AND offer_expires_at > ?2))`,
  )
    .bind(auth.partnerId, now, orderId, auth.partnerId)
    .run();
  if (res.meta.changes === 0) return error("Order unavailable or already claimed", 409);

  const row = await env.DB.prepare(`${ORDER_SELECT} WHERE o.id = ?1`)
    .bind(orderId)
    .first<Record<string, unknown>>();
  return json(orderJson(row!));
}

/** POST /api/partner/orders/:id/decline — pass on an offer; escalates to the next. */
export async function declineOrder(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requirePartner(req, env);
  if (auth instanceof Response) return auth;
  const orderId = params[0];

  const order = await env.DB.prepare(
    "SELECT id FROM orders WHERE id = ?1 AND partner_id IS NULL AND offered_partner_id = ?2",
  )
    .bind(orderId, auth.partnerId)
    .first();
  if (!order) return error("No active offer to decline", 409);

  // Roll the offer to the next-nearest online partner, excluding this one.
  await assignNearest(env, orderId, [auth.partnerId]);
  return json({ ok: true });
}

// Linear fulfilment flow. "delivered" additionally requires the handover OTP.
const NEXT_STATUS: Record<string, string[]> = {
  accepted: ["picked_up", "out_for_delivery"],
  picked_up: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
};

/** POST /api/partner/orders/:id/status — advance fulfilment; delivered needs OTP. */
export async function updateStatus(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requirePartner(req, env);
  if (auth instanceof Response) return auth;

  const body = await readBody(req);
  const status = requireString(body, "status");
  if (status instanceof Response) return status;
  const orderId = params[0];

  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?1 AND partner_id = ?2")
    .bind(orderId, auth.partnerId)
    .first<Record<string, unknown>>();
  if (!order) return error("Order not found", 404);

  const allowed = NEXT_STATUS[order.status as string] ?? [];
  if (!allowed.includes(status)) {
    return error(`Cannot move order from "${order.status}" to "${status}"`, 400);
  }
  if (status === "delivered") {
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";
    if (!otp || otp !== String(order.otp)) return error("Incorrect delivery code", 403);
  }

  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("UPDATE orders SET status = ?1, updated_at = ?2 WHERE id = ?3")
    .bind(status, now, orderId)
    .run();

  const row = await env.DB.prepare(`${ORDER_SELECT} WHERE o.id = ?1`)
    .bind(orderId)
    .first<Record<string, unknown>>();
  return json(orderJson(row!));
}
