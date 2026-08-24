// Onam Flowers API — Cloudflare Worker entry point + router.
//
// Routes are a simple method+regex table dispatching to handlers in ./routes.
// New endpoints are added here and implemented in the matching route module.

import type { Env } from "./env";
import { json, error, handleOptions } from "./lib/http";
import * as authRoutes from "./routes/auth";
import * as categoryRoutes from "./routes/categories";
import * as vendorRoutes from "./routes/vendors";
import * as productRoutes from "./routes/products";
import * as couponRoutes from "./routes/coupons";

type Handler = (req: Request, env: Env, url: URL, params: string[]) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  handler: Handler;
}

const routes: Route[] = [
  { method: "GET", pattern: /^\/api\/categories$/, handler: categoryRoutes.listCategories },

  { method: "GET", pattern: /^\/api\/vendors$/, handler: vendorRoutes.listVendors },
  { method: "GET", pattern: /^\/api\/vendors\/([^/]+)$/, handler: vendorRoutes.getVendor },
  { method: "GET", pattern: /^\/api\/vendors\/([^/]+)\/products$/, handler: productRoutes.listProducts },

  { method: "GET", pattern: /^\/api\/products$/, handler: productRoutes.listAllProducts },
  { method: "POST", pattern: /^\/api\/products$/, handler: productRoutes.createProduct },
  { method: "PATCH", pattern: /^\/api\/products\/([^/]+)$/, handler: productRoutes.updateProduct },

  { method: "POST", pattern: /^\/api\/auth\/otp$/, handler: authRoutes.requestOtp },
  { method: "POST", pattern: /^\/api\/auth\/verify$/, handler: authRoutes.verifyOtp },

  { method: "POST", pattern: /^\/api\/coupons$/, handler: couponRoutes.createCoupon },
  { method: "POST", pattern: /^\/api\/coupons\/validate$/, handler: couponRoutes.validateCoupon },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return handleOptions();
    if (url.pathname === "/health") {
      return json({ ok: true, service: "onam-flowers-api", time: new Date().toISOString() });
    }

    for (const route of routes) {
      if (route.method !== request.method) continue;
      const match = url.pathname.match(route.pattern);
      if (match) return route.handler(request, env, url, match.slice(1));
    }

    return error("Not found", 404);
  },
};
