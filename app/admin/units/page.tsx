import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { listPropertiesForUnits, listUnits } from "@/lib/unit-management";
import UnitsClient from "@/components/units/UnitsClient";
import { resolveActivePropertyId, shouldPersistProperty } from "@/lib/property-context";
import { PageHeader } from "@/components/admin/ui";
import { OPEN_STATUSES } from "@/lib/ticket-states";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UnitsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const searchParams = await props.searchParams;
  const urlPropertyId = searchParams.property as string | undefined;
  const cookiePropertyId = cookieStore.get("propmate_property_id")?.value;

  const properties = await listPropertiesForUnits();

  // Units are always managed one property at a time — there is no "all
  // properties" view. The active property comes from the SAME resolver the
  // top-bar switcher uses, so the header and the list can never disagree.
  const activePropertyId = resolveActivePropertyId(
    properties,
    cookiePropertyId,
    urlPropertyId
  );

  // Scope the query itself, so every filter and count downstream is already
  // confined to this property.
  const units = activePropertyId ? await listUnits(activePropertyId) : [];

  const activeProperty = properties.find((p) => p.property_id === activePropertyId) ?? null;

  /*
   * What each unit owes, and what is open against it (DEV-262).
   *
   * The card grid showed a unit's number, layout, size and status. Neither of
   * the two things that decide which unit a manager opens — the money and the
   * outstanding work — was on the screen at all, and a 240-unit tower is
   * roughly 37,000px of cards before you find either.
   *
   * Three cheap queries scoped to this property, reduced into lookups.
   */
  const unitIds = units.map((u) => u.unit_id);
  const [unpaid, openTickets, slips, unbilledLeases] = await Promise.all([
    unitIds.length
      ? prisma.invoice.findMany({
          where: {
            status: { notIn: ["Paid", "Inactive"] },
            lease: { unit_id: { in: unitIds } },
          },
          select: { total_amount: true, lease: { select: { unit_id: true } } },
        })
      : [],
    unitIds.length
      ? prisma.ticket.groupBy({
          by: ["unit_id"],
          where: { unit_id: { in: unitIds }, status: { in: OPEN_STATUSES } },
          _count: { _all: true },
        })
      : [],
    unitIds.length
      ? prisma.paymentTransaction.findMany({
          where: {
            transaction_status: "Pending",
            payment_method: "Bank transfer",
            invoice: { lease: { unit_id: { in: unitIds } } },
          },
          select: { invoice: { select: { lease: { select: { unit_id: true } } } } },
        })
      : [],
    // An active tenancy with no charges and no rent bills nothing — the unit
    // looks occupied and earning, and quietly is not.
    unitIds.length
      ? prisma.tenantLease.findMany({
          where: { unit_id: { in: unitIds }, status: "Active" },
          select: {
            unit_id: true,
            unit: { select: { monthly_rent: true } },
            lease_charges: { where: { is_active: true }, select: { amount: true, quantity: true } },
          },
        })
      : [],
  ]);

  const owesByUnit: Record<string, number> = {};
  for (const inv of unpaid) {
    const id = inv.lease?.unit_id;
    if (!id) continue;
    // Rule 6.
    owesByUnit[id] = (owesByUnit[id] ?? 0) + Number(inv.total_amount ?? 0);
  }

  const openByUnit: Record<string, { repairs: number; slips: number; unbilled: boolean }> = {};
  const bump = (id: string) => (openByUnit[id] ??= { repairs: 0, slips: 0, unbilled: false });
  for (const row of openTickets) {
    if (row.unit_id) bump(row.unit_id).repairs = row._count._all;
  }
  for (const s of slips) {
    const id = s.invoice?.lease?.unit_id;
    if (id) bump(id).slips += 1;
  }
  for (const l of unbilledLeases) {
    const charges = l.lease_charges.reduce(
      (sum, c) => sum + Number(c.amount ?? 0) * Number(c.quantity ?? 1),
      0
    );
    if (charges <= 0 && Number(l.unit?.monthly_rent ?? 0) <= 0) bump(l.unit_id).unbilled = true;
  }

  // If the resolved property is not what the cookie holds (a deep link, or a
  // first visit with no cookie yet), tell the client to persist it so the
  // universal context and this page agree from here on.
  const contextOutOfSync = shouldPersistProperty(activePropertyId, cookiePropertyId);

  // Prisma returns Decimal for area_sqft / monthly_rent. Passing those straight
  // into a Client Component makes React log "Only plain objects can be passed to
  // Client Components" for every unit on every render. Serialise here — this is
  // AGENTS.md Rule 6.
  const serialisedUnits = units.map((u) => ({
    unit_id: u.unit_id,
    property_id: u.property_id,
    unit_number: u.unit_number,
    unit_type: u.unit_type,
    floor_number: u.floor_number,
    area_sqft: Number(u.area_sqft),
    monthly_rent: Number(u.monthly_rent ?? 0),
    status: u.status,
    status_remark: (u as { status_remark?: string | null }).status_remark ?? null,
    property: u.property
      ? { property_id: u.property.property_id, property_name: u.property.property_name }
      : undefined,
    leases: (u.leases ?? []).map((l: any) => ({
      lease_id: l.lease_id,
      status: l.status,
      tenant: l.tenant
        ? {
            user_id: l.tenant.user_id,
            user_name: l.tenant.user_name,
            user_email: l.tenant.user_email,
            phone_number: l.tenant.phone_number ?? null,
          }
        : undefined,
    })),
  }));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Units"
        subtitle={
          activeProperty
            ? `Every unit in ${activeProperty.property_name}. Switch property from the selector in the top bar.`
            : "No properties yet — add a property before creating units."
        }
      />

      <UnitsClient
        initialUnits={serialisedUnits}
        owesByUnit={owesByUnit}
        openByUnit={openByUnit}
        properties={properties}
        activePropertyId={activePropertyId}
        activePropertyName={activeProperty?.property_name ?? null}
        contextOutOfSync={contextOutOfSync}
      />
    </div>
  );
}
