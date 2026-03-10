"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

interface Client {
  client: string;
  weekly: number;
  monthly: number;
  status: "active" | "paused";
}

interface ChartsProps {
  clients: Client[];
}

export default function Charts({ clients }: ChartsProps) {
  const activeClients = clients.filter((c) => c.status === "active");

  // Leads per client
  const leadsPerClientData = activeClients
    .sort((a, b) => b.monthly - a.monthly)
    .map((c) => ({
      name: c.client,
      value: c.monthly,
    }));

  // Top performing clients
  const topClients = activeClients
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 10)
    .map((c) => ({
      name: c.client,
      leads: c.monthly,
    }));

  // Low performing clients
  const lowClients = activeClients
    .sort((a, b) => a.monthly - b.monthly)
    .slice(0, 5)
    .map((c) => ({
      name: c.client,
      leads: c.monthly,
    }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const chartVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
    >
      {/* Top Clients */}
      <motion.div
        variants={chartVariants}
        className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-transparent dark:border-slate-700"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Top 10 Performing Clients</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topClients}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="leads" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Low Clients */}
      <motion.div
        variants={chartVariants}
        className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-transparent dark:border-slate-700"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Low Performing Clients</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={lowClients}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="leads" fill="#ef4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Overall Distribution */}
      <motion.div
        variants={chartVariants}
        className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 lg:col-span-2 border border-transparent dark:border-slate-700"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Lead Distribution by Client</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={leadsPerClientData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}
