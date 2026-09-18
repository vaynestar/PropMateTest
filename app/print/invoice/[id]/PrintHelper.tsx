"use client";

import { useEffect } from "react";

export default function PrintHelper() {
  useEffect(() => {
    // Shown inside the in-app viewer (DEV-190): the viewer has its own Print
    // button - don't throw the print dialog at someone who only wants to read.
    if (window.self !== window.top) return;
    // Wait a brief moment to ensure fonts/styles load
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
