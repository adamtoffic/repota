// src/components/charts/LineChart.tsx
import React from "react";
import {
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts";

interface TooltipPayload {
  payload: {
    name: string;
    [key: string]: unknown;
  };
  value: number;
}

interface LineChartProps {
  data: {
    label: string;
    value: number;
  }[];
  height?: number;
  color?: string;
  showDots?: boolean;
  showArea?: boolean;
  showLegend?: boolean;
}

const LineChartTooltip: React.FC<{
  active?: boolean;
  payload?: TooltipPayload[];
  color: string;
}> = ({ active, payload, color }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="text-sm font-bold text-gray-900">{payload[0].payload.name}</p>
        <p className="text-lg font-black" style={{ color }}>
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 250,
  color = "#3b82f6",
  showDots = true,
  showArea = true,
  showLegend = false,
}) => {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">No data available</div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickLine={false}
          angle={data.length > 10 ? -45 : 0}
          textAnchor={data.length > 10 ? "end" : "middle"}
          height={data.length > 10 ? 60 : 30}
        />
        <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip content={<LineChartTooltip color={color} />} />
        {showLegend && <Legend wrapperStyle={{ paddingTop: "10px" }} />}
        {showArea && (
          <Area
            type="monotone"
            dataKey="value"
            fill="url(#areaGradient)"
            stroke="none"
            animationDuration={800}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={3}
          dot={showDots ? { fill: color, r: 4 } : false}
          activeDot={{ r: 6, fill: color }}
          animationDuration={800}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
