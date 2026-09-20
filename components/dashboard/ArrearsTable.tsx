import Link from "next/link";
import { EmptyState, Money, TABLE } from "@/components/admin/ui";

/**
 * Who owes the most, oldest first (DEV-194). A table, not a chart: for money
 * chasing, the office needs the unit, the person and the exact figure.
 */
export default function ArrearsTable({
  rows,
}: {
  rows: { invoice_id: string; invoice_no: string; unit: string; tenant: string; daysLate: number; amount: number }[];
}) {
  if (!rows.length) {
    return <EmptyState icon="verified" title="Nothing overdue" hint="Every issued invoice is within its due date." />;
  }

  const worst = Math.max(...rows.map((r) => r.daysLate));

  return (
    <div className={TABLE.wrap}>
      <table className={`${TABLE.table} min-w-[520px]`}>
        <thead>
          <tr>
            <th className={TABLE.th}>Unit</th>
            <th className={TABLE.th}>Resident</th>
            <th className={TABLE.th}>Invoice</th>
            <th className={TABLE.thNum}>Late by</th>
            <th className={TABLE.thNum}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.invoice_id} className={TABLE.tr}>
              <td className={`${TABLE.td} font-semibold text-white`}>{r.unit}</td>
              <td className={TABLE.tdMuted}>{r.tenant}</td>
              <td className={TABLE.td}>
                <Link href={`/admin/invoices`} className="text-primary hover:underline">
                  {r.invoice_no}
                </Link>
              </td>
              <td className={TABLE.tdNum}>
                <span className="inline-flex items-center gap-2">
                  <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-container-highest sm:block">
                    <span
                      className="block h-full rounded-full bg-rose-400"
                      style={{ width: `${Math.max(6, (r.daysLate / worst) * 100)}%` }}
                    />
                  </span>
                  <span className="font-semibold text-rose-300">{r.daysLate}d</span>
                </span>
              </td>
              <td className={`${TABLE.tdNum} font-semibold`}>
                <Money value={r.amount} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
