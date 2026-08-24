// Product routes — list, create (auth), update stock/price/hidden (auth).

import type { Env } from "../env";
import { json, error, readBody, requireString, requireNumber } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { id } from "../lib/id";

interface ProductRow {
  id: string;
  vendor_id: string;
  category_id: string | null;
  name_en: string;
  name_ml: string | null;
  unit: string;
  price: number;
  stock: number;
  image_url: string | null;
  occasion: string | null;
  hidden: number;
  created_at: number;
}

/** GET /api/vendors/:id/products */
export async function listProducts(
  _req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const vendorId = params[0];
  const { results } = await env.DB.prepare(
    "SELECT * FROM products WHERE vendor_id = ?1 AND hidden = 0 ORDER BY name_en",
  )
    .bind(vendorId)
    .all();
  return json(results);
}

/** GET /api/products?vendor_id=&category_id= */
export async function listAllProducts(
  req: Request,
  env: Env,
  url: URL,
  _params: string[],
): Promise<Response> {
  let sql = "SELECT * FROM products WHERE hidden = 0";
  const binds: unknown[] = [];
  const add = (value: string | null) => {
    if (!value) return;
    sql += ` AND category_id = ?${binds.length + 1}`;
    binds.push(value);
  };
  const categoryId = url.searchParams.get("category_id");
  const vendorId = url.searchParams.get("vendor_id");
  if (vendorId) {
    sql += ` AND vendor_id = ?${binds.length + 1}`;
    binds.push(vendorId);
  }
  add(categoryId);
  sql += " ORDER BY name_en";

  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json(results);
}

/** POST /api/products (auth) — create a product. */
export async function createProduct(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireAuth(req, env);
  if (auth instanceof Response) return auth;

  const body = await readBody(req);
  const vendorId = requireString(body, "vendor_id");
  if (vendorId instanceof Response) return vendorId;
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
    .first<ProductRow>();
  return json(product, 201);
}

/** PATCH /api/products/:id (auth) — partial update (stock, price, hidden, ...). */
export async function updateProduct(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireAuth(req, env);
  if (auth instanceof Response) return auth;

  const productId = params[0];
  const existing = await env.DB.prepare("SELECT id FROM products WHERE id = ?1")
    .bind(productId)
    .first();
  if (!existing) return error("Product not found", 404);

  const body = await readBody(req);

  // Build the SET clause from a fixed allowlist (safe against SQL injection).
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
  const values = fields.map((f) => updates[f]);
  await env.DB.prepare(`UPDATE products SET ${sets} WHERE id = ?`).bind(...values, productId).run();

  const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?1")
    .bind(productId)
    .first<ProductRow>();
  return json(product);
}
