"use client";

import { useState } from "react";

interface FiltersProps {
  onFilterChange: (filters: {
    client: string | null;
    year: number;
    hidePaused: boolean;
  }) => void;
}

export default function Filters({ onFilterChange }: FiltersProps) {
  const [client, setClient] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [hidePaused, setHidePaused] = useState(false);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    setClient(value);
    onFilterChange({ client: value, year, hidePaused });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    setYear(value);
    onFilterChange({ client, year: value, hidePaused });
  };

  const handleHidePausedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setHidePaused(checked);
    onFilterChange({ client, year, hidePaused: checked });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Filters</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <select
            value={year}
            onChange={handleYearChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client (Optional)
          </label>
          <select
            value={client || ""}
            onChange={handleClientChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Clients</option>
            {/* Client options will be populated from data */}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={hidePaused}
            onChange={handleHidePausedChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Hide paused accounts
        </label>
      </div>
    </div>
  );
}
