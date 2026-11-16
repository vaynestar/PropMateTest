import Link from "next/link";

/**
 * The app had no not-found boundary at all, so every notFound() — an invoice
 * that is not yours, a deleted ticket, a mistyped id — rendered a blank screen
 * with nothing on it. A resident who opened an old link saw an empty page and
 * no way back.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-surface px-6 py-16 text-center">
      <span className="material-symbols-outlined text-[44px] text-on-surface-variant">
        search_off
      </span>
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold text-on-surface">We could not find that page</h1>
        <p className="max-w-sm text-sm text-on-surface-variant">
          The link may be out of date, or it may belong to another account. Nothing has been
          changed.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/resident"
          className="pressable rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary shadow-md transition-all hover:bg-primary/90"
        >
          Go to my home
        </Link>
        <Link
          href="/login"
          className="pressable rounded-xl border border-outline-variant/60 bg-surface-container-high px-5 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-variant"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
