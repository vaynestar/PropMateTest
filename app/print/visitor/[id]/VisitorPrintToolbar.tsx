"use client";

export default function VisitorPrintToolbar() {
  return (
    <div className="print:hidden mb-6 p-4 bg-gray-100 rounded-xl border border-gray-300 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-gray-700">print</span>
        <span className="font-bold text-gray-800 text-sm">Visitor Access Pass Slip</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm cursor-pointer text-xs flex items-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          <span>Print Slip</span>
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg text-xs transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
