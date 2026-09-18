import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { maskIdentityNumber } from "@/lib/visitor-status";
import { logoutAction } from "@/app/logout/actions";
import PasswordForm from "./PasswordForm";
import ContactForm from "./ContactForm";

export const dynamic = "force-dynamic";

/**
 * My Profile (DEV-189 redesign). Identity card at the top (name, email, IC -
 * office-managed), contact details the resident edits themselves, password,
 * and a sign-out that's reachable on a phone.
 */
export default async function ResidentProfilePage() {
  const sessionUser = await requireUser(["Resident"]);

  const user = await prisma.user.findUnique({
    where: { user_id: sessionUser.userId },
    select: {
      user_name: true,
      user_email: true,
      phone_number: true,
      ic_number: true,
      vehicle_plate: true,
      emergency_contact_name: true,
      emergency_contact_phone: true,
      tenant_leases: {
        where: { status: "Active" },
        take: 1,
        select: { unit: { select: { unit_number: true, property: { select: { property_name: true } } } } },
      },
    },
  });

  if (!user) return <div>Profile not found.</div>;
  const unit = user.tenant_leases[0]?.unit;
  const initials = user.user_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full">
      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-surface-container to-surface-container p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary text-black flex items-center justify-center text-2xl font-bold shrink-0">
          {initials || "?"}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-on-surface truncate">{user.user_name}</h1>
          <p className="text-sm text-on-surface/80 truncate">{user.user_email}</p>
          <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-primary">apartment</span>
            {unit ? `Unit ${unit.unit_number} · ${unit.property.property_name}` : "No active tenancy"}
          </p>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 flex flex-col gap-4 border border-outline-variant/40">
        <div>
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">contact_phone</span>
            Contact details
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">Keep these up to date so the office and the guardhouse can reach you.</p>
        </div>
        <ContactForm
          phone={user.phone_number ?? ""}
          plate={user.vehicle_plate ?? ""}
          emergencyName={user.emergency_contact_name ?? ""}
          emergencyPhone={user.emergency_contact_phone ?? ""}
        />
      </section>

      <section className="glass-card rounded-2xl p-5 flex flex-col gap-3 border border-outline-variant/40">
        <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
          Identity
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { k: "Full name", v: user.user_name },
            { k: "Email (login)", v: user.user_email },
            { k: "IC / passport", v: user.ic_number ? maskIdentityNumber(user.ic_number) : "Not on file" },
          ].map((f) => (
            <div key={f.k} className="rounded-xl bg-surface-container-high/60 p-3 min-w-0">
              <dt className="text-xs text-on-surface-variant">{f.k}</dt>
              <dd className="font-semibold text-on-surface truncate">{f.v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">lock</span>
          To change your name, email or IC, please contact the management office.
        </p>
      </section>

      <section className="glass-card rounded-2xl p-5 flex flex-col gap-3 border border-outline-variant/40">
        <div>
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">key</span>
            Password
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">You&apos;ll need your current password to set a new one.</p>
        </div>
        <PasswordForm />
      </section>

      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full py-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-300 font-semibold flex items-center justify-center gap-2 pressable"
        >
          <span className="material-symbols-outlined">logout</span>
          Sign out
        </button>
      </form>
    </div>
  );
}
