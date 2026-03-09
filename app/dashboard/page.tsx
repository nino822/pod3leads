"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PodStats from "@/components/PodStats";
import WeeklyTable from "@/components/WeeklyTable";
import ProfileDropdown from "@/components/ProfileDropdown";
import { WeeklyClientData } from "@/lib/transform";
import MonthlyTotals from "@/components/MonthlyTotals";
import TeamPerformance from "@/components/TeamPerformance";

type ClientStatus = "active" | "engagement only" | "onboarding" | "paused";

interface PodData {
  weeklyData: WeeklyClientData[];
  podStats: {
    weekly: number;
    monthly: number;
    activeClients: number;
  };
  monthlyTotals: {
    month: string;
    total: number;
    activeClients: number;
  }[];
  teamPerformance: {
    posters: {
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
      weeklyAverages: {
        week: number;
        avgNoCap: number;
        avgCap8: number;
        activeAccounts: number;
        engagementAccounts: number;
      }[];
      improvingRate: number;
      worseningRate: number;
      isCurrentRecent: boolean;
      improvingAccounts: string[];
      decliningAccounts: string[];
    }[];
    copywriters: {
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
      weeklyAverages: {
        week: number;
        avgNoCap: number;
        avgCap8: number;
        activeAccounts: number;
        engagementAccounts: number;
      }[];
      improvingRate: number;
      worseningRate: number;
      isCurrentRecent: boolean;
      improvingAccounts: string[];
      decliningAccounts: string[];
    }[];
  };
  atRiskAccounts: {
    client: string;
    currentStatus: "active" | "onboarding" | "engagement only" | "paused";
    recentAvg: number;
    previousAvg: number;
    delta: number;
    slope: number;
    poster?: string;
    copywriter?: string;
    weeklyTrend: {
      week: number;
      leads: number;
      status: "active" | "onboarding" | "engagement only" | "paused";
    }[];
  }[];
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<PodData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    statuses: {
      active: true,
      "engagement only": true,
      onboarding: true,
      paused: true,
    } as Record<ClientStatus, boolean>,
  });

  const showKpiCards = filters.year !== 2025;

  const filteredWeeklyData =
    data?.weeklyData.filter((client) => {
      return filters.statuses[client.status];
    }) || [];

  const areAllStatusesSelected = Object.values(filters.statuses).every(Boolean);

  const exportData = data
    ? {
        ...data,
        weeklyData: filteredWeeklyData,
      }
    : null;

  useEffect(() => {
    if (session?.accessToken) {
      fetchLeads();
    }
  }, [session, filters.year]);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.year) {
        params.append('year', filters.year.toString());
      }
      
      const res = await fetch(`/api/leads?${params.toString()}`);

      if (res.status === 401) {
        setError("Please sign in with your Google account");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch data");
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (year: number) => {
    setFilters((prev) => ({ ...prev, year }));
  };

  const handleStatusToggle = (status: ClientStatus, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      statuses: {
        ...prev.statuses,
        [status]: checked,
      },
    }));
  };

  const handleAllStatusesToggle = (checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      statuses: {
        active: checked,
        "engagement only": checked,
        onboarding: checked,
        paused: checked,
      },
    }));
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-xl p-8 max-w-md"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Pod 3 Dashboard
          </h1>
          <p className="text-gray-600 mb-6">
            Sign in with your Google account to access the leads dashboard
          </p>
          <button
            onClick={() => signIn("google")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
          >
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pod 3 Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome, {session?.user?.displayName || session?.user?.name || session?.user?.email}!
            </p>
          </div>
          <ProfileDropdown 
            displayName={session?.user?.displayName || session?.user?.name || undefined}
            email={session?.user?.email || undefined}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}

        {/* Stats */}
        {data && showKpiCards && <PodStats stats={data.podStats} />}

        {/* Monthly Totals + Controls */}
        {data && (
          <MonthlyTotals
            totals={data.monthlyTotals}
            weeklyData={data.weeklyData}
            currentYear={filters.year}
            selectedYear={filters.year}
            onYearChange={handleYearChange}
            onRefresh={fetchLeads}
            refreshing={loading}
          />
        )}

        {data && (
          <TeamPerformance
            data={data.teamPerformance}
            atRiskAccounts={data.atRiskAccounts}
            selectedYear={filters.year}
          />
        )}

        {/* Charts */}
        {data && (
          <WeeklyTable
            data={filteredWeeklyData}
            statusFilters={filters.statuses}
            areAllStatusesSelected={areAllStatusesSelected}
            onStatusToggle={handleStatusToggle}
            onAllStatusesToggle={handleAllStatusesToggle}
          />
        )}
      </main>
    </div>
  );
}

