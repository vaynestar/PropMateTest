"use client";

import { useState } from "react";
import QRScanner from "./QRScanner";

export default function ScanButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary px-5 py-2.5 flex items-center gap-2 rounded-lg"
      >
        <span className="material-symbols-outlined">qr_code_scanner</span>
        Scan QR Code
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface p-6 rounded-2xl w-full max-w-md border border-outline-variant relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-xl font-bold mb-4">Scan Visitor QR</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Position the visitor's QR code within the frame to check them in.
            </p>
            <QRScanner onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
