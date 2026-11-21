"use client";

import { useEffect, useState } from "react";

/**
 * On-screen only. Inside the in-app viewer (DEV-190) the viewer supplies its
 * own Close and Print, so this gets out of the way.
 *
 * Deliberately NOT a PrintHelper that fires window.print() on load: a report is
 * read before it is printed, unlike an invoice slip.
 */
export default function ReportPrintToolbar() {
  const [framed, setFramed] = useState(false);
  useEffect(() => setFramed(window.self !== window.top), []);
  if (framed) return null;

  return (
    <div className="print:hidden mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-100 p-3.5 shadow-xs">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <span className="material-symbols-outlined text-slate-600">description</span>
        <span>Property Management Report</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          <span>Print or save as PDF</span>
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
