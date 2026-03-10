"use client";

import { motion } from "framer-motion";

interface Client {
  client: string;
  weekly: number;
  monthly: number;
  status: "active" | "paused";
}

interface ClientTableProps {
  clients: Client[];
  filters: {
    client: string | null;
    year: number;
  };
}

export default function ClientTable({ clients, filters }: ClientTableProps) {
  let filtered = clients;

  if (filters.client) {
    filtered = filtered.filter((c) => c.client === filters.client);
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden border border-transparent dark:border-slate-700"
    >
      <table className="w-full">
        <thead className="bg-gray-100 dark:bg-slate-800">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
              Client
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
              Status
            </th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">
              Weekly
            </th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">
              Monthly
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
          {filtered.map((client, i) => (
            <motion.tr
              key={`${client.client}-${i}`}
              variants={rowVariants}
              className={`hover:bg-gray-50 dark:hover:bg-slate-800 transition ${
                client.status === "paused" ? "opacity-60" : ""
              }`}
            >
              <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">
                {client.client}
              </td>
              <td className="px-6 py-4 text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    client.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {client.status === "active" ? "Active" : "Paused"}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 dark:text-slate-100">
                {client.weekly}
              </td>
              <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">
                {client.monthly}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
          No clients found
        </div>
      )}
    </motion.div>
  );
}
