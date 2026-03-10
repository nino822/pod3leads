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
import ThemeToggle from "@/components/ThemeToggle";

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
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [usePasswordLogin, setUsePasswordLogin] = useState(false);
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

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

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
        const message = [failed.error, failed.details].filter(Boolean).join(": ");
        throw new Error(message || "Failed to fetch data");
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
    if (otpCooldown > 0) {
      setAuthError(`Please wait ${otpCooldown}s before requesting another code.`);
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();
      if (!res.ok) {
        if (typeof result?.retryAfter === "number" && result.retryAfter > 0) {
          setOtpCooldown(result.retryAfter);
        }
        const errorMessage = result?.details
          ? `${result.error || "Failed to send code"}: ${result.details}`
          : result?.error || "Failed to send code";
        throw new Error(errorMessage);
      }
      setCodeSent(true);
      setOtpCooldown(60);
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

  const handlePasswordLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || "Failed to sign in with password");
      }
      await refresh();
      setPassword("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to sign in with password");
    } finally {
      setAuthLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-slate-300"
        >
          <div className="w-8 h-8 border-3 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
        </motion.div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/15 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/15 dark:bg-cyan-500/10 rounded-full blur-3xl"></div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-full max-w-md"
        >
          {/* Card with glassmorphism effect */}
          <div className="bg-white/85 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/20 rounded-2xl p-8 shadow-2xl">
            {/* Logo/Title */}
            <div className="mb-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">P3</span>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-2">
                  Pod 3 Dashboard
                </h1>
                <p className="text-slate-600 dark:text-slate-300 text-center text-sm">
                  Access your leads and team metrics
                </p>
              </motion.div>
            </div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !codeSent) handleRequestCode();
                  }}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3 bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
                />
              </div>

              {/* Code Input (shown after sending code) */}
              {codeSent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && code.length === 6) handleVerifyCode();
                    }}
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    className="w-full px-4 py-3 bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition text-center text-2xl tracking-widest font-mono"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    Code sent to your email. Expires in 10 minutes.
                  </p>
                </motion.div>
              )}

              {usePasswordLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && password.length >= 8) handlePasswordLogin();
                    }}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
                  />
                </motion.div>
              )}

              {/* Error Message */}
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm p-3 rounded-lg ${
                    authError.toLowerCase().includes("check your email")
                      ? "bg-green-500/20 border border-green-500/30 text-green-300"
                      : "bg-red-500/20 border border-red-500/30 text-red-300"
                  }`}
                >
                  {authError}
                </motion.div>
              )}

              {/* Primary Action Button */}
              {!codeSent && !usePasswordLogin ? (
                <button
                  onClick={handleRequestCode}
                  disabled={authLoading || !email || otpCooldown > 0}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {authLoading ? (
                    <span className="flex items-center justify-center">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                      Sending code...
                    </span>
                  ) : otpCooldown > 0 ? (
                    `Wait ${otpCooldown}s`
                  ) : (
                    "Send Login Code"
                  )}
                </button>
              ) : usePasswordLogin ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  <button
                    onClick={handlePasswordLogin}
                    disabled={authLoading || !email || password.length < 8}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authLoading ? (
                      <span className="flex items-center justify-center">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                        Signing in...
                      </span>
                    ) : (
                      "Sign In with Password"
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setUsePasswordLogin(false);
                      setPassword("");
                      setAuthError(null);
                    }}
                    disabled={authLoading}
                    className="w-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-medium py-2 transition"
                  >
                    Use email code instead
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  <button
                    onClick={handleVerifyCode}
                    disabled={authLoading || code.length !== 6}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authLoading ? (
                      <span className="flex items-center justify-center">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                        Verifying...
                      </span>
                    ) : (
                      "Verify and Sign In"
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setCodeSent(false);
                      setCode("");
                      setAuthError(null);
                    }}
                    disabled={authLoading}
                    className="w-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-medium py-2 transition"
                  >
                    Use different email
                  </button>
                </motion.div>
              )}

              {!codeSent && !usePasswordLogin && (
                <button
                  onClick={() => {
                    setUsePasswordLogin(true);
                    setAuthError(null);
                  }}
                  disabled={authLoading}
                  className="w-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-medium py-2 transition"
                >
                  Use password instead
                </button>
              )}
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 text-center"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure passwordless login · Code sent to your email
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-slate-500 dark:text-slate-400 text-sm mt-8"
        >
          Pod 3 • Performance Analytics
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
      {/* Modern Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P3</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Pod 3
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Performance Dashboard</p>
            </div>
          </motion.div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ProfileDropdown
              displayName={user?.displayName || user?.name || undefined}
              email={user?.email || undefined}
              image={user?.image || undefined}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-200 px-6 py-4 rounded-xl mb-8 flex items-center space-x-3"
          >
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold">Error loading data</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </motion.div>
        )}

        {/* KPI Cards */}
        {data && showKpiCards && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PodStats stats={data.podStats} />
          </motion.div>
        )}

        {/* Monthly Totals Chart */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <MonthlyTotals
              totals={data.monthlyTotals}
              weeklyData={data.weeklyData}
              currentYear={filters.year}
              selectedYear={filters.year}
              onYearChange={handleYearChange}
              onRefresh={fetchLeads}
              refreshing={loading}
            />
          </motion.div>
        )}

        {/* Team Performance */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TeamPerformance
              data={data.teamPerformance}
              atRiskAccounts={data.atRiskAccounts}
              selectedYear={filters.year}
            />
          </motion.div>
        )}

        {/* Weekly Data Table */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <WeeklyTable
              data={filteredWeeklyData}
              statusFilters={filters.statuses}
              areAllStatusesSelected={areAllStatusesSelected}
              onStatusToggle={handleStatusToggle}
              onAllStatusesToggle={handleAllStatusesToggle}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
