"use client";

import { useEffect, useState } from "react";
import QRScanner, { terminateAllMediaStreams } from "./QRScanner";

export default function ScanButton() {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    terminateAllMediaStreams();
    setOpen(false);
  };

  // Ensure camera streams are terminated if user navigates away or unmounts
  useEffect(() => {
    if (!open) {
      terminateAllMediaStreams();
    }
    return () => {
      terminateAllMediaStreams();
    };
  }, [open]);

  // Handle ESC key press to close modal and stop camera
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary px-4 py-2.5 flex items-center gap-2 rounded-xl text-white font-semibold text-xs shadow-lg hover:brightness-110 transition-all pressable"
      >
        <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
        <span>Scan Visitor QR</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-3xl w-full max-w-md border border-outline-variant/60 shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">
                    Visitor Access Terminal
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Guardhouse Check-in & Pass Verification
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant hover:text-white hover:bg-surface-variant transition-colors flex items-center justify-center p-1"
                aria-label="Close scanner"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scanner Component */}
            <QRScanner onClose={handleClose} />
          </div>
        </div>
      )}
    </>
  );
}
