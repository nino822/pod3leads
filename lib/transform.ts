import { format } from "date-fns";
import { getWeekMonth, getWeekNumberForDate, getWeekStartDate, getWeekEndDate } from "./week";

export interface Lead {
  client: string;
  date: string;
  week: number;
  month: string;
  year: number;
  leads: number;
  status: "active" | "onboarding" | "engagement only" | "paused";
  poster?: string;
  copywriter?: string;
}

export interface AggregatedLead {
  client: string;
  weekly: number;
  monthly: number;
  status: "active" | "onboarding" | "engagement only" | "paused";
}

export interface PodStats {
  weekly: number;
  monthly: number;
  activeClients: number;
}

export interface MonthlyTotal {
  month: string;
  total: number;
  activeClients: number;
}

const MONTH_SEQUENCE = [
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
] as const;

export function getCurrentDashboardWeek(date: Date): number {
  // Convert to EST timezone
  const estDate = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return getWeekNumberForDate(estDate);
}

function cleanPerson(value: unknown): string | undefined {
  const text = value?.toString().trim();
  if (!text) return undefined;
  if (text === "-" || text.toLowerCase() === "n/a") return undefined;
  return text;
}

function parsePosterAndCopywriter(
  columnCValue: unknown,
  columnDValue: unknown,
  year: number
): { poster?: string; copywriter?: string } {
  const rawC = cleanPerson(columnCValue);
  const rawD = cleanPerson(columnDValue);

  // Default/newer format: C = poster, D = copywriter
  let poster = rawC;
  let copywriter = rawD;

  // 2025 legacy format: C could be "Joiner | Poster | Copywriter".
  // We ignore joiner and keep poster/copywriter when present.
  if (year === 2025 && rawC && rawC.includes("|")) {
    const parts = rawC
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 3) {
      poster = cleanPerson(parts[1]);
      copywriter = copywriter || cleanPerson(parts[2]);
    } else if (parts.length === 2) {
      poster = cleanPerson(parts[0]);
      copywriter = copywriter || cleanPerson(parts[1]);
    } else if (parts.length === 1) {
      poster = cleanPerson(parts[0]);
    }
  }

  return { poster, copywriter };
}

function parseRowDate(value: unknown): Date | undefined {
  const text = value?.toString().trim();
  if (!text) return undefined;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed);
}

export function parseSheetData(rows: any[], year: number = new Date().getFullYear()): Lead[] {
  if (!rows || rows.length < 2) return [];

  const leads: Lead[] = [];
  const clientIndex = 1; // Column B
  const posterIndex = 2; // Column C
  const copywriterIndex = 3; // Column D
  const podIndex = 6; // Column G
  const statusIndex = 7; // Column H
  const weeklyTotalIndex = 16; // Column Q

  let currentWeek = 0; // Start at 0, increment when we see header
  let foundFirstHeader = false;
  let currentHeaderDates: Array<{ index: number; date: Date }> = [];

  console.log(`Processing ${rows.length} rows of data for year ${year}`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Check if this is a header row (exact "Client" marker in column B)
    const clientHeaderCell = row[clientIndex]?.toString().trim().toLowerCase();
    if (clientHeaderCell === "client") {
      if (!foundFirstHeader) {
        foundFirstHeader = true;
        currentWeek = 1; // First header = Week 1
      } else {
        currentWeek++; // Subsequent headers increment the week
      }
      console.log(`Found header row at ${i} for Week ${currentWeek}`);
      const headerDates: Array<{ index: number; date: Date }> = [];
      let foundDate = false;
      for (let col = 9; col < row.length; col++) {
        const raw = row[col]?.toString().trim();
        if (!raw) {
          if (foundDate) break;
          continue;
        }
        const parsed = Date.parse(raw);
        if (Number.isNaN(parsed)) {
          if (foundDate) break;
          continue;
        }
        headerDates.push({ index: col, date: new Date(parsed) });
        foundDate = true;
      }
      currentHeaderDates = headerDates;
      continue;
    }

    // Skip if no week has been set yet (no header found)
    if (currentWeek === 0) continue;

    const clientName = row[clientIndex]?.toString().trim();
    const { poster, copywriter } = parsePosterAndCopywriter(
      row[posterIndex],
      row[copywriterIndex],
      year
    );
    const podValue = row[podIndex]?.toString().trim();
    const statusValue = row[statusIndex]?.toString().trim().toLowerCase() || "active";
    const weeklyTotal = parseInt(row[weeklyTotalIndex]) || 0;
    const rowDate = parseRowDate(row[0]);
    const inferredWeek = rowDate ? getWeekNumberForDate(rowDate) : currentWeek;
    const weekNumber = inferredWeek || currentWeek;
    const weekStart = getWeekStartDate(weekNumber, year);
    const weekEnd = getWeekEndDate(weekNumber, year);
    const relevantDateSum = currentHeaderDates.reduce((sum, column) => {
      if (column.date >= weekStart && column.date <= weekEnd) {
        return sum + (parseInt(row[column.index]) || 0);
      }
      return sum;
    }, 0);
    const weeklyLeads = currentHeaderDates.length ? relevantDateSum : weeklyTotal;

    // Skip empty rows or rows without data
    if (!clientName || !podValue) continue;

      // Strict Pod 3 filter for all downstream stats (including poster/copywriter performance)
      if (!isPod3Value(podValue)) continue;

    // Skip if no leads (but allow 0 for tracking status)
    if (weeklyTotal < 0) continue;

    // Map status values from sheet
    let status: "active" | "onboarding" | "engagement only" | "paused" = "active";
    if (statusValue.includes("onboarding")) {
      status = "onboarding";
    } else if (statusValue.includes("engagement")) {
      status = "engagement only";
    } else if (statusValue.includes("paused")) {
      status = "paused";
    }

    // Only log first few and every 250th row
    if (i < 20 || i % 250 === 0) {
      console.log(
        `Week ${weekNumber}, Row ${i}: ${clientName} (${podValue}) Status: "${statusValue}" = ${weeklyLeads} | Poster: ${poster || "-"} | Copywriter: ${copywriter || "-"}`
      );
    }

    leads.push({
      client: clientName,
      date: format(new Date(), "yyyy-MM-dd"),
      week: weekNumber,
      month: getWeekMonth(weekNumber, year),
      year: year, // Use the provided year parameter
      leads: weeklyLeads,
      status,
      poster,
      copywriter,
    });
  }

  console.log(`✓ Parsed ${leads.length} leads from Pod 3`);
  
  // Count and log status breakdown
  const statusCounts = new Map<string, number>();
  leads.forEach(lead => {
    const count = statusCounts.get(lead.status) || 0;
    statusCounts.set(lead.status, count + 1);
  });
  console.log("Status breakdown:", Object.fromEntries(statusCounts));
  
  return leads;
}

  function isPod3Value(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return normalized === "pod 3" || normalized === "pod3";
  }

export function aggregateByWeekly(leads: Lead[]): Map<string, AggregatedLead> {
  const aggregated = new Map<string, AggregatedLead>();

  leads.forEach((lead) => {
    const key = `${lead.client}-${lead.year}-W${lead.week}`;

    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!;
      existing.weekly += lead.leads;
    } else {
      aggregated.set(key, {
        client: lead.client,
        weekly: lead.leads,
        monthly: 0,
        status: lead.status,
      });
    }
  });

  return aggregated;
}

export function aggregateByMonthly(leads: Lead[]): Map<string, AggregatedLead> {
  const aggregated = new Map<string, AggregatedLead>();

  leads.forEach((lead) => {
    const key = `${lead.client}-${lead.month}`;

    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!;
      existing.monthly += lead.leads;
    } else {
      aggregated.set(key, {
        client: lead.client,
        weekly: 0,
        monthly: lead.leads,
        status: lead.status,
      });
    }
  });

  return aggregated;
}

export function calculatePodStats(leads: Lead[]): PodStats {
  if (!leads.length) {
    return {
      weekly: 0,
      monthly: 0,
      activeClients: 0,
    };
  }

  const currentDate = new Date();
  const currentMonth = format(currentDate, "MMMM");
  const currentDashboardWeek = getCurrentDashboardWeek(currentDate);
  const availableWeeks = new Set(leads.map((lead) => lead.week));
  const maxAvailableWeek =
    availableWeeks.size > 0 ? Math.max(...Array.from(availableWeeks)) : 0;
  const targetWeek =
    maxAvailableWeek > 0
      ? Math.min(maxAvailableWeek, currentDashboardWeek)
      : currentDashboardWeek;

  let weeklyTotal = 0;
  let monthlyTotal = 0;
  const latestStatusByClient = new Map<string, { week: number; status: Lead["status"] }>();

  leads.forEach((lead) => {
    const current = latestStatusByClient.get(lead.client);
    if (!current || lead.week > current.week) {
      latestStatusByClient.set(lead.client, { week: lead.week, status: lead.status });
    }
  });

  const activeClientsSet = new Set(
    Array.from(latestStatusByClient.entries())
      .filter(([, value]) => value.status === "active" || value.status === "engagement only")
      .map(([client]) => client)
  );

  leads.forEach((lead) => {
    if (lead.week === targetWeek) {
      weeklyTotal += lead.leads;
    }
    if (lead.month === currentMonth) {
      monthlyTotal += lead.leads;
    }
  });

  return {
    weekly: weeklyTotal,
    monthly: monthlyTotal,
    activeClients: activeClientsSet.size,
  };
}

export function getMonthlyTotals(leads: Lead[]): MonthlyTotal[] {
  const monthTotals = new Map<string, { total: number }>();
  const monthlyWeekClientSets = new Map<string, Map<number, Set<string>>>();

  leads.forEach((lead) => {
    if (!monthTotals.has(lead.month)) {
      monthTotals.set(lead.month, { total: 0 });
    }

    const monthData = monthTotals.get(lead.month)!;
    monthData.total += lead.leads;

    if (lead.status === "active" || lead.status === "engagement only") {
      if (!monthlyWeekClientSets.has(lead.month)) {
        monthlyWeekClientSets.set(lead.month, new Map<number, Set<string>>());
      }
      const weekMap = monthlyWeekClientSets.get(lead.month)!;
      if (!weekMap.has(lead.week)) {
        weekMap.set(lead.week, new Set<string>());
      }
      weekMap.get(lead.week)!.add(lead.client);
    }
  });

  return Array.from(monthTotals.entries())
    .sort((a, b) => MONTH_SEQUENCE.indexOf(a[0] as (typeof MONTH_SEQUENCE)[number]) - MONTH_SEQUENCE.indexOf(b[0] as (typeof MONTH_SEQUENCE)[number]))
    .map(([month, data]) => {
      const weekMap = monthlyWeekClientSets.get(month);
      let avgActiveClients = 0;
      if (weekMap && weekMap.size > 0) {
        const weeklyCounts = Array.from(weekMap.values()).map((clientSet) => clientSet.size);
        const totalWeeklyClients = weeklyCounts.reduce((sum, count) => sum + count, 0);
        avgActiveClients = totalWeeklyClients / weekMap.size;
      }

      return {
        month,
        total: data.total,
        activeClients: Number(avgActiveClients.toFixed(1)),
      };
    });
}

export function sortAndFilterLeads(
  allLeads: AggregatedLead[],
  filters: {
    client?: string;
    year?: number;
    month?: string;
    week?: number;
  }
): AggregatedLead[] {
  let filtered = allLeads;

  if (filters.client) {
    filtered = filtered.filter((l) => l.client === filters.client);
  }

  // Sort: active clients first, then paused at bottom, sorted by leads descending
  return filtered.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "active" ? -1 : 1;
    }
    const totalA = a.weekly + a.monthly;
    const totalB = b.weekly + b.monthly;
    return totalB - totalA;
  });
}

export interface WeeklyClientData {
  client: string;
  status: "active" | "onboarding" | "engagement only" | "paused";
  weeks: Record<number, number>; // week number -> lead count
  statusByWeek: Record<number, "active" | "onboarding" | "engagement only" | "paused">;
  posterByWeek: Record<number, string>;
  currentPoster?: string;
  firstSeenWeek: number;
  maxWeek: number;
  becamePausedAtWeek: number | null; // Week when client became paused
}

export interface ContributorPerformance {
  name: string;
  totalLeads: number;
  uniqueAccounts: number;
  accountWeeks: number;
  avgLeadsPerAccountWeek: number;
  medianLeadsPerAccountWeek: number;
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
}

export interface TeamPerformance {
  posters: ContributorPerformance[];
  copywriters: ContributorPerformance[];
}

export interface AtRiskAccount {
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
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function linearSlope(points: Array<{ x: number; y: number }>): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const sumX = points.reduce((acc, point) => acc + point.x, 0);
  const sumY = points.reduce((acc, point) => acc + point.y, 0);
  const sumXY = points.reduce((acc, point) => acc + point.x * point.y, 0);
  const sumXX = points.reduce((acc, point) => acc + point.x * point.x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

function normalizeContributorName(name?: string): string | null {
  const value = name?.trim();
  if (!value) return null;
  if (value === "-" || value.toLowerCase() === "n/a") return null;
  return value;
}

function buildContributorPerformance(
  leads: Lead[],
  contributorType: "poster" | "copywriter",
  targetWeek: number,
  eligibleTrendClients?: Set<string>
): ContributorPerformance[] {
  type ContributorAggregate = {
    totalLeads: number;
    accountWeeks: number;
    accounts: Set<string>;
    values: number[];
    clientSeries: Map<string, Array<{ week: number; leads: number }>>;
    weekClientStats: Map<number, Map<string, { leads: number; status: Lead["status"] }>>;
  };

  // Filter to only active and engagement accounts - exclude paused and onboarding
  const activeLeads = leads.filter(
    (lead) => lead.status === "active" || lead.status === "engagement only"
  );

  const aggregateMap = new Map<string, ContributorAggregate>();

  activeLeads.forEach((lead) => {
    const name = normalizeContributorName(lead[contributorType]);
    if (!name) return;

    if (!aggregateMap.has(name)) {
      aggregateMap.set(name, {
        totalLeads: 0,
        accountWeeks: 0,
        accounts: new Set<string>(),
        values: [],
        clientSeries: new Map<string, Array<{ week: number; leads: number }>>(),
        weekClientStats: new Map<number, Map<string, { leads: number; status: Lead["status"] }>>(),
      });
    }

    const aggregate = aggregateMap.get(name)!;
    aggregate.totalLeads += lead.leads;
    aggregate.accountWeeks += 1;
    aggregate.accounts.add(lead.client);
    aggregate.values.push(lead.leads);

    const series = aggregate.clientSeries.get(lead.client) || [];
    series.push({ week: lead.week, leads: lead.leads });
    aggregate.clientSeries.set(lead.client, series);

    if (!aggregate.weekClientStats.has(lead.week)) {
      aggregate.weekClientStats.set(
        lead.week,
        new Map<string, { leads: number; status: Lead["status"] }>()
      );
    }

    const weekMap = aggregate.weekClientStats.get(lead.week)!;
    const existingClientWeek = weekMap.get(lead.client);
    if (existingClientWeek) {
      existingClientWeek.leads += lead.leads;
      existingClientWeek.status = lead.status;
    } else {
      weekMap.set(lead.client, { leads: lead.leads, status: lead.status });
    }
  });

  const performance = Array.from(aggregateMap.entries()).map(([name, aggregate]) => {
    const currentWeekByClient = aggregate.weekClientStats.get(targetWeek) || new Map<string, { leads: number; status: Lead["status"] }>();

    const currentActiveEntries = Array.from(currentWeekByClient.values()).filter(
      (entry) => entry.status === "active"
    );
    const currentEngagementEntries = Array.from(currentWeekByClient.values()).filter(
      (entry) => entry.status === "engagement only"
    );

    const currentActiveAccounts = currentActiveEntries.length;
    const currentEngagementAccounts = currentEngagementEntries.length;
    const activeLeadsTotal = currentActiveEntries.reduce((sum, entry) => sum + entry.leads, 0);
    const activeLeadsTotalCapped = currentActiveEntries.reduce(
      (sum, entry) => sum + Math.min(entry.leads, 8),
      0
    );

    const weeklyAverages = Array.from(aggregate.weekClientStats.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, weekMap]) => {
        const activeEntries = Array.from(weekMap.values()).filter(
          (entry) => entry.status === "active"
        );
        const engagementEntries = Array.from(weekMap.values()).filter(
          (entry) => entry.status === "engagement only"
        );

        const activeAccounts = activeEntries.length;
        const activeTotal = activeEntries.reduce((sum, entry) => sum + entry.leads, 0);
        const activeTotalCap8 = activeEntries.reduce(
          (sum, entry) => sum + Math.min(entry.leads, 8),
          0
        );

        return {
          week,
          avgNoCap: Number((activeTotal / Math.max(activeAccounts, 1)).toFixed(2)),
          avgCap8: Number((activeTotalCap8 / Math.max(activeAccounts, 1)).toFixed(2)),
          activeAccounts,
          engagementAccounts: engagementEntries.length,
        };
      });

    // Week 1-current average is the average of weekly averages (includes zero weeks).
    const allWeeks = Array.from({ length: targetWeek }, (_, idx) => idx + 1);
    const weeklyAverageTotals = allWeeks.reduce(
      (acc, week) => {
        const weekMap = aggregate.weekClientStats.get(week);
        if (!weekMap) return acc;

        const activeEntries = Array.from(weekMap.values()).filter(
          (entry) => entry.status === "active"
        );
        const activeAccounts = activeEntries.length;
        const activeTotal = activeEntries.reduce((sum, entry) => sum + entry.leads, 0);
        const activeTotalCap8 = activeEntries.reduce(
          (sum, entry) => sum + Math.min(entry.leads, 8),
          0
        );

        acc.noCap += activeAccounts > 0 ? activeTotal / activeAccounts : 0;
        acc.cap8 += activeAccounts > 0 ? activeTotalCap8 / activeAccounts : 0;
        return acc;
      },
      { noCap: 0, cap8: 0 }
    );

    const improvingAccounts: string[] = [];
    const decliningAccounts: string[] = [];
    let comparable = 0;

    aggregate.clientSeries.forEach((series, clientName) => {
      if (eligibleTrendClients && !eligibleTrendClients.has(clientName)) {
        return;
      }

      const sorted = [...series].sort((a, b) => a.week - b.week);
      if (sorted.length < 2) return;
      const slope = linearSlope(
        sorted.map((point, index) => ({ x: index + 1, y: point.leads }))
      );
      comparable += 1;
      if (slope > 0) improvingAccounts.push(clientName);
      if (slope < 0) decliningAccounts.push(clientName);
    });

    return {
      name,
      totalLeads: aggregate.totalLeads,
      uniqueAccounts: aggregate.accounts.size,
      accountWeeks: aggregate.accountWeeks,
      avgLeadsPerAccountWeek: Number((aggregate.totalLeads / Math.max(aggregate.accountWeeks, 1)).toFixed(2)),
      medianLeadsPerAccountWeek: Number(median(aggregate.values).toFixed(2)),
      currentActiveAccounts,
      currentEngagementAccounts,
      avgLeadsCurrentNoCap: Number((activeLeadsTotal / Math.max(currentActiveAccounts, 1)).toFixed(2)),
      avgLeadsCurrentCap8: Number((activeLeadsTotalCapped / Math.max(currentActiveAccounts, 1)).toFixed(2)),
      avgLeadsWeek1ToCurrentNoCap: Number((weeklyAverageTotals.noCap / Math.max(targetWeek, 1)).toFixed(2)),
      avgLeadsWeek1ToCurrentCap8: Number((weeklyAverageTotals.cap8 / Math.max(targetWeek, 1)).toFixed(2)),
      weeklyAverages,
      improvingRate: Number(((improvingAccounts.length / Math.max(comparable, 1)) * 100).toFixed(1)),
      worseningRate: Number(((decliningAccounts.length / Math.max(comparable, 1)) * 100).toFixed(1)),
      isCurrentRecent: false,
      improvingAccounts: improvingAccounts.sort((a, b) => a.localeCompare(b)),
      decliningAccounts: decliningAccounts.sort((a, b) => a.localeCompare(b)),
    };
  });

  const contributorsWithPostedLeads = performance.filter(
    (entry) => entry.totalLeads > 0
  );

  return contributorsWithPostedLeads.sort((a, b) => {
    if (b.avgLeadsPerAccountWeek !== a.avgLeadsPerAccountWeek) {
      return b.avgLeadsPerAccountWeek - a.avgLeadsPerAccountWeek;
    }
    return b.totalLeads - a.totalLeads;
  });
}

export function getTeamPerformance(leads: Lead[]): TeamPerformance {
  if (leads.length === 0) {
    return {
      posters: [],
      copywriters: [],
    };
  }

  // Ignore future-entered weeks. Use latest available week not greater than the current dashboard week.
  const availableWeeks = Array.from(new Set(leads.map((lead) => lead.week))).sort((a, b) => a - b);
  const currentDashboardWeek = getCurrentDashboardWeek(new Date());
  const latestEligibleWeek =
    [...availableWeeks].reverse().find((week) => week <= currentDashboardWeek) ??
    availableWeeks[availableWeeks.length - 1];

  const scopedLeads = leads.filter((lead) => lead.week <= latestEligibleWeek);

  // Improving/declining lists should only reflect accounts currently active in the target week.
  const latestStatusByClient = new Map<string, Lead["status"]>();
  scopedLeads.forEach((lead) => {
    if (lead.week === latestEligibleWeek) {
      latestStatusByClient.set(lead.client, lead.status);
    }
  });

  const activeLatestClients = new Set(
    Array.from(latestStatusByClient.entries())
      .filter(([, status]) => status === "active")
      .map(([client]) => client)
  );

  const posters = buildContributorPerformance(scopedLeads, "poster", latestEligibleWeek, activeLatestClients);
  const copywriters = buildContributorPerformance(scopedLeads, "copywriter", latestEligibleWeek, activeLatestClients);

  // "Current" contributors are based strictly on the target week.
  // This avoids showing people who were only active in prior weeks.

  const currentPosterNames = new Set(
    scopedLeads
      .filter(
        (lead) =>
          lead.week === latestEligibleWeek &&
          (lead.status === "active" || lead.status === "engagement only")
      )
      .map((lead) => normalizeContributorName(lead.poster))
      .filter((name): name is string => Boolean(name))
  );

  const currentCopywriterNames = new Set(
    scopedLeads
      .filter(
        (lead) =>
          lead.week === latestEligibleWeek &&
          (lead.status === "active" || lead.status === "engagement only")
      )
      .map((lead) => normalizeContributorName(lead.copywriter))
      .filter((name): name is string => Boolean(name))
  );

  const postersWithRecentFlag = posters.map((poster) => ({
    ...poster,
    isCurrentRecent: currentPosterNames.has(poster.name),
  }));

  const copywritersWithRecentFlag = copywriters.map((copywriter) => ({
    ...copywriter,
    isCurrentRecent: currentCopywriterNames.has(copywriter.name),
  }));

  const sortedPosters = [...postersWithRecentFlag].sort((a, b) => {
    const aCurrent = currentPosterNames.has(a.name);
    const bCurrent = currentPosterNames.has(b.name);

    if (aCurrent !== bCurrent) {
      return aCurrent ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });

  return {
    posters: sortedPosters,
    copywriters: copywritersWithRecentFlag,
  };
}

export function getAtRiskAccounts(leads: Lead[]): AtRiskAccount[] {
  const byClient = new Map<string, Lead[]>();
  leads.forEach((lead) => {
    const list = byClient.get(lead.client) || [];
    list.push(lead);
    byClient.set(lead.client, list);
  });

  const atRisk: AtRiskAccount[] = [];

  byClient.forEach((clientLeads, client) => {
    const sorted = [...clientLeads].sort((a, b) => a.week - b.week);
    if (sorted.length < 6) return;

    const recentWindow = sorted.slice(-4);
    const previousWindow = sorted.slice(-8, -4);
    if (previousWindow.length < 2) return;

    const recentAvg = recentWindow.reduce((sum, lead) => sum + lead.leads, 0) / recentWindow.length;
    const previousAvg = previousWindow.reduce((sum, lead) => sum + lead.leads, 0) / previousWindow.length;
    const slope = linearSlope(sorted.map((lead, idx) => ({ x: idx + 1, y: lead.leads })));
    const delta = recentAvg - previousAvg;

    // At-risk signal: declining trend and meaningful drop in the recent period.
    if (slope < -0.1 && delta <= -1) {
      const latest = sorted[sorted.length - 1];
      if (latest.status === "paused") return;

      atRisk.push({
        client,
        currentStatus: latest.status,
        recentAvg: Number(recentAvg.toFixed(2)),
        previousAvg: Number(previousAvg.toFixed(2)),
        delta: Number(delta.toFixed(2)),
        slope: Number(slope.toFixed(3)),
        poster: latest.poster,
        copywriter: latest.copywriter,
        weeklyTrend: sorted.map((entry) => ({
          week: entry.week,
          leads: entry.leads,
          status: entry.status,
        })),
      });
    }
  });

  return atRisk.sort((a, b) => a.delta - b.delta).slice(0, 15);
}

export function getWeeklyDataByClient(leads: Lead[]): WeeklyClientData[] {
  const clientMap = new Map<string, WeeklyClientData>();
  const clientLatestStatus = new Map<string, { week: number, status: "active" | "onboarding" | "engagement only" | "paused" }>();
  const clientLatestPoster = new Map<string, { week: number; poster: string }>();
  let maxWeekOverall = 0;

  // First pass: build map and track latest status
  leads.forEach((lead) => {
    const key = lead.client;
    if (!clientMap.has(key)) {
      clientMap.set(key, {
        client: lead.client,
        status: "active",
        weeks: {},
        statusByWeek: {},
        posterByWeek: {},
        firstSeenWeek: lead.week,
        maxWeek: 0,
        becamePausedAtWeek: null,
      });
    }

    const clientData = clientMap.get(key)!;
    clientData.firstSeenWeek = Math.min(clientData.firstSeenWeek, lead.week);
    if (!clientData.weeks[lead.week]) {
      clientData.weeks[lead.week] = 0;
    }
    clientData.weeks[lead.week] += lead.leads;
    clientData.statusByWeek[lead.week] = lead.status;
    if (lead.poster) {
      clientData.posterByWeek[lead.week] = lead.poster;
      const latestPoster = clientLatestPoster.get(key);
      if (!latestPoster || lead.week >= latestPoster.week) {
        clientLatestPoster.set(key, { week: lead.week, poster: lead.poster });
      }
    }
    clientData.maxWeek = Math.max(clientData.maxWeek, lead.week);
    maxWeekOverall = Math.max(maxWeekOverall, lead.week);
    
    // Track status from the latest week
    const currentLatest = clientLatestStatus.get(key);
    if (!currentLatest || lead.week > currentLatest.week) {
      clientLatestStatus.set(key, { week: lead.week, status: lead.status });
    }
  });

  // Second pass: use status from latest week
  clientMap.forEach((clientData, clientName) => {
    const latestStatus = clientLatestStatus.get(clientName);
    if (latestStatus) {
      clientData.status = latestStatus.status;
    }

    const latestPoster = clientLatestPoster.get(clientName);
    if (latestPoster) {
      clientData.currentPoster = latestPoster.poster;
    }
    
    // If client disappeared completely in later weeks, mark as paused
    const hasWeekEntry = maxWeekOverall in clientData.weeks;
    if (!hasWeekEntry) {
      clientData.status = "paused";
      // Track the last week they had data
      for (let w = maxWeekOverall - 1; w >= 1; w--) {
        if (w in clientData.weeks) {
          clientData.becamePausedAtWeek = w + 1;
          break;
        }
      }
    }
  });

  // Sort: Active+Engagement mixed alphabetically -> Onboarding -> Paused
  const statusOrder: Record<string, number> = {
    "active": 0,
    "engagement only": 0,
    "onboarding": 1,
    "paused": 3,
  };

  return Array.from(clientMap.values()).sort((a, b) => {
    // First, sort by status tier
    const statusDiff = (statusOrder[a.status] ?? 999) - (statusOrder[b.status] ?? 999);
    if (statusDiff !== 0) return statusDiff;
    
    // Within same status, sort alphabetically
    return a.client.localeCompare(b.client);
  });
}
