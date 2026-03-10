import { NextRequest, NextResponse } from "next/server";
import {
  fetchSheetWithServiceAccount,
} from "@/lib/sheets";
import { getAuthUser } from "@/lib/auth-helper";
import {
  parseSheetData,
  calculatePodStats,
  getWeeklyDataByClient,
  getMonthlyTotals,
  getTeamPerformance,
  getAtRiskAccounts,
} from "@/lib/transform";

export const dynamic = "force-dynamic";
export const revalidate = 600; // Cache for 10 minutes

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get year filter from query params (defaults to current year)
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    // Fetch year-specific tab with fallbacks.
    // Primary expected tabs:
    // - 2026+: "Leads Tracking"
    // - 2025:  "Leads Tracking 2025"
    const rangeCandidates =
      year === 2025
        ? ["Leads Tracking 2025!A1:ZZ", "2025 Leads Tracking!A1:ZZ", "Leads Tracking!A1:ZZ"]
        : ["Leads Tracking!A1:ZZ", `Leads Tracking ${year}!A1:ZZ`];

    let sheetData: any[] = [];
    let selectedRange: string | null = null;
    let lastError: unknown = null;

    for (const range of rangeCandidates) {
      try {
        sheetData = await fetchSheetWithServiceAccount(range);
        selectedRange = range;
        break;
      } catch (saError) {
        lastError = saError;
        console.log(`Service account failed for range ${range}, trying next candidate...`);
      }
    }

    if (!selectedRange) {
      return NextResponse.json(
        {
          error: "Failed to fetch data from Google Sheets",
          details: String(lastError),
          year,
          triedRanges: rangeCandidates,
        },
        { status: 500 }
      );
    }

    console.log(`Using sheet range for year ${year}: ${selectedRange}`);

    // Parse and transform data
    const leads = parseSheetData(sheetData, year);
    const weeklyByClient = getWeeklyDataByClient(leads);
    const podStats = calculatePodStats(leads);
    const monthlyTotals = getMonthlyTotals(leads);
    const teamPerformance = getTeamPerformance(leads);
    const atRiskAccounts = getAtRiskAccounts(leads);

    return NextResponse.json(
      {
        success: true,
        weeklyData: weeklyByClient,
        podStats,
        monthlyTotals,
        teamPerformance,
        atRiskAccounts,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=600, stale-while-revalidate=1200",
        },
      }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
