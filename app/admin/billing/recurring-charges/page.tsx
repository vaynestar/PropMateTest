import { getRecurringChargesData } from "@/app/admin/billing/recurring-charges/actions";
import RecurringChargesClient from "@/components/billing/RecurringChargesClient";

export const metadata = {
  title: "Recurring Lease Charges - PropMate Admin",
};

export default async function RecurringChargesPage() {
  const { leases, chargeMasters, properties } = await getRecurringChargesData();

  return (
    <div className="w-full">
      <RecurringChargesClient leases={leases} chargeMasters={chargeMasters} properties={properties} />
    </div>
  );
}
