// Auth — OTP issuance/verification and JWT (HS256 via Web Crypto).
//
// Dev-mode note: OTP codes are returned in the API response so they can be
// tested without an SMS provider. In production, send the code via SMS and
// remove the `otp` field from the response.

import type { Env } from "../env";
import { error } from "./http";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DEV_SECRET = "onam-delivery-dev-secret-do-not-use-in-prod";
const OTP_TTL_SECONDS = 300; // 5 minutes

export function secret(env: Env): string {
  return env.JWT_SECRET && env.JWT_SECRET.length > 0 ? env.JWT_SECRET : DEV_SECRET;
}

/** Generate a 6-digit OTP. */
export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Sign a JWT (HS256). `exp` is seconds since epoch. */
export async function signToken(
  payload: Record<string, unknown>,
  key: string,
  expSeconds = 60 * 60 * 24 * 30, // 30 days
): Promise<string> {
  const header = b64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(
    encoder.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expSeconds })),
  );
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(new Uint8Array(sig))}`;
}

/** Verify a JWT and return its payload, or null if invalid/expired. */
export async function verifyToken(
  token: string,
  key: string,
): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(key),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      b64urlToBytes(sig),
      encoder.encode(`${header}.${body}`),
    );
    if (!valid) return null;
    const payload = JSON.parse(decoder.decode(b64urlToBytes(body))) as Record<string, unknown>;
    if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface AuthUser {
  userId: string;
  phone: string;
}

/** Extract + verify the bearer token, returning the user or a 401 Response. */
export async function requireAuth(req: Request, env: Env): Promise<AuthUser | Response> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return error("Missing bearer token", 401);
  const payload = await verifyToken(token, secret(env));
  if (!payload || typeof payload.sub !== "string") return error("Invalid or expired token", 401);
  return { userId: payload.sub, phone: (payload.phone as string) ?? "" };
}

export interface AuthPartner {
  partnerId: string;
  phone: string;
}

/** Extract + verify a PARTNER bearer token (JWT carries role="partner"). */
export async function requirePartner(req: Request, env: Env): Promise<AuthPartner | Response> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return error("Missing bearer token", 401);
  const payload = await verifyToken(token, secret(env));
  if (!payload || payload.role !== "partner" || typeof payload.sub !== "string") {
    return error("Partner authentication required", 401);
  }
  return { partnerId: payload.sub, phone: (payload.phone as string) ?? "" };
}

export interface AuthVendor {
  vendorId: string;
  phone: string;
}

/** Extract + verify a VENDOR bearer token (JWT carries role="vendor"). */
export async function requireVendor(req: Request, env: Env): Promise<AuthVendor | Response> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return error("Missing bearer token", 401);
  const payload = await verifyToken(token, secret(env));
  if (!payload || payload.role !== "vendor" || typeof payload.sub !== "string") {
    return error("Vendor authentication required", 401);
  }
  return { vendorId: payload.sub, phone: (payload.phone as string) ?? "" };
}

export interface AuthOwner {
  ownerId: string;
  phone: string;
}

/** Extract + verify an OWNER (super-admin) bearer token (JWT role="owner"). */
export async function requireOwner(req: Request, env: Env): Promise<AuthOwner | Response> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return error("Missing bearer token", 401);
  const payload = await verifyToken(token, secret(env));
  if (!payload || payload.role !== "owner" || typeof payload.sub !== "string") {
    return error("Owner authentication required", 401);
  }
  return { ownerId: payload.sub, phone: (payload.phone as string) ?? "" };
}

/** Issue a dev OTP: persist it and return the code (production would SMS it). */
export async function issueOtp(env: Env, phone: string): Promise<{ code: string }> {
  const code = generateOtp();
  const expiresAt = Math.floor(Date.now() / 1000) + OTP_TTL_SECONDS;
  await env.DB.prepare(
    "INSERT INTO otp_codes (phone, code, expires_at, used) VALUES (?1, ?2, ?3, 0)",
  )
    .bind(phone, code, expiresAt)
    .run();
  return { code };
}

/** Verify an OTP against the newest unused code for the phone. */
export async function checkOtp(env: Env, phone: string, code: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    "SELECT id FROM otp_codes WHERE phone = ?1 AND code = ?2 AND used = 0 AND expires_at > ?3 ORDER BY id DESC LIMIT 1",
  )
    .bind(phone, code, now)
    .first();
  if (!row) return false;
  await env.DB.prepare("UPDATE otp_codes SET used = 1 WHERE id = ?1").bind(row.id as number).run();
  return true;
}
