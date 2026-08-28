// Owner (super-admin) routes — the company-owner dashboard backend.
//
// The owner is the platform operator. Unlike a vendor (scoped to one shop), the
// owner can: edit ANY vendor's catalog, add vendors/products, approve delivery
// partners, tune the delivery economics, and see revenue/settlement analytics.

import type { Env } from "../env";
import { json, error, readBody, requireString, requireNumber } from "../lib/http";
import { issueOtp, checkOtp, signToken, secret, requireOwner } from "../lib/auth";
import { id } from "../lib/id";
import { assignNearest, settleExpiredOffers } from "../lib/assign";

const DEFAULT_OWNER_PHONE = "9747000000";

async function ownerPhone(env: Env): Promise<string> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'owner_phone'")
    .first<{ value: string }>();
  return row?.value ?? DEFAULT_OWNER_PHONE;
}

// ---- Auth ----
/** POST /api/owner/otp — code only for the configured owner phone. */
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
  if (normalized !== (await ownerPhone(env))) return error("Not the owner phone", 403);
  const { code, devMode } = await issueOtp(env, normalized);
  return devMode
    ? json({ ok: true, dev_otp: code, note: "dev mode" })
    : json({ ok: true, via: "whatsapp", note: "OTP sent via WhatsApp" });
}

/** POST /api/owner/verify — owner login. */
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
  if (body.consent !== true) return error("Consent required (DPDP Act 2023)", 400);
  const normalized = phone.replace(/\D/g, "");
  if (normalized !== (await ownerPhone(env))) return error("Not the owner phone", 403);
  if (!(await checkOtp(env, normalized, code))) return error("Invalid or expired code", 401);
  const token = await signToken({ sub: "owner", phone: normalized, role: "owner" }, secret(env));
  return json({ token, owner: { phone: normalized } });
}

// ---- Overview / analytics ----
/** GET /api/owner/overview — headline stats + recent orders. */
export async function overview(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;

  const count = async (sql: string) =>
    ((await env.DB.prepare(sql).first<{ c: number }>())?.c ?? 0);
  const sum = async (sql: string) =>
    ((await env.DB.prepare(sql).first<{ s: number }>())?.s ?? 0);

  const [
    vendors,
    products,
    orders,
    partners,
    onlinePartners,
    revenue,
    platformProfit,
    partnerEarnings,
    vendorPayout,
  ] = await Promise.all([
    count("SELECT COUNT(*) c FROM vendors"),
    count("SELECT COUNT(*) c FROM products WHERE hidden = 0"),
    count("SELECT COUNT(*) c FROM orders"),
    count("SELECT COUNT(*) c FROM partners"),
    count("SELECT COUNT(*) c FROM partners WHERE is_online = 1"),
    sum("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status != 'cancelled'"),
    sum("SELECT COALESCE(SUM(platform_fee + delivery_fee - delivery_pay),0) s FROM orders WHERE status != 'cancelled'"),
    sum("SELECT COALESCE(SUM(delivery_pay),0) s FROM orders WHERE status = 'delivered'"),
    sum("SELECT COALESCE(SUM(vendor_payout),0) s FROM orders WHERE status != 'cancelled'"),
  ]);

  const recent = await env.DB.prepare(
    `SELECT o.*, v.name AS vendor_name
     FROM orders o JOIN vendors v ON v.id = o.vendor_id
     ORDER BY o.created_at DESC LIMIT 8`,
  ).all();

  return json({
    vendors,
    products,
    orders,
    partners,
    online_partners: onlinePartners,
    revenue,
    platform_profit: platformProfit,
    partner_earnings: partnerEarnings,
    vendor_payout: vendorPayout,
    recent_orders: recent.results,
  });
}

// ---- Vendors ----
/** GET /api/owner/vendors — all vendors with product counts. */
export async function listVendors(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;
  const { results } = await env.DB.prepare(
    `SELECT v.*, (SELECT COUNT(*) FROM products p WHERE p.vendor_id = v.id) AS product_count
     FROM vendors v ORDER BY v.name`,
  ).all();
  return json(results);
}

/** POST /api/owner/vendors — create a vendor. */
export async function createVendor(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;

  const body = await readBody(req);
  const name = requireString(body, "name");
  if (name instanceof Response) return name;
  const lat = requireNumber(body, "lat");
  if (lat instanceof Response) return lat;
  const lng = requireNumber(body, "lng");
  if (lng instanceof Response) return lng;

  const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : null;
  const vendorId = id();
  await env.DB.prepare(
    `INSERT INTO vendors (id, name, phone, lat, lng, radius_km, has_own_delivery)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(
      vendorId,
      name,
      phone,
      lat,
      lng,
      typeof body.radius_km === "number" ? body.radius_km : 10,
      typeof body.has_own_delivery === "number" ? body.has_own_delivery : 0,
    )
    .run();

  const vendor = await env.DB.prepare("SELECT * FROM vendors WHERE id = ?1")
    .bind(vendorId)
    .first();
  return json(vendor, 201);
}

/** PATCH /api/owner/vendors/:id — edit any vendor. */
export async function updateVendor(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;

  const vendorId = params[0];
  const existing = await env.DB.prepare("SELECT id FROM vendors WHERE id = ?1")
    .bind(vendorId)
    .first();
  if (!existing) return error("Vendor not found", 404);

  const body = await readBody(req);
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "phone", "license", "banner"]) {
    if (typeof body[f] === "string") updates[f] = body[f];
  }
  for (const f of ["lat", "lng", "radius_km", "rating", "rating_count", "is_open", "has_own_delivery"]) {
    if (typeof body[f] === "number") updates[f] = body[f];
  }

  const fields = Object.keys(updates);
  if (fields.length === 0) return error("No updatable fields", 400);
  const sets = fields.map((f) => `${f} = ?`).join(", ");
  await env.DB.prepare(`UPDATE vendors SET ${sets} WHERE id = ?`)
    .bind(...fields.map((f) => updates[f]), vendorId)
    .run();

  const vendor = await env.DB.prepare("SELECT * FROM vendors WHERE id = ?1")
    .bind(vendorId)
    .first();
  return json(vendor);
}

// ---- Products (owner can manage ANY vendor's catalog) ----
/** GET /api/owner/vendors/:id/products — a vendor's products (incl. hidden). */
export async function listProducts(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;
  const { results } = await env.DB.prepare(
    "SELECT * FROM products WHERE vendor_id = ?1 ORDER BY name_en",
  )
    .bind(params[0])
    .all();
  return json(results);
}

/** POST /api/owner/vendors/:id/products — add a product for a vendor. */
export async function createProduct(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;

  const vendorId = params[0];
  const body = await readBody(req);
  const nameEn = requireString(body, "name_en");
  if (nameEn instanceof Response) return nameEn;
  const unit = requireString(body, "unit");
  if (unit instanceof Response) return unit;
  const price = requireNumber(body, "price");
  if (price instanceof Response) return price;

  const productId = id();
  await env.DB.prepare(
    `INSERT INTO products
       (id, vendor_id, category_id, name_en, name_ml, unit, price, stock, image_url, occasion)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
  )
    .bind(
      productId,
      vendorId,
      (body.category_id as string) ?? null,
      nameEn,
      (body.name_ml as string) ?? null,
      unit,
      price,
      typeof body.stock === "number" ? body.stock : 0,
      (body.image_url as string) ?? null,
      (body.occasion as string) ?? null,
    )
    .run();

  const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?1")
    .bind(productId)
    .first();
  return json(product, 201);
}

/** PATCH /api/owner/products/:id — edit ANY product (stock/price/hidden). */
export async function updateProduct(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;

  const productId = params[0];
  const existing = await env.DB.prepare("SELECT id FROM products WHERE id = ?1")
    .bind(productId)
    .first();
  if (!existing) return error("Product not found", 404);

  const body = await readBody(req);
  const updates: Record<string, unknown> = {};
  for (const f of ["name_en", "name_ml", "unit", "image_url", "occasion", "category_id"]) {
    if (typeof body[f] === "string") updates[f] = body[f];
  }
  if (typeof body.price === "number") updates.price = body.price;
  if (typeof body.stock === "number") updates.stock = body.stock;
  if (typeof body.hidden === "number") updates.hidden = body.hidden;

  const fields = Object.keys(updates);
  if (fields.length === 0) return error("No updatable fields", 400);
  const sets = fields.map((f) => `${f} = ?`).join(", ");
  await env.DB.prepare(`UPDATE products SET ${sets} WHERE id = ?`)
    .bind(...fields.map((f) => updates[f]), productId)
    .run();

  const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?1")
    .bind(productId)
    .first();
  return json(product);
}

// ---- Orders ----
/** GET /api/owner/orders — all orders (newest first), with partner + assignment state. */
export async function listOrders(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;
  await settleExpiredOffers(env); // keep assignment state fresh for the admin
  const { results } = await env.DB.prepare(
    `SELECT o.*, v.name AS vendor_name, p.name AS partner_name, p.is_online AS partner_online
     FROM orders o
     JOIN vendors v ON v.id = o.vendor_id
     LEFT JOIN partners p ON p.id = o.partner_id
     ORDER BY o.created_at DESC LIMIT 100`,
  ).all();
  return json(results);
}

/** POST /api/owner/orders/:id/assign { partner_id } — force-assign (or reassign) a platform order. */
export async function assignOrder(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;
  const orderId = params[0];
  const body = await readBody(req);
  const partnerId = requireString(body, "partner_id");
  if (partnerId instanceof Response) return partnerId;

  const order = await env.DB.prepare("SELECT id, delivery_type FROM orders WHERE id = ?1")
    .bind(orderId)
    .first<{ id: string; delivery_type: string }>();
  if (!order) return error("Order not found", 404);
  if (order.delivery_type !== "platform") return error("Only platform orders can be assigned", 400);

  const partner = await env.DB.prepare("SELECT id FROM partners WHERE id = ?1")
    .bind(partnerId)
    .first();
  if (!partner) return error("Partner not found", 404);

  const now = Math.floor(Date.now() / 1000);
  const res = await env.DB.prepare(
    `UPDATE orders SET partner_id = ?1, offered_partner_id = NULL, offer_expires_at = NULL,
       status = CASE WHEN status = 'placed' THEN 'accepted' ELSE status END, updated_at = ?2
     WHERE id = ?3 AND status NOT IN ('delivered', 'cancelled')`,
  )
    .bind(partnerId, now, orderId)
    .run();
  if (res.meta.changes === 0) return error("Order already delivered or cancelled", 409);

  const row = await env.DB.prepare("SELECT * FROM orders WHERE id = ?1").bind(orderId).first();
  return json(row);
}

/** POST /api/owner/orders/:id/unassign — release a claimed order back to auto-assignment. */
export async function unassignOrder(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;
  const orderId = params[0];

  const res = await env.DB.prepare(
    `UPDATE orders SET partner_id = NULL, offered_partner_id = NULL, offer_expires_at = NULL,
       status = CASE WHEN status = 'accepted' THEN 'placed' ELSE status END, updated_at = ?1
     WHERE id = ?2 AND status NOT IN ('delivered', 'cancelled')`,
  )
    .bind(Math.floor(Date.now() / 1000), orderId)
    .run();
  if (res.meta.changes === 0) return error("Order not found or already delivered/cancelled", 409);

  await assignNearest(env, orderId);
  const row = await env.DB.prepare("SELECT * FROM orders WHERE id = ?1").bind(orderId).first();
  return json(row);
}

// ---- Partners ----
/** GET /api/owner/partners — all partners. */
export async function listPartners(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;
  const { results } = await env.DB.prepare("SELECT * FROM partners ORDER BY created_at DESC").all();
  return json(results);
}

/** PATCH /api/owner/partners/:id — approve a partner (kyc_status). */
export async function updatePartner(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;
  const body = await readBody(req);
  if (typeof body.kyc_status === "string") {
    await env.DB.prepare("UPDATE partners SET kyc_status = ?1 WHERE id = ?2")
      .bind(body.kyc_status, params[0])
      .run();
  }
  const partner = await env.DB.prepare("SELECT * FROM partners WHERE id = ?1")
    .bind(params[0])
    .first();
  if (!partner) return error("Partner not found", 404);
  return json(partner);
}

// ---- Settlements ----
/** GET /api/owner/settlements — per-vendor payout summary. */
export async function settlements(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;
  const { results } = await env.DB.prepare(
    `SELECT v.id, v.name, v.phone,
            COUNT(o.id) AS order_count,
            COALESCE(SUM(o.vendor_payout), 0) AS total_payout
     FROM vendors v
     LEFT JOIN orders o ON o.vendor_id = v.id AND o.status != 'cancelled'
     GROUP BY v.id ORDER BY total_payout DESC`,
  ).all();
  return json(results);
}

// ---- Settings (economics) ----
/** GET /api/owner/settings — all key/value settings. */
export async function getSettings(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all<{
    key: string;
    value: string;
  }>();
  const map: Record<string, string> = {};
  for (const r of results) map[r.key] = r.value;
  return json(map);
}

/** PATCH /api/owner/settings — update economics rates. */
export async function updateSettings(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;

  const body = await readBody(req);
  const allowed = [
    "platform_fee",
    "delivery_base_fee",
    "delivery_rate_per_km",
    "partner_base_pay",
    "partner_rate_per_km",
    "fuel_cost_per_km",
  ];
  for (const k of allowed) {
    if (typeof body[k] === "number" && body[k] >= 0) {
      await env.DB.prepare(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
        .bind(k, String(body[k]))
        .run();
        }
        }

        const { results } = await env.DB.prepare("SELECT key, value FROM settings").all<{
        key: string;
        value: string;
        }>();
        const map: Record<string, string> = {};
        for (const r of results) map[r.key] = r.value;
        return json(map);
        }

        /** GET /api/owner/analytics — chart/report data for the dashboard. */
        export async function analytics(
        req: Request,
        env: Env,
        _url: URL,
        _params: string[],
        ): Promise<Response> {
        const auth = await requireOwner(req, env);
        if (auth instanceof Response) return auth;

        // Order status distribution.
        const statusRows = await env.DB.prepare("SELECT status, COUNT(*) c FROM orders GROUP BY status")
        .all<{ status: string; c: number }>();
        const status_counts: Record<string, number> = {};
        for (const r of statusRows.results) status_counts[r.status] = r.c;

        // Top vendors by payout.
        const vendorRows = await env.DB.prepare(
        `SELECT v.name, COUNT(o.id) AS orders, COALESCE(SUM(o.vendor_payout),0) AS revenue
        FROM orders o JOIN vendors v ON v.id = o.vendor_id
        WHERE o.status != 'cancelled' GROUP BY o.vendor_id ORDER BY revenue DESC LIMIT 5`,
        ).all<{ name: string; orders: number; revenue: number }>();

        // Top products — aggregate the items JSON across non-cancelled orders.
        const itemRows = await env.DB.prepare("SELECT items FROM orders WHERE status != 'cancelled'")
        .all<{ items: string }>();
        const qty: Record<string, number> = {};
        for (const o of itemRows.results) {
        for (const it of JSON.parse(o.items || "[]") as { name_en: string; qty: number }[]) {
        qty[it.name_en] = (qty[it.name_en] || 0) + it.qty;
        }
        }
        const top_products = Object.entries(qty)
        .map(([name, n]) => ({ name, qty: n }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

        // Daily buckets for the last 14 days (IST).
        const IST = 5.5 * 3600 * 1000;
        const dayKey = (ms: number) => new Date(ms + IST).toISOString().slice(0, 10);
        const now = Date.now();
        const buckets = new Map<string, { orders: number; revenue: number; profit: number }>();
        for (let i = 13; i >= 0; i--) buckets.set(dayKey(now - i * 86400000), { orders: 0, revenue: 0, profit: 0 });

        const ordRows = await env.DB.prepare(
        "SELECT created_at, total, platform_fee, delivery_fee, delivery_pay FROM orders WHERE status != 'cancelled'",
        ).all<{ created_at: number; total: number; platform_fee: number; delivery_fee: number; delivery_pay: number }>();
        for (const o of ordRows.results) {
        const b = buckets.get(dayKey(o.created_at * 1000));
        if (b) {
        b.orders += 1;
        b.revenue += o.total;
        b.profit += o.platform_fee + o.delivery_fee - o.delivery_pay;
        }
        }
        const daily = [...buckets.entries()].map(([date, b]) => ({
        date,
        orders: b.orders,
        revenue: Math.round(b.revenue),
        profit: Math.round(b.profit),
        }));

        return json({ status_counts, top_vendors: vendorRows.results, top_products, daily });
        }

        /** GET /api/owner/drivers — all vendor self-delivery drivers (for the ops map). */
        export async function listDrivers(
        req: Request,
        env: Env,
        _url: URL,
        _params: string[],
        ): Promise<Response> {
        const auth = await requireOwner(req, env);
        if (auth instanceof Response) return auth;
        const { results } = await env.DB.prepare(
        `SELECT d.id, d.name, d.phone, d.current_lat, d.current_lng, d.last_seen, v.name AS vendor_name
        FROM vendor_drivers d JOIN vendors v ON v.id = d.vendor_id ORDER BY d.name`,
        ).all();
        return json(results);
        }
