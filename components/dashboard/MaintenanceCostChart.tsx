"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: { month: string; cost: number }[];
};

export default function MaintenanceCostChart({ data }: Props) {
  // Format the currency for the Y-axis and Tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <h3 className="text-title-md font-semibold text-on-surface mb-6">
        Overall Facility Maintenance Cost
      </h3>
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
          >
            <CartesianGrid stroke="#4a4455" strokeDasharray="3 3" opacity={0.4} vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={{ stroke: "#4a4455" }}
              tickLine={false}
              tick={{ fill: "#cac4d0", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={{ stroke: "#4a4455" }}
              tickLine={false}
              tick={{ fill: "#cac4d0", fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
              width={85}
            />
            <Tooltip
              formatter={(value: any) => [formatCurrency(Number(value)), "Cost"]}
              contentStyle={{
                backgroundColor: "#1d1b26",
                borderColor: "#4a4455",
                borderRadius: "12px",
                color: "#e6e1e5",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              }}
              labelStyle={{ color: "#e6e1e5", fontWeight: 600, marginBottom: "4px" }}
              itemStyle={{ color: "#d0bcff" }}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#a855f7"
              strokeWidth={3}
              dot={{ r: 5, fill: "#a855f7", stroke: "#ffffff", strokeWidth: 2 }}
              activeDot={{ r: 7, fill: "#c084fc", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
