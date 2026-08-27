"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface VisitorPassProps {
  visitor: {
    visitor_id: string;
    visitor_name: string;
    visitor_ic_no: string;
    visitor_type?: string | null;
    destination?: string | null;
    vehicle_plate?: string | null;
    visit_purpose?: string | null;
    visit_date?: Date | string | null;
    status?: string | null;
    contact_no?: string | null;
    property?: { property_name: string } | null;
    lease?: {
      unit?: {
        unit_number: string;
        property?: { property_name: string } | null;
      };
      tenant?: { user_name: string };
    } | null;
  };
  onClose: () => void;
}

export default function VisitorPassModal({ visitor, onClose }: VisitorPassProps) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const formattedDate = visitor.visit_date
    ? new Date(visitor.visit_date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Today";

  const propertyName =
    visitor.property?.property_name ||
    visitor.lease?.unit?.property?.property_name ||
    "PropMate Community";

  const destinationText =
    visitor.destination ||
    (visitor.lease?.unit ? `Unit ${visitor.lease.unit.unit_number}` : "General Access");

  // Download QR Code as PNG
  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `PropMate_Pass_${visitor.visitor_name.replace(/\s+/g, "_")}.png`;
    a.click();
  };

  // Copy Visitor Pass ID
  const handleCopyId = () => {
    navigator.clipboard.writeText(visitor.visitor_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open dedicated print pass window
  const handlePrint = () => {
    window.open(`/print/visitor/${visitor.visitor_id}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant hover:text-white flex items-center justify-center transition-colors"
          aria-label="Close modal"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Security Badge Header */}
        <div className="flex flex-col items-center gap-1 mb-3">
          <div className="px-3 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[13px]">badge</span>
            <span>Digital Access Pass</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mt-1">
            {visitor.visitor_name}
          </h3>
          <span className="text-xs text-on-surface-variant">
            {visitor.visitor_type || "Resident Guest"} • {propertyName}
          </span>
        </div>

        {/* QR Code Card Frame */}
        <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-white/20 mb-3.5 flex flex-col items-center">
          <QRCodeCanvas
            ref={canvasRef}
            value={visitor.visitor_id}
            size={175}
            level="H"
            includeMargin={true}
          />
          <span className="text-[10px] font-mono text-gray-500 mt-1.5 font-semibold">
            SCAN AT GUARDHOUSE
          </span>
        </div>

        {/* Pass Metadata Summary Box */}
        <div className="w-full bg-surface-container-high/60 border border-outline-variant/40 rounded-xl p-3 text-left text-xs space-y-1.5 mb-4">
          <div className="flex justify-between">
            <span className="text-on-surface-variant text-[11px]">Destination:</span>
            <span className="font-bold text-white">{destinationText}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant text-[11px]">IC / Passport:</span>
            <span className="font-mono text-white font-medium">{visitor.visitor_ic_no}</span>
          </div>
          {visitor.vehicle_plate && (
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant text-[11px]">Vehicle Plate:</span>
              <span className="font-mono font-bold text-amber-300 bg-surface-container-highest px-1.5 py-0.5 rounded text-[11px]">
                {visitor.vehicle_plate}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-on-surface-variant text-[11px]">Visit Date:</span>
            <span className="text-white font-medium">{formattedDate}</span>
          </div>
          {visitor.lease?.tenant && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant text-[11px]">Host Resident:</span>
              <span className="text-primary font-medium">{visitor.lease.tenant.user_name}</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Print, Download, Copy */}
        <div className="w-full flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary py-2.5 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all pressable"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print Pass Slip</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="py-2.5 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors pressable"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">download</span>
              <span>Save QR Image</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyId}
            className="w-full py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/60 hover:bg-surface-container-high text-on-surface-variant hover:text-white font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors pressable"
          >
            <span className="material-symbols-outlined text-[15px]">
              {copied ? "check" : "content_copy"}
            </span>
            <span>{copied ? "Copied Pass ID to Clipboard!" : "Copy Pass UUID"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
