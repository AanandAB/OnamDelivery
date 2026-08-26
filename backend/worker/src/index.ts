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
import * as orderRoutes from "./routes/orders";
import * as settingsRoutes from "./routes/settings";
import * as meRoutes from "./routes/me";
import * as partnerRoutes from "./routes/partners";

type Handler = (req: Request, env: Env, url: URL, params: string[]) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  handler: Handler;
}

const routes: Route[] = [
  { method: "GET", pattern: /^\/api\/categories$/, handler: categoryRoutes.listCategories },
  { method: "GET", pattern: /^\/api\/settings$/, handler: settingsRoutes.getSettings },

  { method: "GET", pattern: /^\/api\/vendors$/, handler: vendorRoutes.listVendors },
  { method: "POST", pattern: /^\/api\/vendors$/, handler: vendorRoutes.createVendor },
  { method: "GET", pattern: /^\/api\/vendors\/([^/]+)$/, handler: vendorRoutes.getVendor },
  { method: "PATCH", pattern: /^\/api\/vendors\/([^/]+)$/, handler: vendorRoutes.updateVendor },
  { method: "GET", pattern: /^\/api\/vendors\/([^/]+)\/products$/, handler: productRoutes.listProducts },

  { method: "GET", pattern: /^\/api\/products$/, handler: productRoutes.listAllProducts },
  { method: "POST", pattern: /^\/api\/products$/, handler: productRoutes.createProduct },
  { method: "PATCH", pattern: /^\/api\/products\/([^/]+)$/, handler: productRoutes.updateProduct },

  { method: "POST", pattern: /^\/api\/auth\/otp$/, handler: authRoutes.requestOtp },
  { method: "POST", pattern: /^\/api\/auth\/verify$/, handler: authRoutes.verifyOtp },

  { method: "POST", pattern: /^\/api\/coupons$/, handler: couponRoutes.createCoupon },
  { method: "POST", pattern: /^\/api\/coupons\/validate$/, handler: couponRoutes.validateCoupon },

  { method: "POST", pattern: /^\/api\/orders$/, handler: orderRoutes.createOrder },
  { method: "GET", pattern: /^\/api\/orders$/, handler: orderRoutes.listOrders },
  { method: "GET", pattern: /^\/api\/orders\/([^/]+)$/, handler: orderRoutes.getOrder },
  { method: "GET", pattern: /^\/api\/orders\/([^/]+)\/track$/, handler: orderRoutes.trackOrder },

  { method: "DELETE", pattern: /^\/api\/me$/, handler: meRoutes.deleteMe },

  { method: "POST", pattern: /^\/api\/partner\/otp$/, handler: partnerRoutes.requestOtp },
  { method: "POST", pattern: /^\/api\/partner\/verify$/, handler: partnerRoutes.verifyOtp },
  { method: "GET", pattern: /^\/api\/partner\/me$/, handler: partnerRoutes.getMe },
  { method: "PATCH", pattern: /^\/api\/partner\/me$/, handler: partnerRoutes.updateMe },
  { method: "GET", pattern: /^\/api\/partner\/orders\/available$/, handler: partnerRoutes.listAvailable },
  { method: "GET", pattern: /^\/api\/partner\/orders$/, handler: partnerRoutes.listMine },
  { method: "POST", pattern: /^\/api\/partner\/orders\/([^/]+)\/accept$/, handler: partnerRoutes.acceptOrder },
  { method: "POST", pattern: /^\/api\/partner\/orders\/([^/]+)\/status$/, handler: partnerRoutes.updateStatus },
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
