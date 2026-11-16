"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaWindow = Window & { __propmateInstallPrompt?: Event | null };

/**
 * "Install app" for the resident portal.
 *
 * The service worker and the `beforeinstallprompt` listener live in
 * `PwaBoot`, in the root layout — Chrome fires that event once, on whichever
 * page it first judges the site installable, which is the sign-in page, long
 * before this component mounts. This one only reads the parked event and
 * draws the card.
 *
 * Three platforms, three different truths:
 *
 *  - **Chrome / Edge on Android** fire `beforeinstallprompt`, which can be
 *    saved and replayed from a button. That is a real one-tap install.
 *  - **iOS Safari has no such event and never will.** Apple only allows
 *    Share → Add to Home Screen, driven by the user.
 *  - **Everywhere else** — Firefox, a Chrome that has already offered the
 *    prompt once this session, a desktop browser that will not install — the
 *    card still shows the menu route rather than vanishing, because a card
 *    that disappears looks like a missing feature to a UAT participant.
 *
 * It renders nothing once the app is already installed (`display-mode:
 * standalone`).
 */
export default function InstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS reports installed apps here rather than through display-mode.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const ua = window.navigator.userAgent;
    // iPadOS 13+ reports itself as a Mac, so the touch check is needed too.
    setIsIOS(
      /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document)
    );

    // Chrome may have fired before this mounted - PwaBoot parks it.
    const parked = (window as PwaWindow).__propmateInstallPrompt;
    if (parked) setPromptEvent(parked as InstallPromptEvent);

    const onParked = () => {
      const e = (window as PwaWindow).__propmateInstallPrompt;
      if (e) setPromptEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("propmate:installprompt", onParked);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("propmate:installprompt", onParked);
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
      (window as PwaWindow).__propmateInstallPrompt = null;
    } finally {
      setBusy(false);
    }
  };

  if (installed) return null;

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">Add PropMate to your home screen</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Opens full screen, like an app. No download, no app store.
          </p>
        </div>

        {promptEvent ? (
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
        ) : (
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="pressable shrink-0 rounded-xl border border-outline-variant/60 bg-surface-container-high px-4 py-2 text-xs font-bold text-on-surface"
          >
            How to add
          </button>
        )}
      </div>

      {!promptEvent && showHelp && (
        <ol className="mt-3 space-y-1.5 border-t border-outline-variant/40 pt-3 text-xs text-on-surface-variant">
          {isIOS ? (
            <>
              <li>
                <span className="font-semibold text-on-surface">1.</span> Tap the{" "}
                <span className="font-semibold text-on-surface">Share</span> button at the bottom
                of Safari — the square with an arrow pointing up.
              </li>
              <li>
                <span className="font-semibold text-on-surface">2.</span> Scroll down and tap{" "}
                <span className="font-semibold text-on-surface">Add to Home Screen</span>, then{" "}
                <span className="font-semibold text-on-surface">Add</span>.
              </li>
              <li className="pt-1 text-[11px]">
                Safari only. Chrome and Firefox on iPhone cannot add to the home screen.
              </li>
            </>
          ) : (
            <>
              <li>
                <span className="font-semibold text-on-surface">1.</span> Tap the{" "}
                <span className="font-semibold text-on-surface">⋮</span> menu at the top right of
                the browser.
              </li>
              <li>
                <span className="font-semibold text-on-surface">2.</span> Tap{" "}
                <span className="font-semibold text-on-surface">Add to Home screen</span> (some
                versions say <span className="font-semibold text-on-surface">Install app</span>),
                then <span className="font-semibold text-on-surface">Install</span>.
              </li>
              <li className="pt-1 text-[11px]">
                Chrome offers this once per visit. If it has already been offered and dismissed,
                the menu is the way back to it.
              </li>
            </>
          )}
        </ol>
      )}
    </section>
  );
}
