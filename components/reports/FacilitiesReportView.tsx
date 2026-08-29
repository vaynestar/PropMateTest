"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface FacilitiesReportViewProps {
  data: any;
}

const FACILITY_COLORS = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#f43f5e", "#a78bfa"];

export default function FacilitiesReportView({ data }: FacilitiesReportViewProps) {
  const { facilities } = data;
  const { amenityUsage, timeSlotDistribution } = facilities;

  return (
    <div className="space-y-6">
      {/* 4 Facility KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-on-surface-variant font-medium block">Total Reservations</span>
          <span className="text-2xl font-bold text-white mt-1 block">
            {facilities.totalBookings}
          </span>
          <span className="text-[11px] text-on-surface-variant mt-1 block">Resident amenity bookings</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-emerald-400 font-medium block">Cumulative Hours Reserved</span>
          <span className="text-2xl font-mono font-bold text-emerald-300 mt-1 block">
            {facilities.totalHours} hrs
          </span>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">Total booked facility duration</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-primary font-medium block">Confirmed Bookings</span>
          <span className="text-2xl font-bold text-primary mt-1 block">
            {facilities.confirmedCount}
          </span>
          <span className="text-[11px] text-on-surface-variant mt-1 block">Approved & completed sessions</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-on-surface-variant font-medium block">Active Amenities</span>
          <span className="text-2xl font-bold text-white mt-1 block">
            {amenityUsage?.length || 0}
          </span>
          <span className="text-[11px] text-on-surface-variant mt-1 block">Bookable facility types</span>
        </div>
      </div>

      {/* 2 Visualizations: Amenity Hours Bar Chart & Time Slot Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hours Booked by Facility (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <div className="pb-3 border-b border-outline-variant/30">
            <h3 className="text-sm font-bold text-white">Facility Utilization by Hours</h3>
            <p className="text-[11px] text-on-surface-variant">Cumulative hours reserved per amenity</p>
          </div>

          <div className="h-64 w-full pt-4">
            {amenityUsage && amenityUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amenityUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161b26",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                    formatter={(val: any) => [`${val} hours`, "Total Hours"]}
                  />
                  <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                    {amenityUsage.map((entry: any, index: number) => (
                      <Cell key={`fac-${index}`} fill={FACILITY_COLORS[index % FACILITY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-on-surface-variant">
                No facility bookings logged for this timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Peak Hours Heatmap (1 Col) */}
        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <div className="pb-3 border-b border-outline-variant/30">
            <h3 className="text-sm font-bold text-white">Peak Booking Time Slots</h3>
            <p className="text-[11px] text-on-surface-variant">Demand distribution across day parts</p>
          </div>

          <div className="space-y-3.5 my-auto py-2">
            {timeSlotDistribution?.map((slot: any, idx: number) => {
              const total = facilities.totalBookings || 1;
              const pct = Math.round((slot.count / total) * 100);

              return (
                <div key={idx} className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{slot.slot}</span>
                    <span className="font-mono text-primary font-bold">{slot.count} bookings ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-surface-container-high/50 border border-outline-variant/30 text-[11px] text-on-surface-variant">
            💡 Evening slots (17:00 – 22:00) typically record the highest resident demand.
          </div>
        </div>
      </div>

      {/* Amenity Breakdown Table */}
      <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60">
        <div className="pb-3 border-b border-outline-variant/30">
          <h3 className="text-sm font-bold text-white">Amenity Performance Summary</h3>
          <p className="text-[11px] text-on-surface-variant">Detailed reservation count and hours per facility</p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-lowest text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-outline-variant/60">
              <tr>
                <th className="px-4 py-2.5">Amenity Name</th>
                <th className="px-4 py-2.5">Total Bookings</th>
                <th className="px-4 py-2.5">Cumulative Hours</th>
                <th className="px-4 py-2.5 text-right">Utilization Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {amenityUsage && amenityUsage.length > 0 ? (
                amenityUsage.map((f: any, idx: number) => {
                  const totalH = facilities.totalHours || 1;
                  const sharePct = Math.round((f.hours / totalH) * 100);

                  return (
                    <tr key={idx} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{f.name}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{f.count} bookings</td>
                      <td className="px-4 py-3 font-mono text-on-surface">{f.hours} hours</td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                          {sharePct}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-on-surface-variant">
                    No amenity records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
