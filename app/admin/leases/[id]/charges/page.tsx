import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import AddLeaseChargeForm from "./AddLeaseChargeForm";
import { removeLeaseChargeAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LeaseChargesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["Admin"]);
  const { id } = await params;

  const lease = await prisma.tenantLease.findUnique({
    where: { lease_id: id },
    include: {
      tenant: true,
      unit: { include: { property: true } },
      lease_charges: {
        include: { charge: true },
        orderBy: { created_at: "asc" }
      }
    }
  });

  if (!lease) {
    return <div className="p-8 text-white">Lease not found</div>;
  }

  const activeCharges = await prisma.chargeMaster.findMany({
    where: { is_active: true, charge_type: "Recurring" },
    orderBy: { charge_name: "asc" }
  });

  return (
    <div className="flex flex-col gap-stack-lg animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/leases"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">
            arrow_back
          </span>
        </Link>
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              Tenant Billing Details Setup
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Setup default monthly charges for {lease.tenant.user_name} ({lease.unit.property.property_name} - Unit {lease.unit.unit_number})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/billing/recurring-charges"
              className="px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/60 hover:border-primary text-xs font-semibold text-on-surface transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">autorenew</span>
              Recurring Charges
            </Link>
            <Link
              href="/admin/invoices"
              className="px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-xs font-semibold text-primary transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              Billing Details
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low">
            <h2 className="font-title-md text-title-md text-on-surface">Recurring Charges</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container/50 border-b border-outline-variant text-on-surface-variant">
                <tr>
                  <th className="px-6 py-3 font-medium">Charge Name</th>
                  <th className="px-6 py-3 font-medium text-center">Quantity</th>
                  <th className="px-6 py-3 font-medium text-right">Unit Price</th>
                  <th className="px-6 py-3 font-medium text-right">Total</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {lease.lease_charges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                      No recurring charges set up. Click add to configure the monthly bill.
                    </td>
                  </tr>
                ) : (
                  lease.lease_charges.map((lc) => (
                    <tr key={lc.lease_charge_id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-on-surface">{lc.charge.charge_name}</td>
                      <td className="px-6 py-4 text-on-surface-variant text-center">{Number(lc.quantity)}</td>
                      <td className="px-6 py-4 text-on-surface-variant text-right">RM {Number(lc.amount).toFixed(2)}</td>
                      <td className="px-6 py-4 font-medium text-on-surface text-right">
                        RM {(Number(lc.quantity) * Number(lc.amount)).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={removeLeaseChargeAction}>
                          <input type="hidden" name="lease_charge_id" value={lc.lease_charge_id} />
                          <input type="hidden" name="lease_id" value={id} />
                          <button type="submit" className="text-rose-400 hover:text-rose-300 p-1">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
                {lease.lease_charges.length > 0 && (
                  <tr className="bg-surface-container-low/30">
                    <td colSpan={3} className="px-6 py-4 font-bold text-on-surface text-right">Monthly Total:</td>
                    <td className="px-6 py-4 font-bold text-emerald-400 text-right">
                      RM {lease.lease_charges.reduce((sum, lc) => sum + (Number(lc.quantity) * Number(lc.amount)), 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <AddLeaseChargeForm lease_id={id} activeCharges={activeCharges} />
      </div>
    </div>
  );
}
