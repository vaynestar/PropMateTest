"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function RefreshDataButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refreshed, setRefreshed] = useState(false);

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
      setRefreshed(true);
      setTimeout(() => setRefreshed(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isPending}
      className="px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-all pressable disabled:opacity-50"
      title="Refresh all billing data & charts"
    >
      <span
        className={`material-symbols-outlined text-[18px] text-primary ${
          isPending ? "animate-spin" : ""
        }`}
      >
        refresh
      </span>
      <span>{isPending ? "Refreshing..." : refreshed ? "Refreshed!" : "Refresh Data"}</span>
    </button>
  );
}
