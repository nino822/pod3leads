"use client";

import { motion } from "framer-motion";

interface PodStatsProps {
  stats: {
    weekly: number;
    monthly: number;
    activeClients: number;
  };
}

export default function PodStats({ stats }: PodStatsProps) {
  const cards = [
    {
      title: "Leads This Week",
      value: stats.weekly,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Leads This Month",
      value: stats.monthly,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Active Clients",
      value: stats.activeClients,
      color: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`bg-gradient-to-r ${card.color} text-white rounded-lg shadow-lg p-6`}
        >
          <p className="text-sm font-semibold opacity-90">{card.title}</p>
          <p className="text-4xl font-bold mt-2">{card.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
