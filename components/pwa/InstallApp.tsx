"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * "Install app" for the resident portal.
 *
 * Registers the service worker and offers a one-tap install, because asking a
 * UAT participant to find Chrome's ⋮ menu and read "Add to Home screen" loses
 * half of them before the session starts.
 *
 * Two different platforms, two different truths:
 *
 *  - **Android / Chrome / Edge** fire `beforeinstallprompt`, which can be
 *    saved and replayed from a button. That is a real one-tap install.
 *  - **iOS Safari has no such event and never will.** Apple only allows
 *    Share → Add to Home Screen, driven by the user. A button that claims to
 *    install on an iPhone would be a lie, so on iOS this shows the two steps
 *    instead.
 *
 * It renders nothing once the app is already installed (`display-mode:
 * standalone`), or in a browser that offers no route at all.
 */
export default function InstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Registration failing must never break the page — it only costs the
      // install button.
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS reports installed apps here rather than through display-mode.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const ua = window.navigator.userAgent;
    // iPadOS 13+ reports itself as a Mac, so the touch check is needed too.
    const iOSLike =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes("Macintosh") && "ontouchend" in document);
    setIsIOS(iOSLike);

    const onPrompt = (e: Event) => {
      e.preventDefault(); // stop Chrome's own mini-infobar
      setPromptEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    setBusy(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      // Chrome allows a saved prompt to be used once only.
      setPromptEvent(null);
    } finally {
      setBusy(false);
    }
  };

  if (installed) return null;
  if (!promptEvent && !isIOS) return null;

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">Add PropMate to your home screen</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Opens full screen, like an app. No download, no app store.
          </p>
        </div>

        {isIOS ? (
          <button
            type="button"
            onClick={() => setShowIOSHelp((v) => !v)}
            className="pressable shrink-0 rounded-xl border border-outline-variant/60 bg-surface-container-high px-4 py-2 text-xs font-bold text-on-surface"
          >
            How to add
          </button>
        ) : (
          <button
            type="button"
            onClick={install}
            disabled={busy}
            className="pressable shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined mr-1 align-[-4px] text-[18px]">
              install_mobile
            </span>
            {busy ? "Opening…" : "Install app"}
          </button>
        )}
      </div>

      {isIOS && showIOSHelp && (
        <ol className="mt-3 space-y-1.5 border-t border-outline-variant/40 pt-3 text-xs text-on-surface-variant">
          <li>
            <span className="font-semibold text-on-surface">1.</span> Tap the{" "}
            <span className="font-semibold text-on-surface">Share</span> button at the bottom of
            Safari — the square with an arrow pointing up.
          </li>
          <li>
            <span className="font-semibold text-on-surface">2.</span> Scroll down and tap{" "}
            <span className="font-semibold text-on-surface">Add to Home Screen</span>, then{" "}
            <span className="font-semibold text-on-surface">Add</span>.
          </li>
          <li className="pt-1 text-[11px]">
            Safari only. Chrome and Firefox on iPhone cannot add to the home screen.
          </li>
        </ol>
      )}
    </section>
  );
}
