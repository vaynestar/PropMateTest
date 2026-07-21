"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { checkInVisitorByQR } from "@/app/admin/visitors/scan-action";

export default function QRScanner({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Prevent multiple initializations in React strict mode
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render(
        async (decodedText) => {
          if (loading) return; // Prevent multiple fires
          setLoading(true);
          setResultMessage(null);
          
          const res = await checkInVisitorByQR(decodedText);
          if (res.success) {
            setResultMessage({ type: "success", text: `Checked in ${res.visitor?.visitor_name} successfully!` });
            // Close after 2 seconds on success
            setTimeout(() => {
              onClose();
            }, 2000);
          } else {
            setResultMessage({ type: "error", text: res.error || "Failed to check in" });
            setLoading(false);
          }
        },
        (error) => {
          // Ignore frequent scan errors
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div id="qr-reader" className="w-full max-w-sm overflow-hidden rounded-xl border border-outline-variant bg-white text-black mb-4" />
      
      {loading && !resultMessage && (
        <div className="text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined animate-spin-slow">progress_activity</span>
          Processing scan...
        </div>
      )}
      
      {resultMessage && (
        <div className={`p-4 rounded-lg w-full font-medium ${resultMessage.type === 'success' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-error-container/20 text-error-container border border-error-container/30'}`}>
          {resultMessage.text}
        </div>
      )}
    </div>
  );
}
