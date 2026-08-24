// Coupon routes — create (auth) and validate.

import type { Env } from "../env";
import { json, error, readBody, requireString, requireNumber } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { id, shortCode } from "../lib/id";

interface CouponRow {
  id: string;
  code: string;
  type: string;
  value: number;
  phone: string | null;
  used: number;
  created_at: number;
}

const TYPES = ["percent", "flat", "free_delivery"];

/** POST /api/coupons (auth) — create a coupon (generates a code if omitted). */
export async function createCoupon(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireAuth(req, env);
  if (auth instanceof Response) return auth;

  const body = await readBody(req);
  const type = requireString(body, "type");
  if (type instanceof Response) return type;
  if (!TYPES.includes(type)) return error("type must be percent|flat|free_delivery", 400);

  const value = type === "free_delivery" ? 0 : requireNumber(body, "value");
  if (value instanceof Response) return value;

  const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") || null : null;
  const code =
    typeof body.code === "string" && body.code.trim() !== ""
      ? body.code.trim().toUpperCase()
      : shortCode("ONAM");

  const exists = await env.DB.prepare("SELECT id FROM coupons WHERE code = ?1").bind(code).first();
  if (exists) return error("Coupon code already exists", 409);

  await env.DB.prepare(
    "INSERT INTO coupons (id, code, type, value, phone) VALUES (?1, ?2, ?3, ?4, ?5)",
  )
    .bind(id(), code, type, value, phone)
    .run();

  const coupon = await env.DB.prepare("SELECT * FROM coupons WHERE code = ?1")
    .bind(code)
    .first<CouponRow>();
  return json(coupon, 201);
}

/** POST /api/coupons/validate { code, phone, subtotal } — public. */
export async function validateCoupon(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const body = await readBody(req);
  const code = requireString(body, "code");
  if (code instanceof Response) return code;
  const phone = requireString(body, "phone");
  if (phone instanceof Response) return phone;
  const subtotal = requireNumber(body, "subtotal");
  if (subtotal instanceof Response) return subtotal;

  const normalizedPhone = phone.replace(/\D/g, "");
  const coupon = await env.DB.prepare("SELECT * FROM coupons WHERE code = ?1")
    .bind(code.trim().toUpperCase())
    .first<CouponRow>();
  if (!coupon) return error("Invalid coupon", 404);
  if (coupon.used) return error("Coupon already used", 409);
  if (coupon.phone && coupon.phone !== normalizedPhone) {
    return error("Coupon is not valid for this phone number", 403);
  }

  let discount = 0;
  if (coupon.type === "percent") discount = Math.round((subtotal * coupon.value) / 100);
  else if (coupon.type === "flat") discount = Math.min(coupon.value, subtotal);
  // free_delivery: discount stays 0 — delivery fee is waived at checkout.

  return json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discount,
  });
}
