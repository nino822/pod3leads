"use client";

import { useState, useRef, useEffect } from "react";

interface ExportOption {
  label: string;
  key: string;
  action: () => Promise<void> | void;
}

interface ExportMenuProps {
  options: ExportOption[];
  disabled?: boolean;
}

export default function ExportMenu({ options, disabled = false }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const runExport = async (key: string, action: () => Promise<void> | void) => {
    try {
      setExporting(key);
      await action();
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || exporting !== null}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition disabled:opacity-50 flex items-center gap-2"
      >
        {exporting ? "..." : "Export"}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "transform rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-md shadow-lg z-50">
          {options.map((option) => (
            <button
              key={option.key}
              onClick={() => runExport(option.key, option.action)}
              disabled={exporting !== null}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed first:rounded-t-md last:rounded-b-md transition"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{option.label}</span>
              {exporting === option.key && <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">exporting...</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
