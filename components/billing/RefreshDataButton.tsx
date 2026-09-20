"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BTN } from "@/components/admin/ui";

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
      className={BTN.secondary}
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
