import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CustomBarChart = ({ data }) => {
  const getBarColor = (entry) => {
    switch (entry?.priority) {
      case "Low":
        return "#14b8a6"; // teal-500 - Soft yeşil

      case "Medium":
        return "#f59e0b"; // amber-500 - Soft sarı

      case "High":
        return "#f43f5e"; // rose-500 - Soft kırmızı
      default:
        return "#14b8a6";
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-lg p-3 border border-slate-200/50">
          <p className="text-xs font-semibold text-indigo-600 mb-1">
            {payload[0].payload.priority}
          </p>
          <p className="text-sm text-gray-600">
            Count:{" "}
            <span className="text-sm font-medium text-gray-900">
              {payload[0].payload.count}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />

          <XAxis
            dataKey="priority"
            tick={{ fontSize: 12, fill: "#64748b" }}
            stroke="#cbd5e1"
          />

          <YAxis
            allowDecimals={false} // ✅ Aradaki küsuratlı sayıları siler, sadece tam sayıları gösterir.
            tick={{ fontSize: 12, fill: "#64748b" }}
            stroke="#cbd5e1"
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(99, 102, 241, 0.1)" }}
          />

          <Bar dataKey="count" nameKey="priority" radius={[10, 10, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry)} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomBarChart;
