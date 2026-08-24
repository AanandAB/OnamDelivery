// Vendor routes — list (with optional distance/radius filter) and detail.

import type { Env } from "../env";
import { json, error } from "../lib/http";
import { distanceKm } from "../lib/geo";

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
