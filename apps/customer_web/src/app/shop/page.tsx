import { Suspense } from "react";
import { ShopView } from "./ShopView";

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted">
          Loading…
        </div>
      }
    >
      <ShopView />
    </Suspense>
  );
}
