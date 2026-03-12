"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  exportElementToPdf,
  exportElementToPng,
  exportRowsAndElementToPdf,
  exportRowsToCsv,
  exportRowsToExcel,
  exportRowsToPdf,
} from "@/lib/exportUtils";
import { WeeklyClientData } from "@/lib/transform";
import { getWeekDateRange, getWeekMonth } from "@/lib/week";
import ExportMenu from "@/components/ExportMenu";

type ClientStatus = "active" | "engagement only" | "onboarding" | "paused";

interface MonthlyTotal {
  month: string;
  total: number;
  activeClients: number;
}

type GraphMode = "monthly" | "weekly";

interface ChartPoint {
  label: string;
  total: number;
  activeClients: number;
}

interface WeeklyLeadSummary {
  week: number;
  label: string;
  totalLeads: number;
  cappedLeads: number;
  activeClients: number;
  year: number;
}

function computeWeeklyLeadSummaries(
  weeklyData: WeeklyClientData[],
  maxWeek?: number,
  year?: number
): WeeklyLeadSummary[] {
  const aggregates = new Map<number, { totalLeads: number; cappedLeads: number; clients: Set<string> }>();

  weeklyData.forEach((client) => {
    Object.entries(client.weeks).forEach(([weekKey, leads = 0]) => {
      const week = Number.parseInt(weekKey, 10);
      if (!Number.isFinite(week)) return;
      if (typeof maxWeek === "number" && week > maxWeek) return;

      const statusAtWeek = client.statusByWeek?.[week] ?? client.status;
      const isActiveOrEngagement =
        statusAtWeek === "active" || statusAtWeek === "engagement only";
      if (isActiveOrEngagement) {
        const entry = aggregates.get(week) ?? {
          totalLeads: 0,
          cappedLeads: 0,
          clients: new Set<string>(),
        };

        entry.totalLeads += leads;
        entry.cappedLeads += Math.min(leads, 8);
        entry.clients.add(client.client);
        aggregates.set(week, entry);
      }
    });
  });

  return Array.from(aggregates.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, { totalLeads, cappedLeads, clients }]) => ({
      week,
      label: getWeekDateRange(week, year ?? new Date().getFullYear()),
      totalLeads,
      cappedLeads,
      activeClients: clients.size,
      year: year ?? new Date().getFullYear(),
    }));
}

interface MonthlyTotalsProps {
  totals: MonthlyTotal[];
  weeklyData: WeeklyClientData[];
  currentWeek?: number;
  currentYear?: number;
  selectedYear: number;
  onYearChange: (year: number) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const monthShort: Record<string, string> = {
  January: "Jan",
  February: "Feb",
  March: "Mar",
  April: "Apr",
  May: "May",
  June: "Jun",
  July: "Jul",
  August: "Aug",
  September: "Sep",
  October: "Oct",
  November: "Nov",
  December: "Dec",
};

const MONTH_ORDER = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const baseAvailableYear = 2024;
const availableYearsCurrentYear = new Date().getFullYear();
const availableYears = Array.from(
  { length: Math.max(1, availableYearsCurrentYear - baseAvailableYear + 1) },
  (_, index) => baseAvailableYear + index
);

function aggregateWeeklyFromWeeklyData(
  weeklyData: WeeklyClientData[],
  maxWeek?: number,
  year?: number
): ChartPoint[] {
  const weekTotals = new Map<number, number>();
  const weeklyClientSets = new Map<number, Set<string>>();

  weeklyData.forEach((client) => {
    Object.entries(client.weeks).forEach(([weekKey, leads]) => {
      const week = Number.parseInt(weekKey, 10);
      if (!Number.isFinite(week)) return;
      if (typeof maxWeek === "number" && week > maxWeek) return;

      weekTotals.set(week, (weekTotals.get(week) || 0) + (leads || 0));

      const statusAtWeek = client.statusByWeek?.[week] ?? client.status;
      if (statusAtWeek === "active" || statusAtWeek === "engagement only") {
        if (!weeklyClientSets.has(week)) {
          weeklyClientSets.set(week, new Set<string>());
        }
        weeklyClientSets.get(week)!.add(client.client);
      }
    });
  });

  return Array.from(weekTotals.keys())
    .filter((week) => typeof maxWeek !== "number" || week <= maxWeek)
    .sort((a, b) => a - b)
    .map((week) => ({
      label: getWeekDateRange(week, year ?? new Date().getFullYear()),
      total: weekTotals.get(week) || 0,
      activeClients: weeklyClientSets.get(week)?.size || 0,
    }));
}

export default function MonthlyTotals({
  totals,
  weeklyData,
  currentYear,
  selectedYear,
  onYearChange,
  onRefresh,
  refreshing,
  currentWeek,
}: MonthlyTotalsProps) {
  const [showActiveClients, setShowActiveClients] = useState(false);
  const [showAllYears, setShowAllYears] = useState(false);
  const [allYearsData, setAllYearsData] = useState<MonthlyTotal[]>([]);
  const [loadingAllYears, setLoadingAllYears] = useState(false);
  const [lineAnimationSeed, setLineAnimationSeed] = useState(0);
  const [graphMode, setGraphMode] = useState<GraphMode>("monthly");

  const waitForPaint = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

  const runMonthlyGraphExport = async (action: () => Promise<void>) => {
    const wasVisible = showActiveClients;

    if (!wasVisible) {
      setShowActiveClients(true);
      await waitForPaint();
    }

    try {
      await action();
    } finally {
      if (!wasVisible) {
        setShowActiveClients(false);
      }
    }
  };

  const effectiveGraphMode: GraphMode = showAllYears ? "monthly" : graphMode;

  const currentCalendarYear = new Date().getFullYear();
  const maxWeekForSelectedYear =
    selectedYear === currentCalendarYear ? currentWeek : undefined;

  const chartData = useMemo<ChartPoint[]>(() => {
    if (showAllYears) {
      return allYearsData.map((item) => ({
        label: item.month,
        total: item.total,
        activeClients: item.activeClients,
      }));
    }

    if (effectiveGraphMode === "weekly") {
      return aggregateWeeklyFromWeeklyData(
        weeklyData,
        maxWeekForSelectedYear,
        selectedYear
      );
    }

    return totals.map((item) => ({
      label: item.month,
      total: item.total,
      activeClients: item.activeClients,
    }));
  }, [showAllYears, allYearsData, effectiveGraphMode, weeklyData, totals]);

  const exportRows = useMemo(
    () =>
      chartData.map((item) => ({
        Period: item.label,
        Leads: item.total,
        "Avg Active Clients": item.activeClients,
      })),
    [chartData]
  );

  const weeklyLeadSummaries = useMemo(
    () =>
      computeWeeklyLeadSummaries(
        weeklyData,
        maxWeekForSelectedYear,
        selectedYear
      ),
    [weeklyData, maxWeekForSelectedYear, selectedYear]
  );

  const weeklyStats = useMemo(
    () =>
      weeklyLeadSummaries.map((summary) => {
        const avgNoCap =
          summary.activeClients > 0 ? summary.totalLeads / summary.activeClients : undefined;
        const avgCap =
          summary.activeClients > 0 ? summary.cappedLeads / summary.activeClients : undefined;
        return {
          ...summary,
          avgNoCap,
          avgCap,
        };
      }),
    [weeklyLeadSummaries]
  );

  const monthlyStats = useMemo(() => {
    const grouped = new Map<
      string,
      {
        monthLabel: string;
        noCapValues: number[];
        capValues: number[];
        activeValues: number[];
      }
    >();

    weeklyStats.forEach((stat) => {
      if (!stat.label) return;
      const month = getWeekMonth(stat.week, selectedYear);
      const entry = grouped.get(month) ?? {
        monthLabel: month,
        noCapValues: [],
        capValues: [],
        activeValues: [],
      };

      if (typeof stat.avgNoCap === "number" && Number.isFinite(stat.avgNoCap)) {
        entry.noCapValues.push(stat.avgNoCap);
      }
      if (typeof stat.avgCap === "number" && Number.isFinite(stat.avgCap)) {
        entry.capValues.push(stat.avgCap);
      }
      if (typeof stat.activeClients === "number" && stat.activeClients > 0) {
        entry.activeValues.push(stat.activeClients);
      }

      grouped.set(month, entry);
    });

    return Array.from(grouped.values())
      .map((entry) => ({
        month: entry.monthLabel,
        label: entry.monthLabel,
        avgNoCap:
          entry.noCapValues.length > 0
            ? entry.noCapValues.reduce((sum, value) => sum + value, 0) / entry.noCapValues.length
            : undefined,
        avgCap:
          entry.capValues.length > 0
            ? entry.capValues.reduce((sum, value) => sum + value, 0) / entry.capValues.length
            : undefined,
        avgActiveClients:
          entry.activeValues.length > 0
            ? entry.activeValues.reduce((sum, value) => sum + value, 0) / entry.activeValues.length
            : undefined,
      }))
      .sort(
        (a, b) =>
          MONTH_ORDER.indexOf(a.month as (typeof MONTH_ORDER)[number]) -
          MONTH_ORDER.indexOf(b.month as (typeof MONTH_ORDER)[number])
      );
  }, [weeklyStats, selectedYear]);

  const summaryLabelForMode = effectiveGraphMode === "weekly" ? "Week" : "Month";
  const modeSummaries = effectiveGraphMode === "weekly" ? weeklyStats : monthlyStats;
  const latestSummary = modeSummaries[modeSummaries.length - 1];
  const previousSummaries = modeSummaries
    .slice(0, -1)
    .reverse();

  const latestActiveAccounts =
    latestSummary && "activeClients" in latestSummary
      ? latestSummary.activeClients
      : latestSummary?.avgActiveClients ?? 0;

  const formatAverage = (value?: number) =>
    typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "-";

  const isTimelineView = showAllYears && chartData.length > 0;
  const timelineMinWidth = isTimelineView
    ? Math.max(chartData.length * 90, 960)
    : undefined;
  const xAxisConfig = isTimelineView
    ? {
        tick: { fontSize: 10 },
        angle: -45,
        textAnchor: "end" as const,
        interval: 0,
        height: 60,
      }
    : effectiveGraphMode === "weekly"
      ? { tick: { fontSize: 9 }, interval: 2, height: 40 }
      : { tick: { fontSize: 11 }, interval: 0, height: 32 };


  useEffect(() => {
    if (showAllYears && allYearsData.length === 0) {
      fetchAllYearsData();
    }
  }, [showAllYears]);

  const fetchAllYearsData = async () => {
    setLoadingAllYears(true);
    try {
      const currentYearValue = new Date().getFullYear();
      const earliestTimelineYear = 2024;
      const years: number[] = [];
      for (let year = earliestTimelineYear; year <= currentYearValue; year += 1) {
        years.push(year);
      }
      const chronologicalData: MonthlyTotal[] = [];

      // Fetch data for each year
      const promises = years.map(year => 
        fetch(`/api/leads?year=${year}`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      );
      
      const results = await Promise.all(promises);
      
      // Build chronological timeline
      results.forEach((result, index) => {
        const year = years[index];
        if (result?.monthlyTotals) {
          result.monthlyTotals.forEach((monthData: MonthlyTotal) => {
            chronologicalData.push({
              month: `${monthShort[monthData.month]} ${year}`,
              total: monthData.total,
              activeClients: monthData.activeClients,
            });
          });
        }
      });
      
      setAllYearsData(chronologicalData);
    } catch (error) {
      console.error("Error fetching all years data:", error);
    } finally {
      setLoadingAllYears(false);
    }
  };

  if (!totals || totals.length === 0) {
    return null;
  }

  return (
    <div id="monthly-totals-section" className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 mb-8 border border-transparent dark:border-slate-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          {effectiveGraphMode === "weekly" ? "Leads Per Week (All Clients)" : "Leads Per Month (All Clients)"} {showAllYears && "- Timeline from 2024"}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-700 dark:text-slate-300 flex items-center gap-2">
            <span className="font-medium">Year</span>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
              className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              disabled={showAllYears}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-700 dark:text-slate-300 flex items-center gap-2">
            <span className="font-medium">View</span>
            <select
              value={effectiveGraphMode}
              onChange={(e) => setGraphMode(e.target.value as GraphMode)}
              className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              disabled={showAllYears}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <button
            onClick={() => {
              setShowAllYears(!showAllYears);
              if (!showAllYears && allYearsData.length === 0) {
                fetchAllYearsData();
              }
            }}
            disabled={loadingAllYears}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showAllYears
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loadingAllYears ? "Loading..." : showAllYears ? "Current Year" : "View Timeline"}
          </button>
          <button
            onClick={() => {
              const next = !showActiveClients;
              if (next) {
                setLineAnimationSeed((prev) => prev + 1);
              }
              setShowActiveClients(next);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showActiveClients
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600"
            }`}
          >
            {showActiveClients ? "Hide" : "Show"} Avg Active Clients
          </button>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded transition disabled:opacity-50"
          >
            {refreshing ? "Loading..." : "Refresh"}
          </button>
            <ExportMenu
              options={[
                {
                  label: "Data CSV",
                  key: "monthly-data-csv",
                  action: () => exportRowsToCsv(exportRows, "monthly-leads-data"),
                },
                {
                  label: "Data Excel",
                  key: "monthly-data-xlsx",
                  action: () => exportRowsToExcel(exportRows, "monthly-leads-data"),
                },
                {
                  label: "Data PDF",
                  key: "monthly-data-pdf",
                  action: () => exportRowsToPdf(exportRows, "Monthly Leads Data", "monthly-leads-data"),
                },
                {
                  label: "Graph PNG",
                  key: "monthly-graph-png",
                  action: () => runMonthlyGraphExport(() => exportElementToPng("monthly-totals-section", "monthly-leads-full-view", effectiveGraphMode === "weekly" ? "Leads Per Week (All Clients)" : "Leads Per Month (All Clients)")),
                },
                {
                  label: "Graph PDF",
                  key: "monthly-graph-pdf",
                  action: () => runMonthlyGraphExport(() => exportElementToPdf("monthly-totals-section", effectiveGraphMode === "weekly" ? "Leads Per Week (All Clients)" : "Leads Per Month (All Clients)", "monthly-leads-full-view")),
                },
                {
                  label: "Data+Graph PDF",
                  key: "monthly-both-pdf",
                  action: () => runMonthlyGraphExport(() => exportRowsAndElementToPdf(exportRows, "monthly-totals-section", "Monthly Leads Summary", "monthly-leads-summary-report")),
                },
              ]}
            />
        </div>
      </div>

      <div
        id="monthly-totals-chart"
        className="h-72 w-full rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-2 mb-4"
      >
        <div className={`h-full w-full ${isTimelineView ? "overflow-x-auto" : ""}`}>
          <div
            className={`h-full ${isTimelineView ? "w-full" : ""}`}
            style={timelineMinWidth ? { minWidth: timelineMinWidth } : undefined}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 16, right: 12, left: 8, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" {...xAxisConfig} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  label={{ value: "Leads", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  hide={!showActiveClients}
                  tick={{ fontSize: 11 }}
                  label={
                    showActiveClients
                      ? { value: "Active Clients", angle: 90, position: "insideRight", style: { fontSize: 11 } }
                      : undefined
                  }
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} name="Leads" />
                {showActiveClients && (
                  <Line
                    key={`active-clients-line-${lineAnimationSeed}`}
                    yAxisId="right"
                    type="monotone"
                    dataKey="activeClients"
                    stroke="#9333ea"
                    strokeWidth={3}
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={900}
                    animationEasing="ease-in-out"
                    dot={{ fill: "#9333ea", r: 4 }}
                    activeDot={{ r: 5, fill: "#9333ea" }}
                    name="Avg Active Clients"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {effectiveGraphMode === "monthly" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {chartData.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="border border-gray-200 dark:border-slate-700 rounded-md p-3 bg-gray-50 dark:bg-slate-800"
            >
              <p className="text-sm text-gray-600 dark:text-slate-400">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{item.total}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Avg active clients: {item.activeClients}
              </p>
            </motion.div>
              ))}
            </div>
          )}
      
      <div className="mt-6 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Latest {summaryLabelForMode.toLocaleLowerCase()} avg (no cap)
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">
              {formatAverage(latestSummary?.avgNoCap)}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
              Active accounts: {latestActiveAccounts}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
              {summaryLabelForMode}: {latestSummary?.label ?? "—"}
            </p>
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Latest {summaryLabelForMode.toLocaleLowerCase()} avg (cap 8 leads/client)
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">
              {formatAverage(latestSummary?.avgCap)}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
              Cap per client: 8 leads
            </p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
              Active accounts: {latestActiveAccounts}
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
            Previous {summaryLabelForMode.toLocaleLowerCase()} averages
          </p>
          {previousSummaries.length > 0 ? (
            <div className="overflow-auto rounded-md border border-gray-200 dark:border-slate-800">
              <table className="min-w-full text-left text-sm text-gray-600 dark:text-slate-300">
                <thead className="bg-gray-100 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">{summaryLabelForMode}</th>
                    <th className="px-3 py-2 text-right">No Cap</th>
                    <th className="px-3 py-2 text-right">Cap 8</th>
                  </tr>
                </thead>
                <tbody>
                {previousSummaries.map((item) => (
                  <tr key={item.label} className="border-t border-gray-200 dark:border-slate-800">
                      <td className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-100">{item.label}</td>
                      <td className="px-3 py-2 text-right text-base font-semibold text-gray-900 dark:text-slate-100">{formatAverage(item.avgNoCap)}</td>
                      <td className="px-3 py-2 text-right text-base font-semibold text-gray-900 dark:text-slate-100">{formatAverage(item.avgCap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-slate-400">No previous data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
