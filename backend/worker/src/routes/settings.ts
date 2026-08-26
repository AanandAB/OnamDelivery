// Settings route — customer-facing rates + grievance officer (DPDP s.8).

import type { Env } from "../env";
import { json } from "../lib/http";
import { getRates } from "../lib/pricing";

/** GET /api/settings — delivery/platform rates + grievance officer. */
export async function getSettings(
  _req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const rates = await getRates(env);
  const { results } = await env.DB.prepare(
    "SELECT key, value FROM settings WHERE key LIKE 'grievance_%'",
  ).all<{ key: string; value: string }>();
  const grievance: Record<string, string> = {};
  for (const r of results) grievance[r.key.replace("grievance_", "")] = r.value;

  return json({
    platform_fee: rates.platform_fee,
    delivery_base_fee: rates.delivery_base_fee,
    delivery_rate_per_km: rates.delivery_rate_per_km,
    grievance_officer: grievance,
  });
}
