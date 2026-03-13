"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { getWeekDateRange, getWeekEndDate, getWeekStartDate, getWeekNumberForDate } from "@/lib/week";
import { AnimatePresence, motion } from "framer-motion";
import ContributorAverageChart from "./ContributorAverageChart";
import {
  exportElementToPdf,
  exportElementToPng,
  exportRowsAndElementToPdf,
  exportRowsToCsv,
  exportRowsToExcel,
  exportRowsToPdf,
  exportAtRiskAccountsPdf,
  exportAtRiskAccountsPng,
} from "@/lib/exportUtils";
import ExportMenu from "@/components/ExportMenu";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WeeklyClientData } from "@/lib/transform";

type RoleTab = "posters" | "copywriters";

const slugifyClientName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type ContributorPerformance = {
  name: string;
  totalLeads: number;
  uniqueAccounts: number;
  accountWeeks: number;
  avgLeadsPerAccountWeek: number;
  currentActiveAccounts: number;
  currentEngagementAccounts: number;
  avgLeadsCurrentNoCap: number;
  avgLeadsCurrentCap8: number;
  avgLeadsWeek1ToCurrentNoCap: number;
  avgLeadsWeek1ToCurrentCap8: number;
  weeklyAverages: Array<{
    week: number;
    avgNoCap: number;
    avgCap8: number;
    activeAccounts: number;
    engagementAccounts: number;
  }>;
  improvingRate: number;
  worseningRate: number;
  isCurrentRecent: boolean;
  improvingAccounts: string[];
  decliningAccounts: string[];
};

type AtRiskAccount = {
  client: string;
  currentStatus: "active" | "onboarding" | "engagement only" | "paused";
  recentAvg: number;
  previousAvg: number;
  delta: number;
  slope: number;
  poster?: string;
  copywriter?: string;
  weeklyTrend: Array<{
    week: number;
    leads: number;
    status: "active" | "onboarding" | "engagement only" | "paused";
  }>;
};

const statusChartColorMap: Record<AtRiskAccount["currentStatus"], string> = {
  active: "#2563eb",
  onboarding: "#8b5cf6",
  "engagement only": "#fbbf24",
  paused: "#94a3b8",
};

type ActivityStatus = "active" | "engagement only";

type LowLeadAccount = {
  client: string;
  status: ActivityStatus;
  latestWeek: number;
  latestLeads: number;
  consecutiveWeeks: number;
  noLeadDays: number;
  displayWeeks: number;
  weeklyData: WeeklyClientData;
  lastLeadLabel: string;
};

type LineConfig = {
  key: string;
  label: string;
  clientName: string;
  color: string;
};

interface TeamPerformanceProps {
  data: {
    posters: ContributorPerformance[];
    copywriters: ContributorPerformance[];
  };
  weeklyData: WeeklyClientData[];
  atRiskAccounts: AtRiskAccount[];
  selectedYear?: number;
}

export default function TeamPerformance({
  data,
  weeklyData,
  atRiskAccounts,
  selectedYear,
}: TeamPerformanceProps) {
  const showAtRiskAccounts = selectedYear !== 2025;
  const [tab, setTab] = useState<RoleTab>("posters");
  const [hideInactiveRecent, setHideInactiveRecent] = useState(false);
  const [expandedContributors, setExpandedContributors] = useState<Set<string>>(new Set());
  const [atRiskCriteria, setAtRiskCriteria] = useState({
    minAvgLeadsPerWeek: "",
    onlyLowerThanPrevious: true,
  });
  const [minNoLeadDays, setMinNoLeadDays] = useState(0);
  const [minNoLeadDaysInput, setMinNoLeadDaysInput] = useState("0");
  const [lowLeadStatusFilter, setLowLeadStatusFilter] = useState<Record<ActivityStatus, boolean>>({
    active: true,
    "engagement only": true,
  });
  const [hoverTooltip, setHoverTooltip] = useState<{
    visible: boolean;
    title: string;
    accounts: string[];
    x: number;
    y: number;
    placeBelow: boolean;
    key: string;
  }>({
    visible: false,
    title: "",
    accounts: [],
    x: 0,
    y: 0,
    placeBelow: false,
    key: "",
  });
  const accountsPopoverRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const toggleAccountsPopover = (
    event: React.MouseEvent<HTMLElement>,
    title: string,
    accounts: string[],
    popoverKey: string
  ) => {
    event.stopPropagation();

    if (hoverTooltip.visible && hoverTooltip.key === popoverKey) {
      setHoverTooltip((prev) => ({ ...prev, visible: false, key: "" }));
      return;
    }

    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    const tooltipWidth = 300;
    const nextX = Math.min(Math.max(12, event.clientX + 12), viewportWidth - tooltipWidth - 12);
    const placeBelow = event.clientY < 120;

    setHoverTooltip({
      visible: true,
      title,
      accounts,
      x: nextX,
      y: placeBelow ? event.clientY + 14 : event.clientY - 10,
      placeBelow,
      key: popoverKey,
    });
  };

  useEffect(() => {
    if (!hoverTooltip.visible) return;

    const onDocumentPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const clickedTrigger = target.closest("[data-accounts-popover-trigger='true']");
      const clickedPopover = accountsPopoverRef.current?.contains(target);
      if (clickedTrigger || clickedPopover) return;

      setHoverTooltip((prev) => ({ ...prev, visible: false, key: "" }));
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHoverTooltip((prev) => ({ ...prev, visible: false, key: "" }));
      }
    };

    document.addEventListener("mousedown", onDocumentPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onDocumentPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [hoverTooltip.visible]);


  const toggleContributorChart = (name: string) => {
    const key = `${tab}:${name}`;
    setExpandedContributors((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Pod 3 overall latest week avg (no cap) and (cap 8)
  const getPod3LatestWeekAverages = () => {
    if (!weeklyData || weeklyData.length === 0) return { avgNoCap: undefined, avgCap: undefined, count: 0 };
    // Find the latest week number with any active account
    let maxWeek = 0;
    weeklyData.forEach((client) => {
      Object.entries(client.weeks).forEach(([weekKey, leads]) => {
        const week = Number(weekKey);
        if (!Number.isFinite(week)) return;
        const statusAtWeek = client.statusByWeek?.[week] ?? client.status;
        if (statusAtWeek === "active") {
          if (leads !== undefined) {
            maxWeek = Math.max(maxWeek, week);
          }
        }
      });
    });
    if (!maxWeek) return { avgNoCap: undefined, avgCap: undefined, count: 0 };
    // Collect all active accounts for that week
    const activeClients = weeklyData.filter((client) => {
      const statusAtWeek = client.statusByWeek?.[maxWeek] ?? client.status;
      return statusAtWeek === "active";
    });
    const activeCount = activeClients.length;
    const totalLeads = activeClients.reduce((sum, client) => sum + (client.weeks[maxWeek] || 0), 0);
    const cappedLeads = activeClients.reduce((sum, client) => sum + Math.min(client.weeks[maxWeek] || 0, 8), 0);
    return {
      avgNoCap: activeCount > 0 ? totalLeads / activeCount : undefined,
      avgCap: activeCount > 0 ? cappedLeads / activeCount : undefined,
      count: activeCount,
    };
  };
  const pod3Latest = getPod3LatestWeekAverages();
  const tableRows = useMemo(() => {
    const rows = tab === "posters" ? data.posters : data.copywriters;
    const normalizedRows = (rows || []).map((row) => ({
      ...row,
      isCurrentRecent: Boolean(row.isCurrentRecent),
      currentActiveAccounts: Number(row.currentActiveAccounts || 0),
      currentEngagementAccounts: Number(row.currentEngagementAccounts || 0),
      avgLeadsCurrentNoCap: Number(row.avgLeadsCurrentNoCap || 0),
      avgLeadsCurrentCap8: Number(row.avgLeadsCurrentCap8 || 0),
      avgLeadsWeek1ToCurrentNoCap: Number(row.avgLeadsWeek1ToCurrentNoCap || 0),
      avgLeadsWeek1ToCurrentCap8: Number(row.avgLeadsWeek1ToCurrentCap8 || 0),
      weeklyAverages: Array.isArray(row.weeklyAverages) ? row.weeklyAverages : [],
      improvingAccounts: Array.isArray(row.improvingAccounts) ? row.improvingAccounts : [],
      decliningAccounts: Array.isArray(row.decliningAccounts) ? row.decliningAccounts : [],
    }));

    if (!hideInactiveRecent) return normalizedRows;
    return normalizedRows.filter((row) => row.isCurrentRecent);
  }, [tab, data.posters, data.copywriters, hideInactiveRecent]);

  const teamExportRows = useMemo(
    () =>
      tableRows.map((row) => ({
        Contributor: row.name,
        "Active / Engaged Accounts": `${row.currentActiveAccounts}/${row.currentEngagementAccounts}`,
        "Current Avg Leads (No Limit)": row.avgLeadsCurrentNoCap,
        "Current Avg Leads (8 Max)": row.avgLeadsCurrentCap8,
        "Avg Leads from Week 1 (No Limit)": row.avgLeadsWeek1ToCurrentNoCap,
        "Avg Leads from Week 1 (8 Max)": row.avgLeadsWeek1ToCurrentCap8,
        "Accounts Improving (%)": `${Number(row.improvingRate || 0).toFixed(1)}%`,
        "Accounts Declining (%)": `${Number(row.worseningRate || 0).toFixed(1)}%`,
      })),
    [tableRows]
  );

    const filteredAtRiskAccounts = useMemo(() => {
      const minParsed = Number.parseFloat(atRiskCriteria.minAvgLeadsPerWeek);
      const minAvg = Number.isFinite(minParsed) ? Math.max(0, minParsed) : 0;

      return atRiskAccounts.filter((account) => {
      const recentAvg = Number(account.recentAvg || 0);
      const previousAvg = Number(account.previousAvg || 0);
      const inRange = recentAvg >= minAvg;
      const lowerThanPrevious = recentAvg < previousAvg;

      if (atRiskCriteria.onlyLowerThanPrevious) {
        return inRange && lowerThanPrevious;
      }

      return inRange;
    });
    }, [
      atRiskAccounts,
      atRiskCriteria.minAvgLeadsPerWeek,
      atRiskCriteria.onlyLowerThanPrevious,
    ]);

    const resolvedYear = selectedYear ?? new Date().getFullYear();
    const linePalette = [
      "#2563eb",
      "#0ea5e9",
      "#22c55e",
      "#f97316",
      "#e11d48",
      "#a855f7",
      "#10b981",
      "#facc15",
      "#7c3aed",
      "#ef4444",
    ];

    const weeklyTrendMap = useMemo(() => {
      const map = new Map<string, Map<number, number>>();
      filteredAtRiskAccounts.forEach((account) => {
        const inner = new Map<number, number>();
        account.weeklyTrend.forEach((point) => {
          inner.set(point.week, point.leads);
        });
        map.set(account.client, inner);
      });
      return map;
    }, [filteredAtRiskAccounts]);

    const weekSeries = useMemo(() => {
      const weeks = new Set<number>();
      filteredAtRiskAccounts.forEach((account) => {
        account.weeklyTrend.forEach((point) => weeks.add(point.week));
      });
      return Array.from(weeks).sort((a, b) => a - b);
    }, [filteredAtRiskAccounts]);

    const lineConfigs: LineConfig[] = useMemo(
      () =>
        filteredAtRiskAccounts.map((account, index) => ({
          key: `line-${slugifyClientName(account.client) || `client-${index}`}`,
          label: account.client,
          clientName: account.client,
          color: linePalette[index % linePalette.length],
        })),
      [filteredAtRiskAccounts]
    );

    const atRiskChartData = useMemo(() => {
      return weekSeries.map((week) => {
        const point: Record<string, number | string> = {
          weekLabel: getWeekDateRange(week, resolvedYear),
        };
        lineConfigs.forEach((config) => {
          const value = weeklyTrendMap.get(config.clientName)?.get(week) ?? 0;
          point[config.key] = value;
        });
        return point;
      });
    }, [weekSeries, lineConfigs, weeklyTrendMap, resolvedYear]);

    const latestWeekOnChart = weekSeries.length ? weekSeries[weekSeries.length - 1] : undefined;
    const previousWeekOnChart = weekSeries.length > 1 ? weekSeries[weekSeries.length - 2] : undefined;

    const avgForWeek = (week?: number) => {
      if (!week) return 0;
      let sum = 0;
      let count = 0;
      filteredAtRiskAccounts.forEach((account) => {
        const value = weeklyTrendMap.get(account.client)?.get(week);
        if (typeof value === "number") {
          sum += value;
          count += 1;
        }
      });
      return count > 0 ? sum / count : 0;
    };

    const avgLatestWeek = avgForWeek(latestWeekOnChart);
    const avgPreviousWeek = avgForWeek(previousWeekOnChart);

  const lowLeadAccounts = useMemo(() => {
    const daysFilter = minNoLeadDays;
    const now = new Date();
    const nowWeek = getWeekNumberForDate(now);
    const entries: LowLeadAccount[] = [];

    weeklyData.forEach((client) => {
      const weekEntries = Object.entries(client.weeks)
        .map(([week, leads]) => ({ week: Number(week), leads }))
        .filter((entry) => Number.isFinite(entry.week))
        .sort((a, b) => a.week - b.week);
      if (weekEntries.length === 0) return;

      const latestEntry = weekEntries[weekEntries.length - 1];
      const rawLatestStatus =
        (client.statusByWeek?.[latestEntry.week] as ActivityStatus | undefined) ?? client.status;
      const latestStatus: ActivityStatus | undefined =
        rawLatestStatus === "active" || rawLatestStatus === "engagement only" ? rawLatestStatus : undefined;
      if (!latestStatus || !lowLeadStatusFilter[latestStatus]) return;

      const activeWeeks = weekEntries.filter((entry) => {
        const statusAtWeek =
          (client.statusByWeek?.[entry.week] as ActivityStatus | undefined) ?? client.status;
        return statusAtWeek === "active" || statusAtWeek === "engagement only";
      });
      if (activeWeeks.length === 0) return;
      const firstActiveWeek = activeWeeks[0].week;

      let consecutiveWeeks = 0;
      for (let i = weekEntries.length - 1; i >= 0; i--) {
        const entry = weekEntries[i];
        if (entry.week < firstActiveWeek) break;
        const statusAtWeek =
          (client.statusByWeek?.[entry.week] as ActivityStatus | undefined) ?? client.status;
        if (statusAtWeek !== "active" && statusAtWeek !== "engagement only") {
          break;
        }
        if (entry.leads === 0) {
          consecutiveWeeks++;
        } else {
          break;
        }
      }

      const trimmedLength = Math.max(0, weekEntries.length - consecutiveWeeks);
      const lastLeadCandidates = weekEntries
        .slice(0, trimmedLength)
        .filter((entry) => {
          const statusAtWeek =
            (client.statusByWeek?.[entry.week] as ActivityStatus | undefined) ?? client.status;
          return (statusAtWeek === "active" || statusAtWeek === "engagement only") && entry.week >= firstActiveWeek;
        })
        .reverse();
      const lastLeadEntry =
        lastLeadCandidates.find((entry) => entry.leads > 0) || undefined;
      const lastLeadLabel = lastLeadEntry
        ? getWeekDateRange(lastLeadEntry.week, selectedYear ?? new Date().getFullYear())
        : "No leads since activation";

      const latestLeads = latestEntry.leads;
      if (latestLeads > 0) return;

      const isCurrentYear = resolvedYear === now.getFullYear();
      const referenceDate =
        isCurrentYear && latestEntry.week === nowWeek
          ? now
          : getWeekEndDate(latestEntry.week, resolvedYear);

      const lastLeadReferenceDate = lastLeadEntry
        ? getWeekEndDate(lastLeadEntry.week, resolvedYear)
        : getWeekStartDate(firstActiveWeek, resolvedYear);

      const rawNoLeadDays = Math.max(
        0,
        Math.floor((referenceDate.getTime() - lastLeadReferenceDate.getTime()) / MS_PER_DAY)
      );
      const noLeadDays = Math.max(1, rawNoLeadDays);
      const displayWeeks = Math.max(1, Math.ceil(noLeadDays / 7));
      if (noLeadDays < daysFilter) return;

      entries.push({
        client: client.client,
        status: latestStatus,
        latestWeek: latestEntry.week,
        latestLeads,
        consecutiveWeeks,
        displayWeeks,
        noLeadDays,
        weeklyData: client,
        lastLeadLabel,
      });
    });

    return entries.sort((a, b) => b.noLeadDays - a.noLeadDays || b.consecutiveWeeks - a.consecutiveWeeks);
  }, [weeklyData, minNoLeadDays, lowLeadStatusFilter, selectedYear, resolvedYear]);

  const handleCriteriaNumberChange = (
    key: "minAvgLeadsPerWeek",
    value: string
  ) => {
    // Allow empty value or decimal numbers only.
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setAtRiskCriteria((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const atRiskMetrics = useMemo(() => {
    const total = filteredAtRiskAccounts.length;
    return {
      total,
      avgCurrentLeadsPerWeek: total > 0 ? avgLatestWeek : 0,
      avgPreviousLeadsPerWeek: total > 0 ? avgPreviousWeek : 0,
    };
  }, [filteredAtRiskAccounts, avgLatestWeek, avgPreviousWeek]);

  const atRiskExportRows = useMemo(
    () =>
      filteredAtRiskAccounts.map((account) => ({
        Client: account.client,
        "Current Status": account.currentStatus,
        "Recent 4-Week Avg Leads": account.recentAvg,
        "Previous 4-Week Avg Leads": account.previousAvg,
        "Change in Avg Leads": account.delta,
        "Trend Direction": account.slope > 0.05 ? "Improving" : account.slope < -0.05 ? "Declining" : "Stable",
        Poster: account.poster || "-",
        Copywriter: account.copywriter || "-",
      })),
    [filteredAtRiskAccounts]
  );

  return (
    <>
      <div id="team-performance-section" className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 border border-transparent dark:border-slate-700">
        {/* Pod 3 Lead Averages section */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Pod 3 Lead Averages</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[220px] bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 flex flex-col items-start justify-center shadow-sm">
            <div className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">LATEST WEEK AVG (NO CAP)</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">{pod3Latest.avgNoCap !== undefined ? pod3Latest.avgNoCap.toFixed(2) : '-'}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400">Active accounts: {pod3Latest.count}</div>
          </div>
          <div className="flex-1 min-w-[220px] bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 flex flex-col items-start justify-center shadow-sm">
            <div className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">LATEST WEEK AVG (CAP 8 LEADS/CLIENT)</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">{pod3Latest.avgCap !== undefined ? pod3Latest.avgCap.toFixed(2) : '-'}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400">Cap per client: 8 leads</div>
            <div className="text-xs text-gray-500 dark:text-slate-400">Active accounts: {pod3Latest.count}</div>
          </div>
        </div>
        {/* Previous week averages table */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Previous week averages</p>
          <Pod3PreviousWeekAverages weeklyData={weeklyData} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Team Performance</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden">
              <button
                onClick={() => setTab("posters")}
                className={`px-4 py-2 text-sm font-medium ${
                  tab === "posters"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                Posters
              </button>
              <button
                onClick={() => setTab("copywriters")}
                className={`px-4 py-2 text-sm font-medium ${
                  tab === "copywriters"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                Copywriters
              </button>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={hideInactiveRecent}
                onChange={(e) => setHideInactiveRecent(e.target.checked)}
                className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              Hide not active this week
            </label>
            <ExportMenu
              options={[
                {
                  label: "Data CSV",
                  key: "team-data-csv",
                  action: () => exportRowsToCsv(teamExportRows, "team-performance-summary-data"),
                },
                {
                  label: "Data Excel",
                  key: "team-data-xlsx",
                  action: () => exportRowsToExcel(teamExportRows, "team-performance-summary-data"),
                },
                {
                  label: "Data PDF",
                  key: "team-data-pdf",
                  action: () => exportRowsToPdf(teamExportRows, "Team Performance Summary Data", "team-performance-summary-data"),
                },
                {
                  label: "Graph PNG",
                  key: "team-graph-png",
                  action: () => exportElementToPng("team-performance-table", "team-performance-summary-chart", "Team Performance Summary Chart"),
                },
                {
                  label: "Graph PDF",
                  key: "team-graph-pdf",
                  action: () => exportElementToPdf("team-performance-table", "Team Performance Summary Chart", "team-performance-summary-chart"),
                },
                {
                  label: "Data+Graph PDF",
                  key: "team-both-pdf",
                  action: () => exportRowsAndElementToPdf(teamExportRows, "team-performance-table", "Team Performance Summary", "team-performance-summary-report"),
                },
              ]}
            />
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
          Team performance uses the selected year only. "Active" filtering is based on the latest week available in that year. Hover the info icons for metric definitions and hover percentages to see account names.
        </p>

        <div
          id="team-performance-table"
          ref={tableScrollRef}
          className="overflow-x-auto"
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 text-left text-xs uppercase tracking-wide text-gray-600 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
                <th className="sticky left-0 z-20 bg-gray-50 dark:bg-slate-800 py-1 px-2 text-sm font-semibold">Name</th>
                <th className="py-1 px-2 text-right text-xs">
                  <span className="inline-flex items-center gap-1 justify-end w-full">
                    Active/Eng
                    <span className="group/info relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] font-semibold normal-case text-gray-600 cursor-help">
                      i?
                      <span className="pointer-events-none absolute right-0 top-5 z-30 hidden w-64 rounded-md border border-gray-200 bg-white p-2 text-left text-[11px] normal-case tracking-normal text-gray-700 shadow-lg group-hover/info:block">
                        Active accounts / Engagement-only accounts in the current week.
                      </span>
                    </span>
                  </span>
                </th>
                <th className="py-1 px-2 text-right text-xs">
                  <span className="inline-flex items-center gap-1 justify-end w-full">
                    Avg (no cap)
                    <span className="group/info relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] font-semibold normal-case text-gray-600 cursor-help">
                      i?
                      <span className="pointer-events-none absolute right-0 top-5 z-30 hidden w-64 rounded-md border border-gray-200 bg-white p-2 text-left text-[11px] normal-case tracking-normal text-gray-700 shadow-lg group-hover/info:block">
                        Current-week average leads per active account without lead cap.
                      </span>
                    </span>
                  </span>
                </th>
                <th className="py-1 px-2 text-right text-xs">
                  <span className="inline-flex items-center gap-1 justify-end w-full">
                    Avg (8 cap)
                    <span className="group/info relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] font-semibold normal-case text-gray-600 cursor-help">
                      i?
                      <span className="pointer-events-none absolute right-0 top-5 z-30 hidden w-64 rounded-md border border-gray-200 bg-white p-2 text-left text-[11px] normal-case tracking-normal text-gray-700 shadow-lg group-hover/info:block">
                        Current-week average leads per active account with each account capped at 8 leads.
                      </span>
                    </span>
                  </span>
                </th>
                <th className="py-1 px-2 text-right text-xs">
                  <span className="inline-flex items-center gap-1 justify-end w-full">
                    Avg W1-Cur (NC)
                    <span className="group/info relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] font-semibold normal-case text-gray-600 cursor-help">
                      i?
                      <span className="pointer-events-none absolute right-0 top-5 z-30 hidden w-72 rounded-md border border-gray-200 bg-white p-2 text-left text-[11px] normal-case tracking-normal text-gray-700 shadow-lg group-hover/info:block">
                        Average of weekly no-cap averages from Week 1 to current week: (sum of each week's average) / number of weeks.
                      </span>
                    </span>
                  </span>
                </th>
                <th className="py-1 px-2 text-right text-xs">
                  <span className="inline-flex items-center gap-1 justify-end w-full">
                    Avg W1-Cur (8C)
                    <span className="group/info relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] font-semibold normal-case text-gray-600 cursor-help">
                      i?
                      <span className="pointer-events-none absolute right-0 top-5 z-30 hidden w-72 rounded-md border border-gray-200 bg-white p-2 text-left text-[11px] normal-case tracking-normal text-gray-700 shadow-lg group-hover/info:block">
                        Average of weekly capped averages from Week 1 to current week, where each account is capped at 8 leads.
                      </span>
                    </span>
                  </span>
                </th>
                <th className="py-1 px-2 text-right text-xs">
                  <span className="inline-flex items-center gap-1 justify-end w-full">
                    Improv. %
                    <span
                      className="group/info relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] font-semibold normal-case text-gray-600 cursor-help"
                    >
                      i?
                      <span className="pointer-events-none absolute right-0 top-5 z-30 hidden w-64 rounded-md border border-gray-200 bg-white p-2 text-left text-[11px] normal-case tracking-normal text-gray-700 shadow-lg group-hover/info:block">
                        Improving % = share of assigned accounts with a positive week-to-week leads trend in the selected year.
                      </span>
                    </span>
                  </span>
                </th>
                <th className="py-1 px-2 text-right text-xs">
                  <span className="inline-flex items-center gap-1 justify-end w-full">
                    Declin. %
                    <span
                      className="group/info relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] font-semibold normal-case text-gray-600 cursor-help"
                    >
                      i?
                      <span className="pointer-events-none absolute right-0 top-5 z-30 hidden w-64 rounded-md border border-gray-200 bg-white p-2 text-left text-[11px] normal-case tracking-normal text-gray-700 shadow-lg group-hover/info:block">
                        Declining Accounts % = share of assigned accounts with a negative week-to-week leads trend in the selected year.
                      </span>
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const rowKey = `${tab}:${row.name}`;
                const isExpanded = expandedContributors.has(rowKey);

                return (
                  <Fragment key={rowKey}>
                    <tr className="group/row border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-1 px-2 font-medium text-sm text-gray-900 dark:text-slate-100 group-hover/row:bg-gray-50 dark:group-hover/row:bg-slate-800 whitespace-nowrap">
                        <button
                          onClick={() => toggleContributorChart(row.name)}
                          className="text-left text-blue-700 hover:text-blue-900"
                          title="Click to toggle weekly average chart"
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="py-1 px-2 text-right text-sm">{row.currentActiveAccounts}/{row.currentEngagementAccounts}</td>
                      <td className="py-1 px-2 text-right text-sm">{row.avgLeadsCurrentNoCap}</td>
                      <td className="py-1 px-2 text-right text-sm">{row.avgLeadsCurrentCap8}</td>
                      <td className="py-1 px-2 text-right text-sm">{row.avgLeadsWeek1ToCurrentNoCap}</td>
                      <td className="py-1 px-2 text-right text-sm">{row.avgLeadsWeek1ToCurrentCap8}</td>
                      <td className="relative py-1 px-2 text-right text-green-700">
                        <span
                          className="cursor-pointer text-sm underline decoration-dotted underline-offset-2"
                          data-accounts-popover-trigger="true"
                          onClick={(event) =>
                            toggleAccountsPopover(event, "Improving accounts", row.improvingAccounts, `${rowKey}:improving`)
                          }
                        >
                          {row.improvingRate}%
                        </span>
                      </td>
                      <td className="relative py-1 px-2 text-right text-amber-700">
                        <span
                          className="cursor-pointer text-sm underline decoration-dotted underline-offset-2"
                          data-accounts-popover-trigger="true"
                          onClick={(event) =>
                            toggleAccountsPopover(event, "Declining accounts", row.decliningAccounts, `${rowKey}:declining`)
                          }
                        >
                          {row.worseningRate}%
                        </span>
                      </td>
                    </tr>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.tr
                          className="bg-gray-50 dark:bg-slate-800"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                        >
                          <td colSpan={8} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <ContributorAverageChart
                                contributorName={row.name}
                                roleLabel={tab === "posters" ? "Poster" : "Copywriter"}
                                weeklyAverages={row.weeklyAverages}
                              />
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                );
              })}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-sm text-gray-500 dark:text-slate-400">
                    No {tab} data found with current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showAtRiskAccounts && (
        <div
          id="at-risk-accounts-section"
          className="mt-6 w-full bg-white dark:bg-slate-900 rounded-lg shadow p-4 border border-transparent dark:border-slate-700"
        >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">At-risk Accounts</h3>
              <div className="flex flex-wrap items-center gap-2">
                <ExportMenu
                  options={[
                    {
                      label: "Data CSV",
                      key: "atrisk-data-csv",
                      action: () => exportRowsToCsv(atRiskExportRows, "accounts-needing-attention-data"),
                    },
                    {
                      label: "Data Excel",
                      key: "atrisk-data-xlsx",
                      action: () => exportRowsToExcel(atRiskExportRows, "accounts-needing-attention-data"),
                    },
                    {
                      label: "Data PDF",
                      key: "atrisk-data-pdf",
                      action: () => exportRowsToPdf(atRiskExportRows, "Accounts Needing Attention Data", "accounts-needing-attention-data"),
                    },
                    {
                      label: "Graph PNG",
                      key: "atrisk-graph-png",
                      action: () => exportAtRiskAccountsPng("at-risk-accounts-chart", "accounts-needing-attention-chart"),
                    },
                    {
                      label: "Graph PDF",
                      key: "atrisk-graph-pdf",
                      action: () => exportAtRiskAccountsPdf("at-risk-accounts-chart", "accounts-needing-attention-chart"),
                    },
                  ]}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
              Set your own criteria using average leads per week. Accounts below update automatically based on these values.
            </p>
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <label className="text-xs text-gray-700 dark:text-slate-300">
                  Minimum Avg Leads Per Week
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Any"
                    value={atRiskCriteria.minAvgLeadsPerWeek}
                    onChange={(e) => handleCriteriaNumberChange("minAvgLeadsPerWeek", e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-gray-900 dark:text-slate-100"
                  />
                </label>
                <label className="text-xs text-gray-700 dark:text-slate-300 flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={atRiskCriteria.onlyLowerThanPrevious}
                    onChange={(e) =>
                      setAtRiskCriteria((prev) => ({
                        ...prev,
                        onlyLowerThanPrevious: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="leading-tight">
                    Show only accounts where current average is lower than previous average
                  </span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-2">
                  <p className="text-gray-500 dark:text-slate-400">Matching Accounts</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{atRiskMetrics.total}</p>
                </div>
                <div className="rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-2">
                  <p className="text-gray-500 dark:text-slate-400">Avg Current Leads/Week</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{atRiskMetrics.avgCurrentLeadsPerWeek.toFixed(1)}</p>
                </div>
                <div className="rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-2">
                  <p className="text-gray-500 dark:text-slate-400">Avg Previous Leads/Week</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{atRiskMetrics.avgPreviousLeadsPerWeek.toFixed(1)}</p>
                </div>
              </div>
            </div>
        <div id="at-risk-accounts-chart" className="space-y-3 mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">At-risk weekly trend (latest data)</p>
            {lineConfigs.length > 0 && (
              <div className="flex flex-wrap gap-3 text-xs font-medium text-gray-700 dark:text-slate-200">
                {lineConfigs.map((config) => (
                  <span key={config.key} className="inline-flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    {config.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          {atRiskChartData.length > 0 && (
                <div className="h-64 w-full rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={atRiskChartData}
                      margin={{ top: 10, right: 16, left: -8, bottom: 26 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="weekLabel"
                        tick={{ fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        height={40}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12, marginTop: 4 }} />
                      {lineConfigs.map((config) => (
                        <Line
                          key={config.key}
                          type="monotone"
                          dataKey={config.key}
                          stroke={config.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5 }}
                          name={config.label}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {filteredAtRiskAccounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAtRiskAccounts.map((account) => (
                    <div
                      key={account.client}
                      data-account-card="true"
                      className="flex flex-col border border-red-100 dark:border-red-900/60 bg-red-50 dark:bg-red-950/25 rounded-md p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 leading-tight">{account.client}</p>
                        <span className="text-xs font-medium text-red-700">Change: {account.delta}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                        Status: {account.currentStatus} | Recent: {account.recentAvg} | Previous: {account.previousAvg}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                        Poster: {account.poster || "-"} | CW: {account.copywriter || "-"}
                      </p>
                      <div className="mt-3 h-48 w-full rounded border border-red-100 dark:border-red-900/60 bg-white dark:bg-slate-900 p-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={(account.weeklyTrend || []).map((point) => ({
                              ...point,
                              weekLabel: getWeekDateRange(point.week, selectedYear ?? new Date().getFullYear()),
                            }))}
                            margin={{ top: 6, right: 8, left: -8, bottom: 2 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="weekLabel" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip
                              formatter={(value: number) => [value, "Leads"]}
                              labelFormatter={(label, payload) => {
                                const status = payload?.[0]?.payload?.status || "-";
                                return `${label} | ${status}`;
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="leads"
                              stroke="#dc2626"
                              strokeWidth={2}
                              dot={{ r: 2 }}
                              activeDot={{ r: 4 }}
                              name="Leads"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-slate-700 rounded-md p-4 text-sm text-gray-500 dark:text-slate-400">
                  No accounts match your current criteria.
                </div>
              )}
            </div>
            <div className="mt-4 rounded-lg border border-dashed border-blue-200 dark:border-blue-900/40 bg-white/70 dark:bg-slate-900/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Low-lead accounts</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Shows active or engagement clients with zero leads for the configured number of days. Onboarding weeks are ignored.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                  <label className="inline-flex items-center gap-1">
                    <span>Min days no leads</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={minNoLeadDaysInput}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D+/g, "");
                        const normalized = digits === "" ? "0" : String(Number(digits));
                        setMinNoLeadDaysInput(normalized);
                        setMinNoLeadDays(Number(normalized));
                      }}
                      className="w-16 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-gray-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={lowLeadStatusFilter.active}
                      onChange={(event) =>
                        setLowLeadStatusFilter((prev) => ({ ...prev, active: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Active</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={lowLeadStatusFilter["engagement only"]}
                      onChange={(event) =>
                        setLowLeadStatusFilter((prev) => ({
                          ...prev,
                          "engagement only": event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Engagement</span>
                  </label>
                </div>
              </div>
              {lowLeadAccounts.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {lowLeadAccounts.map((account) => {
                    const lastLeadText =
                      account.lastLeadLabel && account.lastLeadLabel !== "N/A"
                        ? account.lastLeadLabel
                        : "No prior lead data";
                    const badgeClass =
                      account.status === "active" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";
                    return (
                      <div
                        key={account.client}
                        className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-white dark:bg-slate-900 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{account.client}</p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}
                            >
                              {account.status}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                            No leads {account.noLeadDays} days ({account.displayWeeks} weeks)
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">Last lead: {lastLeadText}.</p>
                        <div className="mt-2 rounded-md border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 p-2 text-[11px] text-gray-600 dark:text-gray-300">
                          <p>Streak: {account.consecutiveWeeks} consecutive zero-lead weeks</p>
                          <p>Days without leads: {account.noLeadDays}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-slate-400">No accounts match the current low-lead criteria.</p>
              )}
            </div>
          </div>
        )}

      {hoverTooltip.visible && (
        <div
          ref={accountsPopoverRef}
          className="fixed z-[100] w-[320px] rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-left text-xs text-gray-700 dark:text-slate-300 shadow-lg"
          style={{
            left: hoverTooltip.x,
            top: hoverTooltip.y,
            transform: hoverTooltip.placeBelow ? "none" : "translateY(-100%)",
          }}
        >
          {hoverTooltip.accounts.length > 0 ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold">{hoverTooltip.title}</span>
                <button
                  type="button"
                  onClick={() => setHoverTooltip((prev) => ({ ...prev, visible: false, key: "" }))}
                  className="rounded border border-gray-300 dark:border-slate-600 px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
              <div className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-[12px] leading-5 select-text">
                {hoverTooltip.accounts.join(", ")}
              </div>
            </>
          ) : (
            <span>No {hoverTooltip.title.toLowerCase()} in selected year.</span>
          )}
        </div>
      )}
    </>
  );
}
