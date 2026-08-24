// Identifier helpers.

/** Collision-resistant random ID (UUID v4). */
export function id(): string {
  return crypto.randomUUID();
}

/** Short alphanumeric code for coupons (e.g. "ONAM-A1B2C3"). */
export function shortCode(prefix: string, length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${prefix}-${out}`;
}

/** Human-friendly order number (e.g. "ONM-A1B2C3D4"). */
export function orderNumber(): string {
  return shortCode("ONM", 8);
}
