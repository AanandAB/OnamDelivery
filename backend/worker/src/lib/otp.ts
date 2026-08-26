// OTP delivery — pluggable providers so the platform isn't tied to paid SMS.
//
// "dev" (default) returns the code in the API response so everything can be
// tested with zero external accounts.
//
// "whatsapp" sends the code through Meta's WhatsApp Cloud API as an
// authentication template — which Meta delivers for FREE (no per-message fee).
// This keeps the phone-based login while avoiding SMS costs entirely.

import type { Env } from "../env";

export type OtpDelivery =
  | { ok: true; provider: "dev"; code: string }
  | { ok: true; provider: "whatsapp" }
  | { ok: false; provider: string; error: string };

export async function deliverOtp(env: Env, phone: string, code: string): Promise<OtpDelivery> {
  const provider = (env.OTP_PROVIDER ?? "dev").toLowerCase();

  if (provider === "dev") return { ok: true, provider: "dev", code };

  if (provider === "whatsapp") {
    try {
      const sent = await sendWhatsApp(env, phone, code);
      return sent
        ? { ok: true, provider: "whatsapp" }
        : { ok: false, provider, error: "WhatsApp send failed" };
    } catch (e) {
      return { ok: false, provider, error: e instanceof Error ? e.message : "WhatsApp send failed" };
    }
  }

  return { ok: false, provider, error: `Unknown OTP_PROVIDER: ${provider}` };
}

/** Send a WhatsApp authentication template (free on the Meta Cloud API). */
async function sendWhatsApp(env: Env, phone: string, code: string): Promise<boolean> {
  const token = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_ID;
  const template = env.WHATSAPP_TEMPLATE_NAME ?? "otp_verification";
  if (!token || !phoneId) return false;

  // WhatsApp requires E.164 with country code (assume India if missing).
  const to = phone.startsWith("91") ? phone : "91" + phone.replace(/^0+/, "");

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: "en" },
        components: [
          // {{1}} in the template body is replaced with the code.
          { type: "body", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });

  return res.ok;
}
