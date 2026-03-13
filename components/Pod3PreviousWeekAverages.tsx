import { getWeekDateRange } from "@/lib/week";
import { WeeklyClientData } from "@/lib/transform";
import React from "react";

function computePod3WeeklySummaries(weeklyData: WeeklyClientData[], year?: number) {
  // Find all weeks with at least one active account
  const weekMap = new Map<number, { totalLeads: number; cappedLeads: number; activeCount: number }>();
  weeklyData.forEach((client) => {
    Object.entries(client.weeks).forEach(([weekKey, leads]) => {
      const week = Number(weekKey);
      if (!Number.isFinite(week)) return;
      const statusAtWeek = client.statusByWeek?.[week] ?? client.status;
      if (statusAtWeek === "active") {
        const entry = weekMap.get(week) ?? { totalLeads: 0, cappedLeads: 0, activeCount: 0 };
        entry.totalLeads += leads || 0;
        entry.cappedLeads += Math.min(leads || 0, 8);
        entry.activeCount += 1;
        weekMap.set(week, entry);
      }
    });
  });
  // Sort by week descending
  return Array.from(weekMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([week, { totalLeads, cappedLeads, activeCount }]) => ({
      week,
      label: getWeekDateRange(week, year ?? new Date().getFullYear()),
      avgNoCap: activeCount > 0 ? totalLeads / activeCount : undefined,
      avgCap: activeCount > 0 ? cappedLeads / activeCount : undefined,
    }));
}

export default function Pod3PreviousWeekAverages({ weeklyData }: { weeklyData: WeeklyClientData[] }) {
  const previousSummaries = computePod3WeeklySummaries(weeklyData).slice(1, 11); // skip latest week, show 10 previous
  return (
    <div className="overflow-auto rounded-md border border-gray-200 dark:border-slate-800">
      <table className="min-w-full text-left text-sm text-gray-600 dark:text-slate-300">
        <thead className="bg-gray-100 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-gray-500 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2">Week</th>
            <th className="px-3 py-2 text-right">No Cap</th>
            <th className="px-3 py-2 text-right">Cap 8</th>
          </tr>
        </thead>
        <tbody>
          {previousSummaries.map((item) => (
            <tr key={item.label} className="border-t border-gray-200 dark:border-slate-800">
              <td className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-100">{item.label}</td>
              <td className="px-3 py-2 text-right text-base font-semibold text-gray-900 dark:text-slate-100">{item.avgNoCap !== undefined ? item.avgNoCap.toFixed(2) : '-'}</td>
              <td className="px-3 py-2 text-right text-base font-semibold text-gray-900 dark:text-slate-100">{item.avgCap !== undefined ? item.avgCap.toFixed(2) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}