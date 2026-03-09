"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PodStats from "@/components/PodStats";
import WeeklyTable from "@/components/WeeklyTable";
import ProfileDropdown from "@/components/ProfileDropdown";
import { WeeklyClientData } from "@/lib/transform";
import MonthlyTotals from "@/components/MonthlyTotals";
import TeamPerformance from "@/components/TeamPerformance";
import { useAuth } from "@/lib/useAuth";

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
  const { user, status, refresh } = useAuth();
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const showKpiCards = filters.year !== 2025;

  const filteredWeeklyData =
    data?.weeklyData.filter((client) => {
      return filters.statuses[client.status];
    }) || [];

  const areAllStatusesSelected = Object.values(filters.statuses).every(Boolean);

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeads();
    }
  }, [status, filters.year]);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.year) {
        params.append("year", filters.year.toString());
      }

      const res = await fetch(`/api/leads?${params.toString()}`);

      if (!res.ok) {
        const failed = await res.json().catch(() => ({ error: "Failed to fetch data" }));
        throw new Error(failed.error || "Failed to fetch data");
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

  const handleStatusToggle = (statusValue: ClientStatus, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      statuses: {
        ...prev.statuses,
        [statusValue]: checked,
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

  const handleRequestCode = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to send code");
      }
      setCodeSent(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Invalid verification code");
      }
      await refresh();
      setCode("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to verify code");
    } finally {
      setAuthLoading(false);
    }
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Pod 3 Dashboard</h1>
          <p className="text-gray-600 mb-6">
            Sign in with your work email, password, and one-time code
          </p>

          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (required if set on your account)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />

            {!codeSent ? (
              <button
                onClick={handleRequestCode}
                disabled={authLoading || !email}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50"
              >
                {authLoading ? "Sending code..." : "Send Login Code"}
              </button>
            ) : (
              <>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={authLoading || !code}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50"
                >
                  {authLoading ? "Verifying..." : "Verify and Sign In"}
                </button>
                <button
                  onClick={() => setCodeSent(false)}
                  disabled={authLoading}
                  className="w-full text-sm text-gray-600 hover:text-gray-900"
                >
                  Use a different email/password
                </button>
              </>
            )}
          </div>

          {authError && <p className="text-red-600 text-sm mt-4">{authError}</p>}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pod 3 Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome, {user?.displayName || user?.name || user?.email}!
            </p>
          </div>
          <ProfileDropdown displayName={user?.displayName || user?.name || undefined} email={user?.email || undefined} />
        </div>
      </header>

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

        {data && showKpiCards && <PodStats stats={data.podStats} />}

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
