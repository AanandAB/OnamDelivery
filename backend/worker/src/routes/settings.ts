// Settings route — expose customer-facing rates (used by the apps).

import type { Env } from "../env";
import { json } from "../lib/http";
import { getRates } from "../lib/pricing";

/** GET /api/settings — customer-facing delivery/platform rates. */
export async function getSettings(
  _req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const rates = await getRates(env);
  return json({
    platform_fee: rates.platform_fee,
    delivery_base_fee: rates.delivery_base_fee,
    delivery_rate_per_km: rates.delivery_rate_per_km,
  });
}
