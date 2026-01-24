// src/components/charts/BarChart.tsx
import React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

interface TooltipPayload {
  payload: {
    name: string;
    [key: string]: unknown;
  };
  value: number;
  fill: string;
}

interface BarChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
  }[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
  showLegend?: boolean;
  gradient?: boolean;
}

const BarChartTooltip: React.FC<{ active?: boolean; payload?: TooltipPayload[] }> = ({
  active,
  payload,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="text-sm font-bold text-gray-900">{payload[0].payload.name}</p>
        <p className="text-lg font-black" style={{ color: payload[0].fill }}>
          {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 300,
  showValues = true,
  showLegend = false,
  gradient = true,
}) => {
  const getBarColor = (index: number, customColor?: string) => {
    if (customColor) return customColor;
    const colors = [
      "#3b82f6", // blue
      "#10b981", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#06b6d4", // cyan
      "#84cc16", // lime
    ];
    return colors[index % colors.length];
  };

  // Transform data for Recharts
  const chartData = data.map((item, index) => ({
    name: item.label,
    value: item.value,
    fill: getBarColor(index, item.color),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
        {gradient && (
          <defs>
            {chartData.map((entry, index) => (
              <linearGradient
                key={`gradient-${index}`}
                id={`gradient-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={entry.fill} stopOpacity={0.9} />
                <stop offset="95%" stopColor={entry.fill} stopOpacity={0.6} />
              </linearGradient>
            ))}
          </defs>
        )}
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickLine={false}
          angle={data.length > 8 ? -45 : 0}
          textAnchor={data.length > 8 ? "end" : "middle"}
          height={data.length > 8 ? 60 : 30}
        />
        <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip content={<BarChartTooltip />} cursor={{ fill: "rgba(59, 130, 246, 0.05)" }} />
        {showLegend && <Legend wrapperStyle={{ paddingTop: "20px" }} />}
        <Bar
          dataKey="value"
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
          label={
            showValues
              ? { position: "top", fill: "#374151", fontSize: 12, fontWeight: "bold" }
              : false
          }
          animationDuration={800}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={gradient ? `url(#gradient-${index})` : entry.fill} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};
