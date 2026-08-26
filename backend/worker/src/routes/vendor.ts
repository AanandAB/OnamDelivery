// Vendor console routes — login, profile/settings, catalog management, order queue.
//
// The vendor console is deliberately simple: a vendor logs in with their shop
// phone, sees only THEIR products (including hidden), can edit price/stock and
// add items, toggle open/closed + self-delivery, and see incoming orders.

import type { Env } from "../env";
import { json, error, readBody, requireString, requireNumber } from "../lib/http";
import { issueOtp, checkOtp, signToken, secret, requireVendor } from "../lib/auth";
import { id } from "../lib/id";

interface VendorRow {
  id: string;
  name: string;
  phone: string | null;
  lat: number;
  lng: number;
  radius_km: number;
  rating: number;
  rating_count: number;
  is_open: number;
  has_own_delivery: number;
  license: string | null;
  banner: string | null;
}

function vendorJson(v: VendorRow) {
  return {
    id: v.id,
    name: v.name,
    phone: v.phone,
    lat: v.lat,
    lng: v.lng,
    radius_km: v.radius_km,
    rating: v.rating,
    rating_count: v.rating_count,
    is_open: v.is_open === 1,
    has_own_delivery: v.has_own_delivery === 1,
    license: v.license,
    banner: v.banner,
  };
}

/** POST /api/vendor/otp  { phone } — login code for a REGISTERED vendor phone. */
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

  const vendor = await env.DB.prepare("SELECT id FROM vendors WHERE phone = ?1")
    .bind(normalized)
    .first();
  if (!vendor) return error("No vendor registered with this phone", 404);

  const { code } = await issueOtp(env, normalized);
  return json({ ok: true, dev_otp: code, note: "dev mode — send this code via SMS in production" });
}

/** POST /api/vendor/verify  { phone, code, consent, consent_version? } */
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

  // DPDP Act 2023 — vendor consents to processing their shop details.
  if (body.consent !== true) {
    return error("Consent required — please accept the privacy policy (DPDP Act 2023)", 400);
  }
  const consentVersion = typeof body.consent_version === "string" ? body.consent_version : "1.0";

  const normalized = phone.replace(/\D/g, "");
  if (!(await checkOtp(env, normalized, code))) return error("Invalid or expired code", 401);

  const vendor = await env.DB.prepare("SELECT * FROM vendors WHERE phone = ?1")
    .bind(normalized)
    .first<VendorRow>();
  if (!vendor) return error("No vendor registered with this phone", 404);

  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("UPDATE vendors SET consented_at = ?1, consent_version = ?2 WHERE id = ?3")
    .bind(now, consentVersion, vendor.id)
    .run();

  const token = await signToken({ sub: vendor.id, phone: normalized, role: "vendor" }, secret(env));
  return json({ token, vendor: { id: vendor.id, name: vendor.name, phone: normalized } });
}

/** GET /api/vendor/me — my shop profile. */
export async function getMe(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireVendor(req, env);
  if (auth instanceof Response) return auth;
  const v = await env.DB.prepare("SELECT * FROM vendors WHERE id = ?1")
    .bind(auth.vendorId)
    .first<VendorRow>();
  if (!v) return error("Vendor not found", 404);
  return json(vendorJson(v));
}

/** PATCH /api/vendor/me — toggle open/closed, self-delivery, radius, name. */
export async function updateMe(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireVendor(req, env);
  if (auth instanceof Response) return auth;

  const body = await readBody(req);
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim() !== "") updates.name = body.name.trim();
  if (typeof body.radius_km === "number") updates.radius_km = body.radius_km;
  if (typeof body.is_open === "boolean") updates.is_open = body.is_open ? 1 : 0;
  if (typeof body.has_own_delivery === "boolean") updates.has_own_delivery = body.has_own_delivery ? 1 : 0;

  const fields = Object.keys(updates);
  if (fields.length > 0) {
    const sets = fields.map((f) => `${f} = ?`).join(", ");
    await env.DB.prepare(`UPDATE vendors SET ${sets} WHERE id = ?`)
      .bind(...fields.map((f) => updates[f]), auth.vendorId)
      .run();
  }

  const v = await env.DB.prepare("SELECT * FROM vendors WHERE id = ?1")
    .bind(auth.vendorId)
    .first<VendorRow>();
  return json(vendorJson(v!));
}

/** GET /api/vendor/products — ALL my products (including hidden). */
export async function listProducts(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireVendor(req, env);
  if (auth instanceof Response) return auth;
  const { results } = await env.DB.prepare(
    "SELECT * FROM products WHERE vendor_id = ?1 ORDER BY name_en",
  )
    .bind(auth.vendorId)
    .all();
  return json(results);
}

/** POST /api/vendor/products — add a product to my catalog. */
export async function createProduct(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireVendor(req, env);
  if (auth instanceof Response) return auth;

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
      auth.vendorId,
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

/** PATCH /api/vendor/products/:id — edit my product (price/stock/name/hidden). */
export async function updateProduct(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireVendor(req, env);
  if (auth instanceof Response) return auth;

  const productId = params[0];
  const existing = await env.DB.prepare(
    "SELECT id FROM products WHERE id = ?1 AND vendor_id = ?2",
  )
    .bind(productId, auth.vendorId)
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
  if (fields.length === 0) return error("No updatable fields provided", 400);
  const sets = fields.map((f) => `${f} = ?`).join(", ");
  await env.DB.prepare(`UPDATE products SET ${sets} WHERE id = ?`)
    .bind(...fields.map((f) => updates[f]), productId)
    .run();

  const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?1")
    .bind(productId)
    .first();
  return json(product);
}

/** GET /api/vendor/orders — my incoming orders (newest first). */
export async function listOrders(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireVendor(req, env);
  if (auth instanceof Response) return auth;
  const { results } = await env.DB.prepare(
    "SELECT * FROM orders WHERE vendor_id = ?1 ORDER BY created_at DESC",
  )
    .bind(auth.vendorId)
    .all<Record<string, unknown>>();
  return json(
    results.map((o) => ({
      id: o.id,
      status: o.status,
      items: JSON.parse((o.items as string) || "[]"),
      subtotal: o.subtotal,
      delivery_fee: o.delivery_fee,
      total: o.total,
      payment_method: o.payment_method,
      delivery_type: o.delivery_type,
      distance_km: o.distance_km,
      drop_address: o.drop_address,
      created_at: o.created_at,
    })),
  );
}
