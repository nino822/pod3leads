"use client";

import { memo, useMemo } from "react";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type WeeklyAveragePoint = {
  week: number;
  avgNoCap: number;
  avgCap8: number;
  activeAccounts: number;
  engagementAccounts: number;
};

interface ContributorAverageChartProps {
  contributorName: string;
  roleLabel: "Poster" | "Copywriter";
  weeklyAverages: WeeklyAveragePoint[];
}

function ContributorAverageChart({
  contributorName,
  roleLabel,
  weeklyAverages,
}: ContributorAverageChartProps) {
  if (!weeklyAverages || weeklyAverages.length === 0) {
    return (
      <div className="py-2 px-4 text-center text-xs text-gray-500">
        No weekly average data available.
      </div>
    );
  }

  const chartData = useMemo(
    () =>
      weeklyAverages.map((point) => ({
        ...point,
        weekLabel: `W${point.week}`,
      })),
    [weeklyAverages]
  );

  return (
    <div className="py-2 px-4 bg-white border-t border-gray-100">
      <h4 className="text-xs font-semibold text-gray-600 mb-2">
        {contributorName} - Weekly Averages
      </h4>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 35 }}>
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={40}
          />
          <YAxis tick={{ fontSize: 10 }} width={30} />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === "avgNoCap") return [value.toFixed(2), "No cap"];
              if (name === "avgCap8") return [value.toFixed(2), "8 cap"];
              return [value, name];
            }}
            labelFormatter={(label, payload) => {
              const active = payload?.[0]?.payload?.activeAccounts ?? 0;
              const engagement = payload?.[0]?.payload?.engagementAccounts ?? 0;
              return `${label} | Active: ${active} | Eng: ${engagement}`;
            }}
            contentStyle={{ fontSize: "11px" }}
          />
          <Line
            type="monotone"
            dataKey="avgNoCap"
            stroke="#2563eb"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            name="No cap"
          />
          <Line
            type="monotone"
            dataKey="avgCap8"
            stroke="#ea580c"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            name="8 cap"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(ContributorAverageChart);
