import { notFound } from "next/navigation";
import { getInvoiceById } from "@/lib/billing";
import PrintHelper from "./PrintHelper";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function PrintInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const invoice = await getInvoiceById(params.id);

  if (!invoice) {
    notFound();
  }

  const { lease, details } = invoice;
  const { unit } = lease;
  const { property } = unit;

  return (
    <div className="max-w-[210mm] mx-auto bg-white text-black p-10 min-h-screen">
      <PrintHelper />
      
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-200 pb-8 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h1>
          <p className="text-gray-500 font-medium">{invoice.invoice_no}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">{property.property_name}</h2>
          <p className="text-gray-600 mt-1">{property.address}</p>
          <p className="text-gray-600">{property.city}, {property.state} {property.postal_code}</p>
          <p className="text-gray-600">{property.country}</p>
        </div>
      </div>

      {/* Bill To & Details */}
      <div className="flex justify-between mb-10">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To</p>
          <p className="text-lg font-bold text-gray-800">{lease.tenant.user_name}</p>
          <p className="text-gray-600">Unit {unit.unit_number}</p>
          <p className="text-gray-600">{lease.tenant.phone_number || ""}</p>
          <p className="text-gray-600">{lease.tenant.user_email || ""}</p>
        </div>
        <div className="text-right flex flex-col gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Date Issued</p>
            <p className="font-medium text-gray-800">{formatDate(invoice.invoice_date)}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Due Date</p>
            <p className="font-medium text-gray-800">{formatDate(invoice.due_date)}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Status</p>
            <p className={`font-bold ${invoice.status === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>
              {invoice.status.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <table className="w-full text-left mb-10 border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="py-3 text-sm font-bold text-gray-700 uppercase tracking-wider w-1/2">Description</th>
            <th className="py-3 text-sm font-bold text-gray-700 uppercase tracking-wider text-center">Qty</th>
            <th className="py-3 text-sm font-bold text-gray-700 uppercase tracking-wider text-right">Unit Price</th>
            <th className="py-3 text-sm font-bold text-gray-700 uppercase tracking-wider text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {details.map((d) => (
            <tr key={d.detail_id}>
              <td className="py-4 text-gray-800">{d.description}</td>
              <td className="py-4 text-gray-800 text-center">{Number(d.quantity)}</td>
              <td className="py-4 text-gray-800 text-right">{formatCurrency(Number(d.unit_price))}</td>
              <td className="py-4 text-gray-900 font-medium text-right">{formatCurrency(Number(d.total_price))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total Section */}
      <div className="flex justify-end">
        <div className="w-1/2 md:w-1/3">
          <div className="flex justify-between py-2 font-bold text-xl border-t-2 border-gray-800 text-gray-900 pt-4">
            <span>Total Amount</span>
            <span>{formatCurrency(Number(invoice.total_amount))}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>Thank you for your prompt payment.</p>
        <p>If you have any questions concerning this invoice, please contact management.</p>
      </div>
    </div>
  );
}
