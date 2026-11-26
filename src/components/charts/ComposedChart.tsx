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
import { useTheme } from "../../hooks/useTheme";
import { getChartThemeColors } from "../../utils/theme";

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
      <div className="border-border bg-elevated rounded-lg border p-3 shadow-lg">
        <p className="text-main mb-2 text-sm font-bold">{payload[0].payload.name}</p>
        {payload.map((entry: TooltipPayload, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="text-muted inline-flex items-center gap-1.5 text-xs">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="text-main font-bold tabular-nums">
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
  const { resolvedTheme } = useTheme();
  const chartColors = getChartThemeColors(resolvedTheme);

  return (
    <ResponsiveContainer width="100%" height={height} debounce={50} className="chart-gpu-bars">
      <RechartsComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: chartColors.axis, fontSize: 12 }}
          tickLine={false}
          angle={data.length > 8 ? -45 : 0}
          textAnchor={data.length > 8 ? "end" : "middle"}
          height={data.length > 8 ? 60 : 30}
        />
        <YAxis tick={{ fill: chartColors.axis, fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip content={<ComposedChartTooltip />} cursor={{ fill: chartColors.cursor }} />
        <Legend wrapperStyle={{ paddingTop: "10px" }} />

        {barKeys.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            fill={bar.color}
            name={bar.name}
            radius={[8, 8, 0, 0]}
            maxBarSize={40}
            isAnimationActive={false}
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
            isAnimationActive={false}
          />
        ))}
      </RechartsComposedChart>
    </ResponsiveContainer>
  );
};
