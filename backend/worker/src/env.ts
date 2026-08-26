// Worker bindings & environment.
export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  // OTP delivery (see lib/otp.ts). "dev" (default) | "whatsapp".
  OTP_PROVIDER?: string;
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_ID?: string;
  WHATSAPP_TEMPLATE_NAME?: string;
  // IMAGES?: R2Bucket; // enable after R2 is activated on the account
}
