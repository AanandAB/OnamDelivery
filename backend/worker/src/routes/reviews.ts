// Review routes — customers rate a vendor after their order is delivered.
// Ratings roll up into the vendor's average rating + review count.

import type { Env } from "../env";
import { json, error, readBody, requireNumber } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { id } from "../lib/id";

/** POST /api/orders/:id/review (auth) — rate a delivered order's vendor. */
export async function createReview(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const auth = await requireAuth(req, env);
  if (auth instanceof Response) return auth;

  const orderId = params[0];
  const order = await env.DB.prepare(
    "SELECT * FROM orders WHERE id = ?1 AND user_id = ?2",
  )
    .bind(orderId, auth.userId)
    .first<Record<string, unknown>>();
  if (!order) return error("Order not found", 404);
  if (order.status !== "delivered") return error("You can only review delivered orders", 400);

  const existing = await env.DB.prepare("SELECT id FROM reviews WHERE order_id = ?1")
    .bind(orderId)
    .first();
  if (existing) return error("You already reviewed this order", 409);

  const body = await readBody(req);
  const rating = requireNumber(body, "rating");
  if (rating instanceof Response) return rating;
  if (rating < 1 || rating > 5) return error("Rating must be 1–5", 400);
  const comment = typeof body.comment === "string" ? body.comment.trim() : null;

  const vendorId = order.vendor_id as string;
  const reviewId = id();
  await env.DB.prepare(
    "INSERT INTO reviews (id, order_id, vendor_id, user_id, rating, comment) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
  )
    .bind(reviewId, orderId, vendorId, auth.userId, rating, comment)
    .run();

  // Roll the new rating into the vendor's average + count.
  const agg = await env.DB.prepare(
    "SELECT AVG(rating) AS avg, COUNT(*) AS cnt FROM reviews WHERE vendor_id = ?1",
  )
    .bind(vendorId)
    .first<{ avg: number | null; cnt: number }>();
  await env.DB.prepare("UPDATE vendors SET rating = ?1, rating_count = ?2 WHERE id = ?3")
    .bind(agg?.avg ?? 0, agg?.cnt ?? 0, vendorId)
    .run();

  const review = await env.DB.prepare("SELECT * FROM reviews WHERE id = ?1")
    .bind(reviewId)
    .first();
  return json(review, 201);
}

/** GET /api/vendors/:id/reviews — public reviews for a vendor (newest first). */
export async function listReviews(
  req: Request,
  env: Env,
  _url: URL,
  params: string[],
): Promise<Response> {
  const vendorId = params[0];
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name
     FROM reviews r LEFT JOIN users u ON u.id = r.user_id
     WHERE r.vendor_id = ?1 ORDER BY r.created_at DESC`,
  )
    .bind(vendorId)
    .all<Record<string, unknown>>();
  return json(
    results.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      user_name: r.user_name ?? "Customer",
    })),
  );
}
