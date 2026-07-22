export default function AdminLoading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card p-8 rounded-2xl border border-outline-variant/60 shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs w-full">
        {/* Pulsing Logo Container */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 shadow-[0_0_25px_rgba(123,87,231,0.3)] animate-pulse">
          <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
            progress_activity
          </span>
        </div>

        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
            Loading PropMate
          </h3>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 animate-pulse">
            Fetching module data...
          </p>
        </div>

        <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-gradient-to-r from-primary via-purple-400 to-primary w-1/2 rounded-full animate-slide-in" />
        </div>
      </div>
    </div>
  );
}
