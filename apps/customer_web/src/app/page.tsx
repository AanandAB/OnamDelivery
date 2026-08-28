"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVendors, type Vendor } from "@/lib/api";
import { useLang } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useLang();
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    getVendors()
      .then((v) => {
        if (mounted) setVendors(v);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-24">
          <div className="mb-4 text-5xl">🌸🌼</div>
          <h1 className="font-display mx-auto max-w-2xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
            {t.hero.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">{t.hero.subtitle}</p>
          <a
            href="#shops"
            className="mt-8 inline-block rounded-full bg-rose px-8 py-3 font-semibold text-white transition-colors hover:bg-rose-dark"
          >
            {t.hero.cta}
          </a>
        </div>
      </section>

      {/* Vendor grid */}
      <section id="shops" className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="text-2xl font-bold text-ink">{t.vendors.heading}</h2>
        <p className="mt-1 text-sm text-muted">{t.vendors.sub}</p>

        {vendors === null && !failed && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-cream-dark" />
            ))}
          </div>
        )}

        {failed && <p className="mt-8 text-rose">{t.vendors.loadError}</p>}

        {vendors && vendors.length === 0 && (
          <p className="mt-8 text-muted">{t.vendors.empty}</p>
        )}

        {vendors && vendors.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  const { t } = useLang();
  const open = vendor.is_open === 1;
  return (
    <Link
      href={`/shop?vendor=${vendor.id}`}
      className="animate-fade-up rounded-2xl border border-line bg-card p-5 shadow-soft transition-transform hover:-translate-y-1 hover:shadow-soft-lg"
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl">🏵️</span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            open ? "bg-leaf/15 text-leaf-dark" : "bg-cream-dark text-muted"
          }`}
        >
          {open ? t.vendors.open : t.vendors.closed}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-bold text-ink">{vendor.name}</h3>
      {vendor.rating > 0 ? (
        <p className="mt-1 text-sm">
          <span className="text-gold">★ {vendor.rating.toFixed(1)}</span>{" "}
          <span className="text-muted">
            ({vendor.rating_count} {t.vendors.rating})
          </span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">—</p>
      )}
      <p className="mt-3 text-sm font-semibold text-rose">{t.vendors.view} →</p>
    </Link>
  );
}
