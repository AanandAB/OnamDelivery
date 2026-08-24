/**
 * Onam Flowers API — Cloudflare Worker
 * "Swiggy for Flowers" backend: vendors, products, orders, delivery partners.
 *
 * Phase 0: health check only. Real routes land in Phase 1.
 */

export interface Env {
  // DB: D1Database;    // Phase 1 — onam-flowers-db
  // IMAGES: R2Bucket;  // Phase 1 — product images / KYC docs
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "onam-flowers-api",
        time: new Date().toISOString(),
      });
    }

    return Response.json({ error: "not_found" }, { status: 404 });
  },
};
