// Order routes — create (with full economics), list, get.

import type { Env } from "../env";
import { json, error, readBody, requireString, requireNumber } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { orderNumber } from "../lib/id";
import { distanceKm } from "../lib/geo";
import { getRates, quote } from "../lib/pricing";

interface VendorRow {
  id: string;
  lat: number;
  lng: number;
  has_own_delivery: number;
}

interface ProductRow {
  id: string;
  vendor_id: string;
  name_en: string;
  unit: string;
  price: number;
  stock: number;
}

interface CouponRow {
  code: string;
  type: string;
  value: number;
  phone: string | null;
  used: number;
}

interface OrderItem {
  product_id: string;
  qty: number;
}

/** POST /api/orders (auth) — place an order and compute all money. */
export async function createOrder(
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
  const items = body.items as OrderItem[] | undefined;
  if (!Array.isArray(items) || items.length === 0) return error("items must be a non-empty array", 400);
  const dropLat = requireNumber(body, "drop_lat");
  if (dropLat instanceof Response) return dropLat;
  const dropLng = requireNumber(body, "drop_lng");
  if (dropLng instanceof Response) return dropLng;
  const dropAddress = requireString(body, "drop_address");
  if (dropAddress instanceof Response) return dropAddress;
  const paymentMethod = typeof body.payment_method === "string" ? body.payment_method : "cod";

  const vendor = await env.DB.prepare(
    "SELECT id, lat, lng, has_own_delivery FROM vendors WHERE id = ?1",
  )
    .bind(vendorId)
    .first<VendorRow>();
  if (!vendor) return error("Vendor not found", 404);

  // Load products, validate stock, build line items + subtotal.
  const placeholders = items.map(() => "?").join(",");
  const products = await env.DB.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
    .bind(...items.map((i) => i.product_id))
    .all<ProductRow>();
  const productMap = new Map(products.results.map((p) => [p.id, p]));

  let subtotal = 0;
  const lineItems: Record<string, unknown>[] = [];
  for (const it of items) {
    const p = productMap.get(it.product_id);
    if (!p) return error(`Product not found: ${it.product_id}`, 404);
    if (p.vendor_id !== vendorId) return error(`Product ${p.id} does not belong to this vendor`, 400);
    if (typeof it.qty !== "number" || it.qty <= 0) return error("qty must be a positive number", 400);
    if (it.qty > p.stock) return error(`Insufficient stock for "${p.name_en}" (${p.stock} left)`, 409);
    subtotal += p.price * it.qty;
    lineItems.push({ product_id: p.id, name_en: p.name_en, unit: p.unit, qty: it.qty, price: p.price });
  }

  // Distance + delivery/platform economics.
  const km = distanceKm(vendor.lat, vendor.lng, dropLat, dropLng);
  const rates = await getRates(env);
  const q = quote(km, rates);
  const deliveryType = vendor.has_own_delivery ? "vendor" : "platform";
  const deliveryPay = deliveryType === "platform" ? q.delivery_pay : 0;

  // Optional coupon (platform-funded: vendor keeps full subtotal).
  let discount = 0;
  let couponCode: string | null = null;
  let deliveryFee = q.delivery_fee;
  if (typeof body.coupon_code === "string" && body.coupon_code.trim() !== "") {
    const coupon = await env.DB.prepare("SELECT * FROM coupons WHERE code = ?1")
      .bind(body.coupon_code.trim().toUpperCase())
      .first<CouponRow>();
    if (!coupon) return error("Invalid coupon", 404);
    if (coupon.used) return error("Coupon already used", 409);
    if (coupon.phone && coupon.phone !== auth.phone) return error("Coupon not valid for this phone", 403);
    if (coupon.type === "percent") discount = Math.round((subtotal * coupon.value) / 100);
    else if (coupon.type === "flat") discount = Math.min(coupon.value, subtotal);
    else if (coupon.type === "free_delivery") deliveryFee = 0;
    couponCode = coupon.code;
  }

  const platformFee = rates.platform_fee;
  const total = subtotal - discount + deliveryFee + platformFee;
  const orderId = orderNumber();
  const otp = String(Math.floor(1000 + Math.random() * 9000));

  await env.DB.prepare(
    `INSERT INTO orders
      (id, user_id, vendor_id, status, items, subtotal, delivery_fee, delivery_pay,
       platform_fee, vendor_payout, total, payment_method, delivery_type, distance_km,
       pickup_lat, pickup_lng, drop_lat, drop_lng, drop_address, otp)
     VALUES (?, ?, ?, 'placed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      orderId,
      auth.userId,
      vendorId,
      JSON.stringify(lineItems),
      subtotal,
      deliveryFee,
      deliveryPay,
      platformFee,
      subtotal, // vendor keeps full item revenue; coupons are platform-funded
      total,
      paymentMethod,
      deliveryType,
      q.distance_km,
      vendor.lat,
      vendor.lng,
      dropLat,
      dropLng,
      dropAddress,
      otp,
    )
    .run();

  // Decrement stock and mark coupon used.
  for (const it of items) {
    await env.DB.prepare("UPDATE products SET stock = stock - ?1 WHERE id = ?2")
      .bind(it.qty, it.product_id)
      .run();
  }
  if (couponCode) {
    await env.DB.prepare("UPDATE coupons SET used = 1 WHERE code = ?1").bind(couponCode).run();
  }

  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?1").bind(orderId).first();
  return json(order, 201);
}

/** GET /api/orders (auth) — the current user's orders. */
export async function listOrders(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireAuth(req, env);
  if (auth instanceof Response) return auth;
  const { results } = await env.DB.prepare(
    "SELECT * FROM orders WHERE user_id = ?1 ORDER BY created_at DESC",
  )
    .bind(auth.userId)
    .all();
  return json(results);
}

/** GET /api/orders/:id (auth) — single order. */
export async function getOrder(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireAuth(req, env);
  if (auth instanceof Response) return auth;
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?1 AND user_id = ?2")
    .bind(params[0], auth.userId)
    .first();
  if (!order) return error("Order not found", 404);
  return json(order);
}
