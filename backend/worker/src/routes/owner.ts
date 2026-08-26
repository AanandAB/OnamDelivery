// Owner (super-admin) routes — the company-owner dashboard backend.
//
// The owner is the platform operator. Unlike a vendor (scoped to one shop), the
// owner can: edit ANY vendor's catalog, add vendors/products, approve delivery
// partners, tune the delivery economics, and see revenue/settlement analytics.

import type { Env } from "../env";
import { json, error, readBody, requireString, requireNumber } from "../lib/http";
import { issueOtp, checkOtp, signToken, secret, requireOwner } from "../lib/auth";
import { id } from "../lib/id";

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
  const { code } = await issueOtp(env, normalized);
  return json({ ok: true, dev_otp: code, note: "dev mode — send via SMS in production" });
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
/** GET /api/owner/orders — all orders (newest first). */
export async function listOrders(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireOwner(req, env);
  if (auth instanceof Response) return auth;
  const { results } = await env.DB.prepare(
    `SELECT o.*, v.name AS vendor_name
     FROM orders o JOIN vendors v ON v.id = o.vendor_id
     ORDER BY o.created_at DESC LIMIT 100`,
  ).all();
  return json(results);
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
