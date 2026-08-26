// Order economics — delivery fee, partner pay, and platform fee.
//
// Fuel reference: ₹116/L ÷ 20 km/L = ₹5.80/km. Partner pay (₹10/km) exceeds
// fuel cost so partners profit after fuel. All rates live in the `settings`
// table so the owner dashboard can tune them without redeploying.

import type { Env } from "../env";

export interface Rates {
  platform_fee: number;
  delivery_base_fee: number;
  delivery_rate_per_km: number;
  partner_base_pay: number;
  partner_rate_per_km: number;
}

const DEFAULTS: Rates = {
  platform_fee: 20,
  delivery_base_fee: 40,
  delivery_rate_per_km: 15,
  partner_base_pay: 30,
  partner_rate_per_km: 10,
};

/** Read rates from the settings table, falling back to defaults. */
export async function getRates(env: Env): Promise<Rates> {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all<{
    key: string;
    value: string;
  }>();
  const map: Record<string, string> = {};
  for (const r of results) map[r.key] = r.value;

  const num = (k: keyof Rates): number => {
    const v = Number(map[k]);
    return Number.isFinite(v) ? v : DEFAULTS[k];
  };

  return {
    platform_fee: num("platform_fee"),
    delivery_base_fee: num("delivery_base_fee"),
    delivery_rate_per_km: num("delivery_rate_per_km"),
    partner_base_pay: num("partner_base_pay"),
    partner_rate_per_km: num("partner_rate_per_km"),
  };
}

export interface Quote {
  distance_km: number;
  delivery_fee: number; // charged to customer
  delivery_pay: number; // paid to partner (platform delivery only)
  platform_fee: number; // developer profit per order
}

/** Compute the money for a delivery of `km` kilometres. */
export function quote(km: number, rates: Rates): Quote {
  const delivery_fee = rates.delivery_base_fee + rates.delivery_rate_per_km * km;
  const delivery_pay = rates.partner_base_pay + rates.partner_rate_per_km * km;
  return {
    distance_km: Math.round(km * 10) / 10,
    delivery_fee: Math.round(delivery_fee),
    delivery_pay: Math.round(delivery_pay),
    platform_fee: rates.platform_fee,
  };
}
