import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { createChargeAction, updateChargeAction } from "./actions";

export default async function ChargesPage() {
  await requireUser(["Admin"]);

  const charges = await prisma.chargeMaster.findMany({
    orderBy: { charge_name: "asc" },
  });

  return (
    <div className="flex flex-col gap-stack-lg animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/billing"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">
            arrow_back
          </span>
        </Link>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Charge Masterfile
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Manage standard recurring and one-off charges.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low">
            <h2 className="font-title-md text-title-md text-on-surface">Existing Charges</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container/50 border-b border-outline-variant text-on-surface-variant">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">UOM</th>
                  <th className="px-6 py-3 font-medium text-right">Default Amt</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {charges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                      No charges defined yet.
                    </td>
                  </tr>
                ) : (
                  charges.map((c) => (
                    <tr key={c.charge_id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-on-surface">{c.charge_name}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{c.charge_type}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{c.uom}</td>
                      <td className="px-6 py-4 text-right text-on-surface">
                        RM {Number(c.default_amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${c.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 self-start">
          <h2 className="font-title-md text-title-md text-on-surface mb-4">Add New Charge</h2>
          <form action={createChargeAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-on-surface-variant">Charge Name</label>
              <input type="text" name="charge_name" required placeholder="e.g. Monthly Rent" className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-on-surface-variant">Charge Type</label>
              <select name="charge_type" className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none">
                <option value="Recurring">Recurring</option>
                <option value="One-Off">One-Off</option>
                <option value="Penalty">Penalty</option>
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col gap-1 w-1/2">
                <label className="font-label-md text-on-surface-variant">Default Amt (RM)</label>
                <input type="number" step="0.01" name="default_amount" required defaultValue="0" className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none" />
              </div>
              <div className="flex flex-col gap-1 w-1/2">
                <label className="font-label-md text-on-surface-variant">UOM</label>
                <input type="text" name="uom" required defaultValue="Month" className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-on-surface-variant">Description</label>
              <textarea name="description" rows={2} className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none"></textarea>
            </div>
            <button type="submit" className="btn-primary py-2.5 mt-2 font-label-md rounded-lg flex justify-center items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Charge
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
