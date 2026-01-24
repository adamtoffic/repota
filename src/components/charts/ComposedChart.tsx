// src/components/charts/ComposedChart.tsx
import React from "react";
import {
  ComposedChart as RechartsComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TooltipPayload {
  payload: {
    name: string;
    [key: string]: unknown;
  };
  value: number | string;
  name: string;
  color: string;
}

interface ComposedChartData {
  name: string;
  [key: string]: string | number;
}

interface ComposedChartProps {
  data: ComposedChartData[];
  barKeys: { key: string; color: string; name: string }[];
  lineKeys?: { key: string; color: string; name: string }[];
  height?: number;
}

const ComposedChartTooltip: React.FC<{ active?: boolean; payload?: TooltipPayload[] }> = ({
  active,
  payload,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="mb-2 text-sm font-bold text-gray-900">{payload[0].payload.name}</p>
        {payload.map((entry: TooltipPayload, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="text-xs text-gray-600">{entry.name}:</span>
            <span className="font-bold" style={{ color: entry.color }}>
              {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ComposedChart: React.FC<ComposedChartProps> = ({
  data,
  barKeys,
  lineKeys = [],
  height = 300,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
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
        <Tooltip content={<ComposedChartTooltip />} />
        <Legend wrapperStyle={{ paddingTop: "10px" }} />

        {barKeys.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            fill={bar.color}
            name={bar.name}
            radius={[8, 8, 0, 0]}
            maxBarSize={40}
            animationDuration={800}
          />
        ))}

        {lineKeys.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color}
            strokeWidth={2}
            name={line.name}
            dot={{ fill: line.color, r: 4 }}
            activeDot={{ r: 6 }}
            animationDuration={800}
          />
        ))}
      </RechartsComposedChart>
    </ResponsiveContainer>
  );
};
