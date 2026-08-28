"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="mt-16 border-t border-line bg-card">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-8 text-center">
        <span className="text-2xl">💐</span>
        <p className="text-sm text-muted">{t.footer.tagline}</p>
        <Link href="/privacy" className="text-sm font-medium text-rose hover:underline">
          {t.footer.privacy}
        </Link>
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} {t.brand}. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
