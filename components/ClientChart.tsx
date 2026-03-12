"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getWeekDateRange } from "@/lib/week";

type Status = "active" | "onboarding" | "engagement only" | "paused";

const statusColorMap: Record<Status, string> = {
  active: "#2563eb",
  onboarding: "#a855f7",
  "engagement only": "#facc15",
  paused: "#dc2626",
};

interface ClientChartProps {
  clientName: string;
  weeklyData: Record<number, number>;
  statusByWeek?: Record<number, Status>;
  posterByWeek?: Record<number, string>;
  currentPoster?: string;
  firstSeenWeek?: number;
  currentWeek?: number;
  year?: number;
}

export default function ClientChart({
  clientName,
  weeklyData,
  statusByWeek = {},
  posterByWeek = {},
  currentPoster,
  firstSeenWeek,
  currentWeek,
  year,
}: ClientChartProps) {
  const targetYear = year ?? new Date().getFullYear();
  // Convert weekly data to chart format
  const chartData = Object.entries(weeklyData)
    .filter(([weekStr]) => {
      const weekNum = parseInt(weekStr, 10);
      return currentWeek === undefined || weekNum <= currentWeek;
    })
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([week, count]) => {
      const weekNum = parseInt(week, 10);
      const status = statusByWeek[weekNum] || "active";
      const weekLabel = getWeekDateRange(weekNum, targetYear);
      return {
        week: weekLabel,
        weekNum,
        leads: count,
        status,
        poster: posterByWeek[weekNum] || currentPoster || "-",
        isFirstSeen: firstSeenWeek !== undefined ? weekNum === firstSeenWeek : false,
        onboardingLeads: status === "onboarding" ? count : null,
        activeLeads: status === "active" ? count : null,
        engagementLeads: status === "engagement only" ? count : null,
        pausedLeads: status === "paused" ? count : null,
      };
    });
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
  const firstWeekEntry = chartData.find((point) => point.isFirstSeen);

  const onboardingRanges = chartData
    .filter((point) => point.status === "onboarding")
    .map((point) => point.week);

  const statusSeries = [
    { key: "activeLeads", label: "Active", color: statusColorMap.active },
    { key: "engagementLeads", label: "Engagement", color: statusColorMap["engagement only"] },
    { key: "onboardingLeads", label: "Onboarding", color: statusColorMap.onboarding },
    { key: "pausedLeads", label: "Paused", color: statusColorMap.paused },
  ];

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
              fill="#ede9fe"
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
          {firstWeekEntry && (
            <ReferenceDot
              x={firstWeekEntry.week}
              y={firstWeekEntry.leads}
              r={6}
              fill="#9333ea"
              stroke="#ffffff"
              strokeWidth={2}
            />
          )}

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
            formatter={(value: number) => [`${value}`, "Leads"]}
            labelFormatter={(label, payload) => {
              const payloadEntry =
                payload?.find((entry) => entry?.value !== null && entry?.value !== undefined) ??
                payload?.[0];
              const status = payloadEntry?.payload?.status || "active";
              const poster = payloadEntry?.payload?.poster || "-";
              return `${label} - ${status} | Poster: ${poster}`;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {statusSeries.map((series) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              stroke={series.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: series.color, stroke: series.color }}
              legendType="circle"
              name={`${series.label} leads`}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
        Purple marker = first week appeared, violet shaded weeks = onboarding; line colors follow status (violet=onboarding, blue=active, yellow=engagement, red=paused).
      </p>
    </div>
  );
}
