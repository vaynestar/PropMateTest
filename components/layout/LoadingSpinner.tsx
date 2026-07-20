export default function LoadingSpinner({
  label = "Loading",
}: {
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[50vh]">
      <span className="material-symbols-outlined text-5xl text-primary animate-spin-slow">
        progress_activity
      </span>
      <p className="font-label-md text-label-md text-on-surface-variant">
        {label}…
      </p>
    </div>
  );
}
