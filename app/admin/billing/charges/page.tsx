import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import ChargeTable from "./ChargeTable";
import AddChargeForm from "./AddChargeForm";

export const dynamic = "force-dynamic";

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
        <ChargeTable charges={charges} />
        <AddChargeForm />
      </div>
    </div>
  );
}
