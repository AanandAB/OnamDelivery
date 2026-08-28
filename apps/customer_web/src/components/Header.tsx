"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

export function Header() {
  const { lang, setLang, t } = useLang();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const pathname = usePathname();

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`text-sm font-medium transition-colors hover:text-rose ${
          active ? "text-rose" : "text-ink"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">💐</span>
          <span className="font-display text-lg font-bold tracking-tight text-ink">
            {t.brand}
          </span>
        </Link>

        <nav className="hidden items-center gap-5 sm:flex">
          {navLink("/", t.nav.shops)}
          {navLink("/cart", `${t.nav.cart}${count > 0 ? ` (${count})` : ""}`)}
          {navLink("/orders", t.nav.orders)}
        </nav>

        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <div className="flex overflow-hidden rounded-full border border-line bg-card text-xs font-semibold">
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1.5 transition-colors ${
                lang === "en" ? "bg-rose text-white" : "text-muted"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("ml")}
              className={`px-2.5 py-1.5 transition-colors ${
                lang === "ml" ? "bg-rose text-white" : "text-muted"
              }`}
            >
              മലയാളം
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted sm:inline">
                {user.phone}
              </span>
              <button
                onClick={logout}
                className="rounded-full border border-rose px-3 py-1.5 text-xs font-semibold text-rose transition-colors hover:bg-rose hover:text-white"
              >
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-rose px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-dark"
            >
              {t.nav.login}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center justify-around border-t border-line px-4 py-2 sm:hidden">
        {navLink("/", t.nav.shops)}
        {navLink("/cart", `${t.nav.cart}${count > 0 ? ` (${count})` : ""}`)}
        {navLink("/orders", t.nav.orders)}
      </nav>
    </header>
  );
}
