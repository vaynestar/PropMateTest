"use client";

import { useEffect } from "react";

/**
 * Registers the service worker and catches Chrome's install prompt, on every
 * page.
 *
 * Both of these used to live in `InstallApp`, which only renders on the
 * resident home page, and that is why no install button ever appeared:
 *
 *  - Chrome fires `beforeinstallprompt` **once, on the page it decides the
 *    site is installable on** — in practice the sign-in page, the first thing
 *    anyone loads. With no listener mounted yet the event was lost, and
 *    navigating to the resident home afterwards does not make it fire again.
 *  - The service worker was registered on the resident home too, so until a
 *    resident had signed in Chrome saw a site with no worker at all and did
 *    not consider it installable in the first place.
 *
 * This sits in the root layout, so the listener is up before the first paint
 * of whatever page is opened. The event is parked on `window` and announced
 * again as `propmate:installprompt`, so `InstallApp` can pick it up whenever
 * it happens to mount — before or after Chrome fires.
 */
export default function PwaBoot() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Failing to register must never break the page; it only costs the
      // install button.
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault(); // stop Chrome's own mini-infobar
      (window as PwaWindow).__propmateInstallPrompt = e;
      window.dispatchEvent(new Event("propmate:installprompt"));
    };
    const onInstalled = () => {
      (window as PwaWindow).__propmateInstallPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}

type PwaWindow = Window & { __propmateInstallPrompt?: Event | null };
