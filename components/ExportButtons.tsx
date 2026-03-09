"use client";

import { useState } from "react";
import Papa from "papaparse";
import { WeeklyClientData } from "@/lib/transform";

interface Data {
  weeklyData: WeeklyClientData[];
  podStats: {
    weekly: number;
    monthly: number;
    activeClients: number;
  };
}

interface ExportButtonsProps {
  data: Data | null;
  className?: string;
}

export default function ExportButtons({ data, className }: ExportButtonsProps) {
  const [exporting, setExporting] = useState(false);

  const handleCSVExport = () => {
    if (!data) return;

    setExporting(true);

    try {
      // Get all weeks
      const allWeeks = new Set<number>();
      data.weeklyData.forEach((client) => {
        Object.keys(client.weeks).forEach((week) => {
          allWeeks.add(parseInt(week));
        });
      });
      const sortedWeeks = Array.from(allWeeks).sort((a, b) => a - b);

      // Build CSV rows
      const rows = [
        ["Client", "Status", ...sortedWeeks.map((w) => `Week ${w}`), "Total"],
        ...data.weeklyData.map((client) => {
          const total = Object.values(client.weeks).reduce((s, v) => s + v, 0);
          return [
            client.client,
            client.status,
            ...sortedWeeks.map((w) => client.weeks[w] || 0),
            total,
          ];
        }),
      ];

      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `pod3-leads-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleCSVExport}
      disabled={!data || exporting}
      className={
        className ||
        "bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1 px-2 rounded transition disabled:opacity-50"
      }
    >
      {exporting ? "Exporting..." : "Export CSV"}
    </button>
  );
}
