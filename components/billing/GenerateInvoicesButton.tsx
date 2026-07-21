"use client";
import { useState } from "react";
import { generateInvoicesAction } from "@/app/admin/invoices/actions";

export default function GenerateInvoicesButton() {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await generateInvoicesAction();
      alert(res.message);
    } catch (err: any) {
      alert("Error generating invoices: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading}
      className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
        {loading ? "hourglass_top" : "receipt_long"}
      </span>
      {loading ? "Generating..." : "Generate Monthly Invoices"}
    </button>
  );
}
