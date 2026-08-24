// Category routes — product categories (bouquet, garland, pookalam kit, ...).

import type { Env } from "../env";
import { json } from "../lib/http";

/** GET /api/categories */
export async function listCategories(
  _req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM categories ORDER BY sort_order",
  ).all();
  return json(results);
}
