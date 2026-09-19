"use client";

import { useRef, useState } from "react";

/**
 * Save a file without leaving the app (DEV-191). An installed PWA has no back
 * button (DEV-190), so we never navigate to the file:
 *  - phone / tablet: the share sheet ("Save to Files", WhatsApp, email...);
 *  - computer: a normal browser download.
 *
 * iOS only allows the share sheet straight after a tap. If fetching the file
 * took too long and iOS refuses, the button turns into "Save <file>" - one
 * more tap opens the sheet with the file already loaded.
 */
export async function fetchFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(res.status === 404 ? "This file isn't available." : "Couldn't download - please try again.");
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "application/octet-stream" });
}

const touchDevice = () =>
  typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

function saveWithLink(file: File) {
  const href = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = href;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30_000);
}

/** Returns "done", "cancelled" or "needs-tap" (iOS lost the tap while we fetched). */
export async function saveFile(file: File): Promise<"done" | "cancelled" | "needs-tap"> {
  if (touchDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return "done";
    } catch (e) {
      const name = (e as Error)?.name;
      if (name === "AbortError") return "cancelled";
      if (name === "NotAllowedError") return "needs-tap";
      // Anything else: fall back to a plain download.
    }
  }
  saveWithLink(file);
  return "done";
}

export default function DownloadButton({
  url,
  filename,
  className,
  label = "Download PDF",
  icon = "download",
  onDownloaded,
  labelClassName,
}: {
  url: string;
  filename: string;
  className?: string;
  label?: string;
  icon?: string;
  onDownloaded?: () => void;
  /** e.g. "hidden sm:inline" for an icon-only button on phones */
  labelClassName?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ready">("idle");
  const [error, setError] = useState<string | null>(null);
  const ready = useRef<File | null>(null);

  const run = async () => {
    setError(null);
    try {
      let file = ready.current;
      if (!file) {
        setState("loading");
        file = await fetchFile(url, filename);
      }
      const r = await saveFile(file);
      if (r === "needs-tap") {
        ready.current = file;
        setState("ready");
        return;
      }
      ready.current = null;
      setState("idle");
      if (r === "done") onDownloaded?.();
    } catch (e) {
      setState("idle");
      setError((e as Error)?.message || "Couldn't download - please try again.");
    }
  };

  return (
    <span className="contents">
      <button type="button" onClick={run} disabled={state === "loading"} className={className} aria-label={state === "ready" ? `Save ${filename}` : label}>
        <span className={`material-symbols-outlined text-[18px] ${state === "loading" ? "animate-spin" : ""}`}>
          {state === "loading" ? "progress_activity" : state === "ready" ? "ios_share" : icon}
        </span>
        <span className={state === "ready" ? undefined : labelClassName}>
          {state === "loading" ? "Preparing…" : state === "ready" ? "Save" : label}
        </span>
      </button>
      {error && (
        <span role="alert" className="block w-full text-xs text-rose-300">
          {error}
        </span>
      )}
    </span>
  );
}
