"use client";

import { useEffect } from "react";

export default function PrintHelper() {
  useEffect(() => {
    // Wait a brief moment to ensure fonts/styles load
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
