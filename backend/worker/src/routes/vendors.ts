// Vendor routes — list (distance/radius filter), detail, create, update.

import type { Env } from "../env";
import { json, error, readBody, requireString, requireNumber } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { distanceKm } from "../lib/geo";
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
  created_at: number;
}

/** GET /api/vendors?lat=&lng=&delivers=1 */
export async function listVendors(
  req: Request,
  env: Env,
  url: URL,
  _params: string[],
): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT * FROM vendors ORDER BY name").all<VendorRow>();

  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  const onlyDeliver = url.searchParams.get("delivers") === "1";

  const vendors = results.map((v) => {
    let distance: number | null = null;
    if (lat && lng) {
      distance = Math.round(distanceKm(parseFloat(lat), parseFloat(lng), v.lat, v.lng) * 10) / 10;
    }
    const delivers = distance === null || distance <= v.radius_km;
    return { ...v, distance_km: distance, delivers };
  });

  return json(onlyDeliver ? vendors.filter((v) => v.delivers) : vendors);
}

/** GET /api/vendors/:id — vendor plus its visible products. */
export async function getVendor(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const vendorId = params[0];
  const vendor = await env.DB.prepare("SELECT * FROM vendors WHERE id = ?1")
    .bind(vendorId)
    .first<VendorRow>();
  if (!vendor) return error("Vendor not found", 404);

  const products = await env.DB.prepare(
    "SELECT * FROM products WHERE vendor_id = ?1 AND hidden = 0 ORDER BY name_en",
  )
    .bind(vendorId)
    .all();

  return json({ ...vendor, products: products.results });
}

/** POST /api/vendors (auth) — create a vendor (owner/admin). */
export async function createVendor(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireAuth(req, env);
  if (auth instanceof Response) return auth;

  const body = await readBody(req);
  const name = requireString(body, "name");
  if (name instanceof Response) return name;
  const lat = requireNumber(body, "lat");
  if (lat instanceof Response) return lat;
  const lng = requireNumber(body, "lng");
  if (lng instanceof Response) return lng;

  const vendorId = id();
  await env.DB.prepare(
    `INSERT INTO vendors (id, name, phone, lat, lng, radius_km, has_own_delivery)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(
      vendorId,
      name,
      (body.phone as string) ?? null,
      lat,
      lng,
      typeof body.radius_km === "number" ? body.radius_km : 10,
      typeof body.has_own_delivery === "number" ? body.has_own_delivery : 0,
    )
    .run();

  const vendor = await env.DB.prepare("SELECT * FROM vendors WHERE id = ?1")
    .bind(vendorId)
    .first<VendorRow>();
  return json(vendor, 201);
}

/** PATCH /api/vendors/:id (auth) — edit a vendor (delivery option, open state, ...). */
export async function updateVendor(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireAuth(req, env);
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
  if (fields.length === 0) return error("No updatable fields provided", 400);
  const sets = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => updates[f]);
  await env.DB.prepare(`UPDATE vendors SET ${sets} WHERE id = ?`).bind(...values, vendorId).run();

  const vendor = await env.DB.prepare("SELECT * FROM vendors WHERE id = ?1")
    .bind(vendorId)
    .first<VendorRow>();
  return json(vendor);
}
