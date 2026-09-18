/**
 * Placeholder shown the moment a resident taps into a page, while the server
 * fetches it (user, 2026-09-18: "When try to view invoice take time to load,
 * can add loading widget"). Shaped like the page that is coming so the screen
 * doesn't jump when it arrives, with a spinner and label so it reads as
 * "working", not "broken".
 */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-surface-container-highest/70 animate-pulse ${className}`} />;
}

export default function PageSkeleton({
  label,
  variant = "list",
}: {
  label: string;
  variant?: "list" | "detail" | "cards";
}) {
  return (
    <div className="flex flex-col gap-5 w-full" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-on-surface/80">
        <span className="material-symbols-outlined text-[20px] text-primary animate-spin">progress_activity</span>
        {label}…
      </div>

      <div className="space-y-2">
        <Bar className="h-7 w-2/3" />
        <Bar className="h-4 w-1/2" />
      </div>

      {variant === "detail" && (
        <>
          <div className="glass-card rounded-2xl p-5 space-y-4 border border-outline-variant/40">
            <div className="flex justify-between">
              <Bar className="h-5 w-32" />
              <Bar className="h-6 w-20 rounded-full" />
            </div>
            <Bar className="h-10 w-48" />
            <div className="grid grid-cols-2 gap-3">
              <Bar className="h-12" />
              <Bar className="h-12" />
            </div>
          </div>
          <div className="glass-card rounded-2xl p-5 space-y-3 border border-outline-variant/40">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex justify-between">
                <Bar className="h-4 w-40" />
                <Bar className="h-4 w-16" />
              </div>
            ))}
          </div>
          <Bar className="h-12 w-full rounded-xl" />
        </>
      )}

      {variant === "list" &&
        [0, 1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-4 space-y-3 border border-outline-variant/40">
            <div className="flex justify-between">
              <Bar className="h-4 w-28" />
              <Bar className="h-6 w-16 rounded-full" />
            </div>
            <Bar className="h-7 w-40" />
            <Bar className="h-4 w-full" />
          </div>
        ))}

      {variant === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="glass-card rounded-2xl overflow-hidden border border-outline-variant/40">
              <Bar className="aspect-[16/9] rounded-none" />
              <div className="p-4 flex justify-between">
                <Bar className="h-8 w-32" />
                <Bar className="h-10 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
