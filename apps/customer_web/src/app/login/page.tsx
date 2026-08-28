"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useLang();
  const { login } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (phone.replace(/\D/g, "").length < 10) {
      setError(t.login.errorPhone);
      return;
    }
    if (!consent) {
      setError(t.login.errorConsent);
      return;
    }
    setError("");
    setBusy(true);
    try {
      const c = await requestOtp(phone.trim());
      setDevOtp(c);
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError("");
    setBusy(true);
    try {
      const r = await verifyOtp(phone.trim(), code.trim(), consent);
      login(r.token, r.user);
      const next =
        new URLSearchParams(window.location.search).get("next") || "/";
      router.push(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <div className="rounded-3xl border border-line bg-card p-8 shadow-soft-lg">
        <div className="text-center">
          <span className="text-4xl">💐</span>
          <h1 className="mt-3 font-display text-2xl font-bold">{t.login.title}</h1>
          <p className="mt-1 text-sm text-muted">{t.login.sub}</p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">
              {t.login.phone}
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              disabled={sent}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder={t.login.phoneHint}
              className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-ink outline-none focus:border-rose disabled:opacity-60"
            />
          </div>

          {sent && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">
                {t.login.code}
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-ink outline-none focus:border-rose"
              />
              {devOtp && (
                <p className="mt-2 text-sm font-semibold text-leaf">
                  {t.login.devCode} {devOtp}
                </p>
              )}
            </div>
          )}

          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 accent-rose"
            />
            <span>{t.login.consent}</span>
          </label>

          <button
            onClick={sent ? verify : send}
            disabled={busy}
            className="w-full rounded-full bg-rose py-3 font-semibold text-white transition-colors hover:bg-rose-dark disabled:opacity-60"
          >
            {busy ? "…" : sent ? t.login.verify : t.login.send}
          </button>

          {sent && (
            <button
              onClick={() => {
                setSent(false);
                setCode("");
                setError("");
              }}
              className="w-full text-center text-sm font-medium text-muted hover:text-ink"
            >
              {t.login.change}
            </button>
          )}

          {error && <p className="text-center text-sm text-rose">{error}</p>}
        </div>
      </div>
    </div>
  );
}
