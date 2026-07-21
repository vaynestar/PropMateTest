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
      <h3 className="text-title-md font-semibold text-primary-900 dark:text-primary-100 mb-6">
        Overall Facility Maintenance Cost
      </h3>
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              dy={10}
              stroke="var(--color-primary-500)"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
              stroke="var(--color-primary-500)"
              width={80}
            />
            <Tooltip
              formatter={(value: any) => [formatCurrency(Number(value)), "Cost"]}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-primary-200)",
                borderRadius: "8px",
                color: "var(--color-primary-900)",
              }}
              itemStyle={{ color: "var(--color-primary-600)" }}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="var(--color-primary-500)"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: "var(--color-primary-600)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
