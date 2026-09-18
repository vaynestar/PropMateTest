import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getResidentPortalData } from "@/lib/resident";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** @db.Date values are UTC midnight - read the stored calendar date. */
function dateOf(d: Date | null) {
  if (!d) return null;
  const x = new Date(d);
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

function tenure(from: Date, to: Date | null) {
  const a = new Date(from);
  const b = to ? new Date(to) : new Date();
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months--;
  months = Math.max(0, months);
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y && !m) return "Less than a month";
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo` : ""].filter(Boolean).join(" ");
}

const rm = (n: number) => "RM " + n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * My Unit (DEV-189 redesign). A hero card for the home itself, the tenancy
 * (since when, how long, until when), the unit's facts as icon tiles, and
 * shortcuts to what a resident does about their unit.
 */
export default async function ResidentUnitPage() {
  const user = await getSessionUser();
  const { lease } = await getResidentPortalData(user!.userId);

  if (!lease) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
        <span className="material-symbols-outlined text-4xl text-amber-400">home_work</span>
        <p className="font-semibold text-on-surface">No active tenancy</p>
        <p className="text-sm">Your account isn&apos;t linked to a unit yet. Please contact the management office.</p>
      </div>
    );
  }

  const unit = lease.unit;
  const p = unit.property;
  // The stored address often already ends with postcode, city and state - only add what it's missing.
  const tail = [[p.postal_code, p.city].filter(Boolean).join(" "), p.state].filter(
    (part) => part && !p.address.toLowerCase().includes(String(part).toLowerCase())
  );
  const address = [p.address, ...tail].join(", ");
  const facts = [
    { icon: "category", label: "Unit type", value: unit.unit_type },
    { icon: "stairs", label: "Floor", value: `Level ${unit.floor_number}` },
    { icon: "square_foot", label: "Built-up", value: `${Number(unit.area_sqft).toLocaleString("en-MY")} sq ft` },
    { icon: "payments", label: "Monthly rent", value: rm(Number(unit.monthly_rent)) },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full">
      <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/25 via-surface-container to-surface-container p-5">
        <span aria-hidden className="material-symbols-outlined absolute -right-4 -bottom-6 text-[140px] text-primary/10">apartment</span>
        <p className="text-[11px] uppercase tracking-widest font-semibold text-on-surface-variant">My home</p>
        <h1 className="text-4xl font-bold text-on-surface tracking-tight mt-1">{unit.unit_number}</h1>
        <p className="text-base font-semibold text-on-surface/90 mt-1">{p.property_name}</p>
        <p className="text-xs text-on-surface-variant mt-2 flex items-start gap-1 max-w-[85%]">
          <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
          {address}
        </p>
        <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold px-2.5 py-1 rounded-full border bg-emerald-500/15 text-emerald-200 border-emerald-400/40">
          <span className="material-symbols-outlined text-[14px]">verified</span>
          Active tenancy
        </span>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {[
          { label: "Moved in", value: dateOf(lease.move_in_date) ?? "—" },
          { label: "Staying", value: tenure(lease.move_in_date, lease.move_out_date) },
          { label: "Lease ends", value: dateOf(lease.move_out_date) ?? "Ongoing" },
        ].map((f) => (
          <div key={f.label} className="glass-card rounded-2xl p-3 border border-outline-variant/40 text-center">
            <p className="text-[11px] text-on-surface-variant">{f.label}</p>
            <p className="text-sm font-bold text-on-surface mt-0.5">{f.value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3">
        {facts.map((f) => (
          <div key={f.label} className="glass-card rounded-2xl p-4 border border-outline-variant/40 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">{f.icon}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-on-surface-variant">{f.label}</p>
              <p className="text-sm font-bold text-on-surface truncate">{f.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-on-surface">For your unit</h2>
        {[
          { href: "/resident/invoices", icon: "receipt_long", label: "Bills and payments" },
          { href: "/resident/maintenance", icon: "build_circle", label: "Report a problem" },
          { href: "/resident/visitors", icon: "badge", label: "Visitor passes" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="glass-card rounded-2xl p-4 border border-outline-variant/40 hover:border-primary/50 flex items-center gap-3 pressable"
          >
            <span className="material-symbols-outlined text-primary">{l.icon}</span>
            <span className="flex-1 text-sm font-semibold text-on-surface">{l.label}</span>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
