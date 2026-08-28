import { Suspense } from "react";
import { TrackView } from "./TrackView";

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted">
          Loading…
        </div>
      }
    >
      <TrackView />
    </Suspense>
  );
}
