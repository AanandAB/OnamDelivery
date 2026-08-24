// HTTP helpers — consistent JSON responses, CORS, error handling, body parsing.

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/** Build response headers with CORS + content-type baked in. */
function headers(extra?: Record<string, string>): Headers {
  const h = new Headers(extra ?? {});
  for (const [k, v] of Object.entries(CORS_HEADERS)) h.set(k, v);
  return h;
}

/** JSON response. */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: headers({ "Content-Type": "application/json; charset=utf-8" }),
  });
}

/** JSON error response. */
export function error(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return json({ error: message, ...(extra ?? {}) }, status);
}

/** CORS preflight response. */
export function handleOptions(): Response {
  return new Response(null, { status: 204, headers: headers() });
}

/** Parse a JSON body, tolerating an empty/missing body. */
export async function readBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/** Validate a required string field, returning a 400 Response if missing. */
export function requireString(
  body: Record<string, unknown>,
  field: string,
): string | Response {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") {
    return error(`Missing required field: ${field}`, 400);
  }
  return value.trim();
}

/** Validate a required number field. */
export function requireNumber(
  body: Record<string, unknown>,
  field: string,
): number | Response {
  const value = body[field];
  if (typeof value !== "number" || Number.isNaN(value)) {
    return error(`Missing or invalid numeric field: ${field}`, 400);
  }
  return value;
}
