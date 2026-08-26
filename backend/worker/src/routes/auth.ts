// Auth routes — OTP request + verify (phone-based login with DPDP consent).

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

/** POST /api/auth/verify  { phone, code, name?, consent, consent_version? } */
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

  // DPDP Act 2023 — explicit, recorded consent is required before processing
  // personal data. The privacy policy (consent_version) is shown in the app.
  if (body.consent !== true) {
    return error("Consent required — please accept the privacy policy (DPDP Act 2023)", 400);
  }
  const consentVersion = typeof body.consent_version === "string" ? body.consent_version : "1.0";

  const normalized = phone.replace(/\D/g, "");
  if (!(await checkOtp(env, normalized, code))) return error("Invalid or expired code", 401);

  const now = Math.floor(Date.now() / 1000);

  // Upsert the user keyed by phone, recording consent.
  let user = await env.DB.prepare(
    "SELECT id, phone, name FROM users WHERE phone = ?1",
  )
    .bind(normalized)
    .first<UserRow>();

  if (!user) {
    const userId = id();
    await env.DB.prepare(
      "INSERT INTO users (id, phone, consented_at, consent_version) VALUES (?1, ?2, ?3, ?4)",
    )
      .bind(userId, normalized, now, consentVersion)
      .run();
    user = (await env.DB.prepare("SELECT id, phone, name FROM users WHERE phone = ?1")
      .bind(normalized)
      .first<UserRow>())!;
  } else {
    await env.DB.prepare(
      "UPDATE users SET consented_at = ?1, consent_version = ?2 WHERE id = ?3",
    )
      .bind(now, consentVersion, user.id)
      .run();
  }

  const name = typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : null;
  if (name) {
    await env.DB.prepare("UPDATE users SET name = ?1 WHERE id = ?2").bind(name, user.id).run();
  }

  const token = await signToken({ sub: user.id, phone: normalized }, secret(env));
  return json({ token, user: { id: user.id, phone: normalized, name: name ?? user.name } });
}
