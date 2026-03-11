"use client";

import { WeeklyClientData } from "@/lib/transform";
import { getWeekDateRange, getWeekMonth } from "@/lib/week";
import { motion } from "framer-motion";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import ClientChart from "./ClientChart";
import {
  exportElementToPdf,
  exportElementToPng,
  exportRowsAndElementToPdf,
  exportRowsToCsv,
  exportRowsToExcel,
  exportRowsToPdf,
} from "@/lib/exportUtils";
import ExportMenu from "@/components/ExportMenu";

const slugifyClientName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

type ClientStatus = "active" | "engagement only" | "onboarding" | "paused";

interface WeeklyTableProps {
  data: WeeklyClientData[];
  statusFilters: Record<ClientStatus, boolean>;
  areAllStatusesSelected: boolean;
  onStatusToggle: (status: ClientStatus, checked: boolean) => void;
  onAllStatusesToggle: (checked: boolean) => void;
  currentWeek: number;
}

export default function WeeklyTable({
  data,
  statusFilters,
  areAllStatusesSelected,
  onStatusToggle,
  onAllStatusesToggle,
  currentWeek,
}: WeeklyTableProps) {
  const [statusOverrides, setStatusOverrides] = useState<Record<string, "active" | "onboarding" | "engagement only" | "paused">>({});
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("All Months");
  const [minMonthlyLeadsFilter, setMinMonthlyLeadsFilter] = useState<string>("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [floatingScroll, setFloatingScroll] = useState({
    visible: false,
    left: 0,
    width: 0,
  });
  const [exportStatusSelection, setExportStatusSelection] = useState(statusFilters);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);

  // Get displayed status (respects overrides)
  const getStatus = (clientName: string, originalStatus: "active" | "onboarding" | "engagement only" | "paused") => {
    return statusOverrides[clientName] ?? originalStatus;
  };

  // Toggle status for a client (cycles through: active -> onboarding -> engagement only -> paused -> active)
  const toggleStatus = (clientName: string, currentStatus: "active" | "onboarding" | "engagement only" | "paused") => {
    const statusCycle = {
      "active": "onboarding",
      "onboarding": "engagement only",
      "engagement only": "paused",
      "paused": "active",
    } as const;
    setStatusOverrides({
      ...statusOverrides,
      [clientName]: statusCycle[currentStatus],
    });
  };

  // Toggle chart visibility for a client
  const toggleChart = (clientName: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientName)) {
      newExpanded.delete(clientName);
    } else {
      newExpanded.add(clientName);
    }
    setExpandedClients(newExpanded);
  };

  const normalizedCurrentWeek = Math.max(1, Math.floor(currentWeek ?? 1));
  const sortedWeeks = Array.from({ length: normalizedCurrentWeek }, (_, idx) => idx + 1);
  const clientExportWeeks = sortedWeeks;

  const buildClientExportRows = (client: WeeklyClientData) => {
    const firstSeenWeek = client.firstSeenWeek ?? 1;
    return clientExportWeeks.map((week) => {
      const rowStatus = client.statusByWeek?.[week] ?? client.status;
      const leadsValue = week < firstSeenWeek ? "-" : client.weeks[week] ?? 0;
      return {
        Week: getWeekDateRange(week),
        "Week #": week,
        Leads: leadsValue,
        Status: rowStatus,
      };
    });
  };

  const getClientChartId = (clientName: string) => {
    const slug = slugifyClientName(clientName);
    return `client-chart-${slug || "client"}`;
  };

  const getClientExportBaseName = (clientName: string, suffix: string) => {
    const slug = slugifyClientName(clientName) || "client";
    return `${slug}-${suffix}`;
  };

  const exportClientCsv = (client: WeeklyClientData) => {
    const rows = buildClientExportRows(client);
    if (!rows.length) return;
    exportRowsToCsv(rows, getClientExportBaseName(client.client, "leads-data"));
  };

  const exportClientExcel = (client: WeeklyClientData) => {
    const rows = buildClientExportRows(client);
    if (!rows.length) return;
    void exportRowsToExcel(rows, getClientExportBaseName(client.client, "leads-data"));
  };

  const exportClientDataPdf = (client: WeeklyClientData) => {
    const rows = buildClientExportRows(client);
    if (!rows.length) return;
    void exportRowsToPdf(rows, `Client ${client.client} Weekly Leads`, getClientExportBaseName(client.client, "leads-data"));
  };

  const exportClientChartPng = (clientName: string) => {
    const chartId = getClientChartId(clientName);
    void exportElementToPng(chartId, getClientExportBaseName(clientName, "chart"), `Client ${clientName} Weekly Leads Chart`);
  };

  const exportClientChartPdf = (clientName: string) => {
    const chartId = getClientChartId(clientName);
    void exportElementToPdf(chartId, `Client ${clientName} Weekly Leads Chart`, getClientExportBaseName(clientName, "chart"));
  };

  const exportClientReportPdf = (client: WeeklyClientData) => {
    const rows = buildClientExportRows(client);
    if (!rows.length) return;
    const chartId = getClientChartId(client.client);
    void exportRowsAndElementToPdf(
      rows,
      chartId,
      `Client ${client.client} Weekly Leads`,
      getClientExportBaseName(client.client, "report")
    );
  };

  // Map weeks to months using week date ranges
  const getMonthForWeek = (week: number): string => getWeekMonth(week);

  // Group weeks by month for colspan
  const monthGroups: { month: string; weeks: number[]; colspan: number }[] = [];
  let currentMonth = "";
  let currentWeeks: number[] = [];

  sortedWeeks.forEach((week) => {
    const month = getMonthForWeek(week);
    if (month !== currentMonth) {
      if (currentWeeks.length > 0) {
        monthGroups.push({ month: currentMonth, weeks: currentWeeks, colspan: currentWeeks.length });
      }
      currentMonth = month;
      currentWeeks = [week];
    } else {
      currentWeeks.push(week);
    }
  });
  if (currentWeeks.length > 0) {
    monthGroups.push({ month: currentMonth, weeks: currentWeeks, colspan: currentWeeks.length });
  }

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    sortedWeeks.forEach((week) => months.add(getMonthForWeek(week)));
    return ["All Months", ...Array.from(months)];
  }, [sortedWeeks]);

  const filteredData = useMemo(() => {
    const minLeads = Number.parseInt(minMonthlyLeadsFilter, 10);
    if (Number.isNaN(minLeads) || minLeads <= 0) {
      return data;
    }

    return data.filter((client) => {
      const leadsInScope = sortedWeeks.reduce((sum, week) => {
        const weekMonth = getMonthForWeek(week);
        if (selectedMonthFilter !== "All Months" && weekMonth !== selectedMonthFilter) {
          return sum;
        }
        return sum + (client.weeks[week] ?? 0);
      }, 0);

      return leadsInScope >= minLeads;
    });
  }, [data, sortedWeeks, selectedMonthFilter, minMonthlyLeadsFilter]);

  // Calculate totals (respecting status overrides)
  const weekTotals = new Map<number, number>();
  const clientTotals = new Map<string, number>();

  filteredData.forEach((client) => {
    let clientTotal = 0;
    Object.entries(client.weeks).forEach(([week, count]) => {
      const weekNum = parseInt(week);
      if (weekNum > normalizedCurrentWeek) return;
      clientTotal += count;
      weekTotals.set(weekNum, (weekTotals.get(weekNum) || 0) + count);
    });
    clientTotals.set(client.client, clientTotal);
  });

  const grandTotal = Array.from(weekTotals.values()).reduce((s, v) => s + v, 0);

  const exportRows = useMemo(
    () =>
      filteredData
        .filter((client) => exportStatusSelection[getStatus(client.client, client.status)])
        .map((client) => {
          const row: Record<string, string | number> = {
            Client: client.client,
            Status: getStatus(client.client, client.status),
          };

          sortedWeeks.forEach((week) => {
            row[getWeekDateRange(week)] = client.weeks[week] ?? 0;
          });

          row.Total = clientTotals.get(client.client) || 0;
          return row;
        }),
    [filteredData, sortedWeeks, clientTotals, statusOverrides, exportStatusSelection]
  );
  useEffect(() => {
    setExportStatusSelection(statusFilters);
  }, [statusFilters]);


  useEffect(() => {
    const topScroll = topScrollRef.current;
    const tableScroll = tableScrollRef.current;
    const wrapper = wrapperRef.current;
    if (!topScroll || !tableScroll || !wrapper) return;

    const syncTrackWidth = () => {
      const table = tableScroll.querySelector("table");
      if (table && scrollTrackRef.current) {
        scrollTrackRef.current.style.width = `${table.scrollWidth}px`;
      }

      const rect = wrapper.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 80;
      setFloatingScroll({
        visible: isVisible,
        left: rect.left,
        width: rect.width,
      });
    };

    const onTopScroll = () => {
      tableScroll.scrollLeft = topScroll.scrollLeft;
    };

    const onTableScroll = () => {
      topScroll.scrollLeft = tableScroll.scrollLeft;
    };

    syncTrackWidth();
    window.addEventListener("scroll", syncTrackWidth, { passive: true });
    window.addEventListener("resize", syncTrackWidth);
    topScroll.addEventListener("scroll", onTopScroll);
    tableScroll.addEventListener("scroll", onTableScroll);

    return () => {
      window.removeEventListener("scroll", syncTrackWidth);
      window.removeEventListener("resize", syncTrackWidth);
      topScroll.removeEventListener("scroll", onTopScroll);
      tableScroll.removeEventListener("scroll", onTableScroll);
    };
  }, [filteredData]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 text-center text-gray-500 dark:text-slate-400 border border-transparent dark:border-slate-700">
        No weekly data available
      </div>
    );
  }

  return (
    <motion.div
      id="client-leads-table-section"
      ref={wrapperRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden border border-transparent dark:border-slate-700"
    >
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Client Leads Table</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
            <span>Month</span>
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="h-8 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-sm text-gray-900 dark:text-slate-100"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
            <span>Min Leads</span>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="0"
              value={minMonthlyLeadsFilter}
              onChange={(e) => setMinMonthlyLeadsFilter(e.target.value)}
              className="h-8 w-20 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-sm text-gray-900 dark:text-slate-100"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={areAllStatusesSelected}
              onChange={(e) => onAllStatusesToggle(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span>All</span>
          </label>
          <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={statusFilters.active}
              onChange={(e) => onStatusToggle("active", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span>Active</span>
          </label>
          <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={statusFilters["engagement only"]}
              onChange={(e) => onStatusToggle("engagement only", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span>Engagement Only</span>
          </label>
          <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={statusFilters.onboarding}
              onChange={(e) => onStatusToggle("onboarding", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span>Onboarding</span>
          </label>
          <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={statusFilters.paused}
              onChange={(e) => onStatusToggle("paused", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span>Paused</span>
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-semibold text-gray-700 dark:text-slate-300">Export Filter:</span>
            <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={exportStatusSelection.active}
                onChange={(e) => setExportStatusSelection((prev) => ({ ...prev, active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span>Active</span>
            </label>
            <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={exportStatusSelection["engagement only"]}
                onChange={(e) =>
                  setExportStatusSelection((prev) => ({
                    ...prev,
                    "engagement only": e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span>Engagement Only</span>
            </label>
            <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={exportStatusSelection.onboarding}
                onChange={(e) =>
                  setExportStatusSelection((prev) => ({ ...prev, onboarding: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span>Onboarding</span>
            </label>
            <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={exportStatusSelection.paused}
                onChange={(e) => setExportStatusSelection((prev) => ({ ...prev, paused: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span>Paused</span>
            </label>
            <label className="inline-flex items-center gap-2 text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={Object.values(exportStatusSelection).every(Boolean)}
                onChange={(e) =>
                  setExportStatusSelection({
                    active: e.target.checked,
                    onboarding: e.target.checked,
                    "engagement only": e.target.checked,
                    paused: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span>All</span>
            </label>
          </div>
          
          <ExportMenu
            options={[
              {
                label: "Data CSV",
                key: "client-data-csv",
                action: () => exportRowsToCsv(exportRows, "client-leads-summary-data"),
              },
              {
                label: "Data Excel",
                key: "client-data-xlsx",
                action: () => exportRowsToExcel(exportRows, "client-leads-summary-data"),
              },
              {
                label: "Data PDF",
                key: "client-data-pdf",
                action: () => exportRowsToPdf(exportRows, "Client Leads Summary Data", "client-leads-summary-data"),
              },
              {
                label: "Graph PNG",
                key: "client-graph-png",
                action: () => exportElementToPng("client-leads-table-section", "client-leads-summary-chart", "Client Leads Summary Chart"),
              },
              {
                label: "Graph PDF",
                key: "client-graph-pdf",
                action: () => exportElementToPdf("client-leads-table-section", "client-leads-summary-chart", "client-leads-summary-chart"),
              },
              {
                label: "Data+Graph PDF",
                key: "client-both-pdf",
                action: () => exportRowsAndElementToPdf(exportRows, "client-leads-table-section", "Client Leads Summary", "client-leads-summary-report"),
              },
            ]}
          />
        </div>
        <div
          ref={topScrollRef}
          className="fixed z-40 overflow-x-auto overflow-y-hidden rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow"
          style={{
            height: "18px",
            bottom: "12px",
            left: `${floatingScroll.left}px`,
            width: `${floatingScroll.width}px`,
            display: floatingScroll.visible ? "block" : "none",
          }}
        >
          <div ref={scrollTrackRef} style={{ height: "1px" }} />
        </div>
      </div>

      <div 
        id="client-leads-table-graph"
        ref={tableScrollRef} 
        className="overflow-auto"
        style={{ 
          scrollbarWidth: 'auto',
          scrollbarColor: '#3B82F6 #E5E7EB',
          maxHeight: 'calc(100vh - 300px)'
        }}
      >
        <table className="w-full min-w-max border-collapse">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            {/* Month Header Row */}
            <tr className="border-b-2 border-blue-800">
              <th className="sticky left-0 top-0 z-[60] w-64 min-w-[260px] bg-blue-700 px-6 py-3 text-left font-bold" rowSpan={2}>Client</th>
              <th className="sticky left-[260px] top-0 z-[60] w-48 min-w-[180px] bg-blue-700 px-6 py-3 text-left font-bold" rowSpan={2}>Status</th>
              {monthGroups.map((group, idx) => (
                <th
                  key={idx}
                  colSpan={group.colspan}
                  className="sticky top-0 z-50 bg-blue-700 px-4 py-3 text-center font-bold text-lg border-l-2 border-blue-500"
                >
                  {group.month}
                </th>
              ))}
              <th className="sticky top-0 z-50 bg-blue-800 px-6 py-3 text-center font-bold" rowSpan={2}> 
                Total
              </th>
            </tr>
            {/* Week Header Row */}
            <tr className="bg-blue-700">
              {sortedWeeks.map((week) => (
                <th
                  key={week}
                  className="sticky top-[52px] z-50 bg-blue-700 px-4 py-2 text-center font-semibold min-w-[120px] border-l border-blue-600"
                >
                  {getWeekDateRange(week)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((client, idx) => {
              const displayStatus = getStatus(client.client, client.status);
              const isExpanded = expandedClients.has(client.client);
              const chartId = getClientChartId(client.client);
              const rowSlug = slugifyClientName(client.client) || "client";
              const exportMenuOptions = [
                { label: "Data CSV", key: `${rowSlug}-data-csv`, action: () => exportClientCsv(client) },
                { label: "Data Excel", key: `${rowSlug}-data-xlsx`, action: () => exportClientExcel(client) },
                { label: "Data PDF", key: `${rowSlug}-data-pdf`, action: () => exportClientDataPdf(client) },
                { label: "Chart PNG", key: `${rowSlug}-chart-png`, action: () => exportClientChartPng(client.client) },
                { label: "Chart PDF", key: `${rowSlug}-chart-pdf`, action: () => exportClientChartPdf(client.client) },
                { label: "Data+Chart PDF", key: `${rowSlug}-report-pdf`, action: () => exportClientReportPdf(client) },
              ];
              return (
                <Fragment key={client.client}>
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`group border-t transition-colors ${
                      displayStatus === "paused"
                        ? "bg-red-50 dark:bg-red-950/25 hover:bg-red-100 dark:hover:bg-red-900/30"
                        : "hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <td className={`sticky left-0 z-[30] w-64 min-w-[260px] px-6 py-4 font-medium text-gray-900 dark:text-slate-100 ${
                      displayStatus === "paused"
                        ? "bg-red-50 dark:bg-red-950/25 group-hover:bg-red-100 dark:group-hover:bg-red-900/30"
                        : "bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800"
                    }`}>
                      <button
                        onClick={() => toggleChart(client.client)}
                        className="text-left text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Click to toggle chart"
                      >
                        {client.client}
                      </button>
                    </td>
                    <td className={`sticky left-[260px] z-[30] w-48 min-w-[180px] px-6 py-4 ${
                      displayStatus === "paused"
                        ? "bg-red-50 dark:bg-red-950/25 group-hover:bg-red-100 dark:group-hover:bg-red-900/30"
                        : "bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800"
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          onClick={() => toggleStatus(client.client, displayStatus)}
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition-all hover:scale-105 ${
                            displayStatus === "active"
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : displayStatus === "onboarding"
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                              : displayStatus === "engagement only"
                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                          title="Click to cycle status"
                        >
                          {displayStatus === "active" ? "Active" 
                            : displayStatus === "onboarding" ? "Onboarding"
                            : displayStatus === "engagement only" ? "Engagement Only"
                            : "Paused"}
                        </button>
                        <ExportMenu
                          options={exportMenuOptions}
                          buttonClassName="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold px-2 py-1 rounded transition disabled:opacity-50 flex items-center gap-1"
                        />
                      </div>
                    </td>
                    {sortedWeeks.map((week) => {
                      const value = client.weeks[week];
                      const firstSeenWeek = client.firstSeenWeek || Infinity;
                      
                      // Determine what to display
                      let displayValue: string | number;
                      
                      if (week < firstSeenWeek) {
                        // Before client started: always show dash
                        displayValue = "-";
                      } else {
                        // After client started: show actual value (including 0)
                        displayValue = value === undefined ? 0 : value;
                      }
                      
                      return (
                        <td
                          key={week}
                          className="px-4 py-4 text-center text-gray-900 dark:text-slate-200 font-medium"
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-center font-bold text-blue-600 bg-blue-50">
                      {clientTotals.get(client.client) || 0}
                    </td>
                  </motion.tr>
                  {isExpanded && (
                    <motion.tr
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50 dark:bg-slate-800"
                    >
                      <td colSpan={sortedWeeks.length + 3}>
                        <div id={chartId}>
                          <ClientChart
                            clientName={client.client}
                            weeklyData={client.weeks}
                            statusByWeek={client.statusByWeek}
                            posterByWeek={client.posterByWeek}
                            currentPoster={client.currentPoster}
                            firstSeenWeek={client.firstSeenWeek}
                            currentWeek={normalizedCurrentWeek}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </Fragment>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={sortedWeeks.length + 3} className="px-6 py-10 text-center text-gray-500 dark:text-slate-400">
                  No clients match the current month/leads filter.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-100 dark:bg-slate-800 border-t-2 border-gray-300 dark:border-slate-700">
            <tr className="font-bold">
              <td colSpan={2} className="sticky left-0 z-[30] bg-gray-100 dark:bg-slate-800 px-6 py-4 text-gray-900 dark:text-slate-100">
                Weekly Totals
              </td>
              {sortedWeeks.map((week) => (
                <td key={week} className="px-4 py-4 text-center text-gray-900 dark:text-slate-200">
                  {weekTotals.get(week) || 0}
                </td>
              ))}
              <td className="px-6 py-4 text-center bg-blue-100 text-blue-900">
                {grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  );
}
