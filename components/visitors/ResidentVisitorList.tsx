"use client";

import { useState, useTransition } from "react";
import VisitorPassModal from "@/components/visitors/VisitorPassModal";
import { normaliseVisitorStatus, visitorStatus } from "@/lib/visitor-status";
import { shortDate } from "@/lib/short-date";
import { cancelVisitorPass } from "@/app/resident/visitors/actions";

interface ResidentVisitorRecord {
  visitor_id: string;
  visitor_name: string;
  visitor_ic_no: string;
  visitor_type?: string | null;
  destination?: string | null;
  vehicle_plate?: string | null;
  visit_purpose?: string | null;
  visit_date?: Date | string | null;
  visit_iso?: string | null;
  status?: string | null;
  contact_no?: string | null;
  property?: { property_name: string } | null;
  lease?: {
    unit?: {
      unit_number: string;
      property?: { property_name: string } | null;
    };
    tenant?: { user_name: string };
  } | null;
}

type Group = "upcoming" | "onsite" | "past";

/**
 * Resident visitor list (DEV-189 redesign). Upcoming / On site / Past tabs.
 * A card shows who, when (Today / Tomorrow / date), why and the car plate,
 * with one "Show pass" button (the QR opens full-screen for the guard) and
 * "Cancel" for passes not yet used. Passes whose date has gone by without a
 * visit are shown as Expired under Past.
 */
export default function ResidentVisitorList({ visitors, today }: { visitors: ResidentVisitorRecord[]; today: string }) {
  const [selectedPass, setSelectedPass] = useState<ResidentVisitorRecord | null>(null);
  const [pending, start] = useTransition();
  const tomorrow = (() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  /*
   * These three tests compared the raw column with "Approved", so a row still
   * carrying a legacy spelling the vocabulary folds into Approved - "Pending",
   * lower-case "approved" - was filed under Past and shown no QR pass at all
   * (R23/D-35). Normalised first, like every other screen.
   */
  const stateOf = (v: ResidentVisitorRecord) => normaliseVisitorStatus(v.status);

  const groupOf = (v: ResidentVisitorRecord): Group => {
    const state = stateOf(v);
    if (state === "Checked In") return "onsite";
    if (state === "Approved" && (v.visit_iso ?? "") >= today) return "upcoming";
    return "past";
  };
  const groups: Record<Group, ResidentVisitorRecord[]> = { upcoming: [], onsite: [], past: [] };
  visitors.forEach((v) => groups[groupOf(v)].push(v));
  groups.upcoming.sort((a, b) => (a.visit_iso ?? "").localeCompare(b.visit_iso ?? ""));

  const [tab, setTab] = useState<Group>(groups.onsite.length ? "onsite" : groups.upcoming.length ? "upcoming" : "past");
  const shown = groups[tab];

  const tabs: { id: Group; label: string }[] = [
    { id: "upcoming", label: "Upcoming" },
    { id: "onsite", label: "On site" },
    { id: "past", label: "Past" },
  ];

  const cancel = (id: string) => {
    if (!confirm("Cancel this visitor pass? The QR code will stop working.")) return;
    start(async () => {
      try {
        const res = await cancelVisitorPass(id);
        if (res?.error) alert(res.error);
      } catch {
        alert("Couldn't reach the server. Check your connection and try again.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1.5 bg-surface-container-high p-1.5 rounded-2xl border border-outline-variant/40">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all pressable ${
              tab === t.id ? "bg-primary text-black shadow" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t.label}
            <span className={`text-[11px] px-1.5 rounded-full ${tab === t.id ? "bg-black/20" : "bg-surface-container-highest"}`}>
              {groups[t.id].length}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[36px] opacity-50">
            {tab === "upcoming" ? "event_available" : tab === "onsite" ? "sensors_off" : "history"}
          </span>
          <p className="text-sm mt-1">
            {tab === "upcoming"
              ? "No visitors expected. Create a pass above when someone's coming."
              : tab === "onsite"
              ? "Nobody is checked in for you right now."
              : "No past visits yet."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shown.map((v) => {
          const iso = v.visit_iso ?? "";
          const expired = stateOf(v) === "Approved" && iso < today;
          const meta = visitorStatus(v.status);
          const when = iso === today ? "Today" : iso === tomorrow ? "Tomorrow" : iso ? shortDate(iso, true) : "—";
          const usable = stateOf(v) === "Approved" && !expired;
          return (
            <div
              key={v.visitor_id}
              className={`glass-card rounded-2xl border p-4 flex flex-col gap-3 ${
                tab === "past" ? "border-outline-variant/30" : "border-primary/35"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center font-bold shrink-0">
                  {v.visitor_name.trim().slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  {/* truncate cut long guest names on a phone - DEV-169 fixed
                      this on the admin side only (R13). It wraps instead. */}
                  <h3 className="font-bold text-on-surface text-base break-words leading-tight">{v.visitor_name}</h3>
                  <p className="text-xs text-on-surface-variant truncate">{v.visit_purpose || "Visiting"}</p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${
                    expired ? "bg-surface-container-highest text-on-surface-variant border-outline-variant/60" : meta.chip
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{expired ? "event_busy" : meta.icon}</span>
                  {expired ? "Expired" : meta.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border ${
                  tab === "past" ? "border-outline-variant/40 text-on-surface/70" : "bg-sky-500/15 border-sky-400/40 text-sky-200"
                }`}>
                  <span className="material-symbols-outlined text-[15px]">event</span>
                  {when}
                </span>
                {v.vehicle_plate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border border-amber-400/40 bg-amber-500/10 text-amber-200 uppercase">
                    <span className="material-symbols-outlined text-[15px]">directions_car</span>
                    {v.vehicle_plate}
                  </span>
                )}
              </div>

              {(usable || v.status === "Checked In") && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedPass(v)}
                    className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 pressable"
                  >
                    <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                    Show pass
                  </button>
                  {usable && (
                    <button
                      type="button"
                      onClick={() => cancel(v.visitor_id)}
                      disabled={pending}
                      className="px-3 py-2.5 rounded-xl text-sm font-semibold border border-rose-500/40 bg-rose-500/10 text-rose-300 disabled:opacity-50 pressable"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedPass && <VisitorPassModal visitor={selectedPass} onClose={() => setSelectedPass(null)} />}
    </div>
  );
}
