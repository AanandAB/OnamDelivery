// Auth routes — OTP request + verify (phone-based login).

import type { Env } from "../env";
import { json, error, readBody, requireString } from "../lib/http";
import { issueOtp, checkOtp, signToken, secret } from "../lib/auth";
import { id } from "../lib/id";

interface UserRow {
  id: string;
  phone: string;
  name: string | null;
}

/** POST /api/auth/otp  { phone } */
export async function requestOtp(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const body = await readBody(req);
  const phone = requireString(body, "phone");
  if (phone instanceof Response) return phone;
  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 10) return error("Invalid phone number", 400);

  const { code } = await issueOtp(env, normalized);
  // Dev-mode: return the code so it can be tested without an SMS provider.
  return json({ ok: true, dev_otp: code, note: "dev mode — send this code via SMS in production" });
}

/** POST /api/auth/verify  { phone, code, name? } */
export async function verifyOtp(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const body = await readBody(req);
  const phone = requireString(body, "phone");
  if (phone instanceof Response) return phone;
  const code = requireString(body, "code");
  if (code instanceof Response) return code;
  const normalized = phone.replace(/\D/g, "");

  if (!(await checkOtp(env, normalized, code))) return error("Invalid or expired code", 401);

  // Upsert the user keyed by phone.
  let user = await env.DB.prepare(
    "SELECT id, phone, name FROM users WHERE phone = ?1",
  )
    .bind(normalized)
    .first<UserRow>();

  if (!user) {
    const userId = id();
    await env.DB.prepare("INSERT INTO users (id, phone) VALUES (?1, ?2)").bind(userId, normalized).run();
    user = (await env.DB.prepare("SELECT id, phone, name FROM users WHERE phone = ?1")
      .bind(normalized)
      .first<UserRow>())!;
  }

  const name = typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : null;
  if (name) {
    await env.DB.prepare("UPDATE users SET name = ?1 WHERE id = ?2").bind(name, user.id).run();
  }

  const token = await signToken({ sub: user.id, phone: normalized }, secret(env));
  return json({ token, user: { id: user.id, phone: normalized, name: name ?? user.name } });
}
