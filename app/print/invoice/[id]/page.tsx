import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { docMoney, loadInvoiceDoc } from "@/lib/invoice-document";
import PrintHelper from "./PrintHelper";

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-rose-100 text-rose-800",
  UNPAID: "bg-amber-100 text-amber-800",
  DRAFT: "bg-slate-200 text-slate-700",
  VOIDED: "bg-slate-200 text-slate-700",
};

/**
 * The invoice preview (also what prints). Redesigned in DEV-191 (user: "the
 * pdf seem compact especially on the amount"): on a phone the line items are
 * stacked rows with the amount on its own right-hand column, and the total is
 * a large block; from tablet width up (and on paper) it is a table.
 *
 * Same data as the downloadable PDF - lib/invoice-document.ts. The office's
 * wording (terms, footer, contact) comes from Settings -> Invoice Document.
 */
export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Admin: any invoice. Resident: only an issued invoice on their own lease.
  const user = await requireUser(["Admin", "Resident"]);
  const doc = await loadInvoiceDoc(id, user);
  if (!doc) notFound();

  const open = doc.status !== "PAID" && doc.status !== "VOIDED";
  const { settings } = doc;
  const label = "text-[11px] font-bold uppercase tracking-wider text-slate-500";

  return (
    <div className="mx-auto min-h-screen max-w-[210mm] bg-white px-5 py-6 text-slate-900 sm:px-10 sm:py-10 print:p-0">
      <PrintHelper />

      {/* Header */}
      <header className="flex flex-col gap-5 border-b-2 border-slate-900 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">INVOICE</h1>
          <p className="mt-1 font-mono text-base font-bold text-indigo-700">{doc.invoiceNo}</p>
          <span className={`mt-2 inline-block rounded px-2.5 py-0.5 text-xs font-extrabold ${STATUS_STYLE[doc.status] ?? STATUS_STYLE.DRAFT}`}>
            {doc.status}
          </span>
        </div>
        <div className="sm:text-right">
          <p className="text-lg font-bold">{doc.issuer}</p>
          {doc.addressLines.map((l) => (
            <p key={l} className="text-sm text-slate-600">{l}</p>
          ))}
          {settings.taxNo && <p className="mt-1 text-xs text-slate-500">SST / Tax Reg. No: {settings.taxNo}</p>}
        </div>
      </header>

      {/* Bill to + dates */}
      <section className="grid grid-cols-2 gap-x-4 gap-y-5 py-6 sm:grid-cols-[1fr_auto_auto] sm:gap-x-10">
        <div className="col-span-2 sm:col-span-1">
          <p className={label}>Bill to</p>
          <p className="mt-1 text-lg font-bold">{doc.billTo.name}</p>
          <p className="text-sm text-slate-600">Unit {doc.billTo.unit}</p>
          {doc.billTo.phone && <p className="text-sm text-slate-600">{doc.billTo.phone}</p>}
          {doc.billTo.email && <p className="break-all text-sm text-slate-600">{doc.billTo.email}</p>}
        </div>
        <div>
          <p className={label}>Date issued</p>
          <p className="mt-1 text-base font-semibold">{doc.issuedOn}</p>
        </div>
        <div>
          <p className={label}>Due date</p>
          <p className="mt-1 text-base font-semibold">{doc.dueOn}</p>
        </div>
      </section>

      {/* Line items: stacked rows on a phone ... */}
      <section className="sm:hidden">
        <p className={`${label} border-b border-slate-200 pb-2`}>Items</p>
        <ul className="divide-y divide-slate-200">
          {doc.lines.map((l, i) => (
            <li key={i} className="flex items-start justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[15px] font-medium leading-snug">{l.description}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {l.qty} × {docMoney(l.unitPrice)}
                </p>
              </div>
              <p className="shrink-0 whitespace-nowrap text-[15px] font-bold tabular-nums">{docMoney(l.total)}</p>
            </li>
          ))}
          {!doc.lines.length && <li className="py-4 text-sm italic text-slate-500">No items on this invoice.</li>}
        </ul>
      </section>

      {/* ... and a table from tablet width up, and on paper */}
      <table className="hidden w-full border-collapse text-left sm:table">
        <thead>
          <tr className="bg-slate-100">
            <th className={`${label} px-3 py-3`}>Description</th>
            <th className={`${label} px-3 py-3 text-right`}>Qty</th>
            <th className={`${label} px-3 py-3 text-right`}>Unit price</th>
            <th className={`${label} px-3 py-3 text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {doc.lines.map((l, i) => (
            <tr key={i}>
              <td className="px-3 py-3.5 text-[15px]">{l.description}</td>
              <td className="px-3 py-3.5 text-right text-[15px] tabular-nums">{l.qty}</td>
              <td className="whitespace-nowrap px-3 py-3.5 text-right text-[15px] tabular-nums text-slate-600">{docMoney(l.unitPrice)}</td>
              <td className="whitespace-nowrap px-3 py-3.5 text-right text-[15px] font-bold tabular-nums">{docMoney(l.total)}</td>
            </tr>
          ))}
          {!doc.lines.length && (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-sm italic text-slate-500">No items on this invoice.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Total */}
      <section className="mt-5 flex sm:justify-end">
        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 sm:w-80">
          <p className={label}>{doc.status === "PAID" ? "Total paid" : doc.status === "VOIDED" ? "Total (voided)" : "Amount due"}</p>
          <p className={`mt-1 text-3xl font-black tabular-nums ${doc.status === "PAID" ? "text-slate-900" : "text-indigo-700"}`}>
            {docMoney(doc.total)}
          </p>
          {open && <p className="mt-0.5 text-sm text-slate-600">by {doc.dueOn}</p>}
        </div>
      </section>

      {/* How to pay */}
      {open && (
        <section className="mt-8 break-inside-avoid">
          <h2 className="text-base font-bold">How to pay</h2>
          {settings.bank ? (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-slate-500">Bank</dt>
              <dd className="font-medium">{settings.bank.bankName}</dd>
              <dt className="text-slate-500">Account name</dt>
              <dd className="font-medium">{settings.bank.accountName}</dd>
              <dt className="text-slate-500">Account no</dt>
              <dd className="font-mono font-medium">{settings.bank.accountNo}</dd>
              <dt className="text-slate-500">Reference</dt>
              <dd className="font-mono font-medium">{doc.invoiceNo}</dd>
            </dl>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              Pay through the PropMate resident app, quoting <span className="font-mono font-semibold">{doc.invoiceNo}</span> as the reference.
            </p>
          )}
        </section>
      )}

      {/* Terms */}
      {settings.terms.length > 0 && (
        <section className="mt-8 break-inside-avoid">
          <h2 className="text-base font-bold">Terms &amp; conditions</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-slate-600">
            {settings.terms.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </section>
      )}

      {/* Footer */}
      {(settings.footer || settings.contact) && (
        <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-sm">
          {settings.footer && <p className="font-semibold text-slate-800">{settings.footer}</p>}
          {settings.contact && <p className="mt-1 text-slate-500">{settings.contact}</p>}
        </footer>
      )}
    </div>
  );
}
