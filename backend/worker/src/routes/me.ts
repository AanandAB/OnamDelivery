// "Me" routes — DPDP right-to-erasure (delete my account / personal data).

import type { Env } from "../env";
import { json } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { id } from "../lib/id";

/** DELETE /api/me (auth) — anonymize PII and delete addresses (DPDP s.12). */
export async function deleteMe(
  req: Request,
  env: Env,
  _url: URL,
  _params: string[],
): Promise<Response> {
  const auth = await requireAuth(req, env);
  if (auth instanceof Response) return auth;

  // Anonymize personal identifiers (keep the row so order history stays
  // referentially intact for legal/accounting purposes).
  const anonPhone = `deleted-${id().slice(0, 8)}`;
  await env.DB.prepare("UPDATE users SET name = NULL, phone = ?1 WHERE id = ?2")
    .bind(anonPhone, auth.userId)
    .run();
  await env.DB.prepare("DELETE FROM addresses WHERE user_id = ?1").bind(auth.userId).run();

  return json({
    ok: true,
    message:
      "Your personal data has been erased. Order records are retained only as required for legal and accounting compliance.",
  });
}
