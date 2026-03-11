"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getWeekDateRange } from "@/lib/week";

type Status = "active" | "onboarding" | "engagement only" | "paused";

interface ClientChartProps {
  clientName: string;
  weeklyData: Record<number, number>;
  statusByWeek?: Record<number, Status>;
  posterByWeek?: Record<number, string>;
  currentPoster?: string;
  firstSeenWeek?: number;
}

export default function ClientChart({
  clientName,
  weeklyData,
  statusByWeek = {},
  posterByWeek = {},
  currentPoster,
  firstSeenWeek,
}: ClientChartProps) {
  // Convert weekly data to chart format
  const chartData = Object.entries(weeklyData)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([week, count]) => ({
      week: getWeekDateRange(parseInt(week)),
      weekNum: parseInt(week),
      leads: count,
      status: statusByWeek[parseInt(week)] || "active",
      poster: posterByWeek[parseInt(week)] || currentPoster || "-",
      isFirstSeen:
        firstSeenWeek !== undefined
          ? parseInt(week) === firstSeenWeek
          : false,
    }));
  const uniquePosters = Array.from(
    new Set(Object.values(posterByWeek).filter(Boolean))
  );
  const posterSummary =
    uniquePosters.length === 0
      ? currentPoster || "-"
      : uniquePosters.length === 1
      ? uniquePosters[0]
      : `Mixed (${uniquePosters.length})`;

  const firstWeekValue = firstSeenWeek ?? chartData[0]?.weekNum;

  const onboardingRanges = chartData
    .filter((point) => point.status === "onboarding")
    .map((point) => point.week);

  if (chartData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-slate-400">
        No data available for this client
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-slate-900">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">
        {clientName} - Weekly Leads Trend
      </h4>
      <p className="text-xs text-gray-600 dark:text-slate-400 mb-2">Poster: {posterSummary}</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          {onboardingRanges.map((weekLabel) => (
            <ReferenceArea
              key={`onboarding-${weekLabel}`}
              x1={weekLabel}
              x2={weekLabel}
              fill="#dbeafe"
              fillOpacity={0.8}
            />
          ))}

          <ReferenceLine
            x={`Week ${firstWeekValue}`}
            stroke="#9333ea"
            strokeDasharray="4 4"
            label={{
              value: "First Seen",
              position: "top",
              fill: "#6b21a8",
              fontSize: 10,
            }}
          />

          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number, name: string, entry: any) => {
              if (name === "leads") {
                return [`${value}`, "Leads"];
              }
              return [value, name];
            }}
            labelFormatter={(label, payload) => {
              const status = payload?.[0]?.payload?.status || "active";
              const poster = payload?.[0]?.payload?.poster || "-";
              return `${label} - ${status} | Poster: ${poster}`;
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="leads"
            stroke="#2563eb"
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              const dotKey = `dot-${payload?.weekNum ?? "na"}-${payload?.leads ?? "na"}`;
              if (payload?.isFirstSeen) {
                return (
                  <circle
                    key={dotKey}
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill="#9333ea"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                );
              }
              return <circle key={dotKey} cx={cx} cy={cy} r={4} fill="#2563eb" />;
            }}
            activeDot={{ r: 6 }}
            name="Leads"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
        Purple marker = first week appeared, blue shaded weeks = onboarding.
      </p>
    </div>
  );
}
