// src/components/charts/BarChart.tsx
import React, { useId } from "react";
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
import { useTheme } from "../../hooks/useTheme";
import { getChartThemeColors } from "../../utils/theme";

interface TooltipPayload {
  payload: {
    name: string;
    fill?: string;
    [key: string]: unknown;
  };
  value: number;
  fill?: string;
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
  valueFormatter?: (value: number) => string;
}

export const BarChartTooltip: React.FC<{
  active?: boolean;
  payload?: TooltipPayload[];
  valueFormatter?: (value: number) => string;
}> = ({ active, payload, valueFormatter = (value) => String(value) }) => {
  if (active && payload && payload.length) {
    const swatchColor = payload[0].payload?.fill || "#3b82f6";
    return (
      <div className="border-border bg-elevated rounded-lg border p-3 shadow-lg">
        <p className="text-main text-sm font-bold">{payload[0].payload.name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: swatchColor }}
          />
          <p className="text-primary-text text-lg font-black tabular-nums">
            {valueFormatter(payload[0].value)}
          </p>
        </div>
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
  valueFormatter = (value) => String(value),
}) => {
  const { resolvedTheme } = useTheme();
  const chartColors = getChartThemeColors(resolvedTheme);
  const chartId = useId().replace(/:/g, "");

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
    <ResponsiveContainer width="100%" height={height} debounce={50} className="chart-gpu-bars">
      <RechartsBarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
        {gradient && (
          <defs>
            {chartData.map((entry, index) => (
              <linearGradient
                key={`${chartId}-gradient-${index}`}
                id={`${chartId}-gradient-${index}`}
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
        <Tooltip
          content={<BarChartTooltip valueFormatter={valueFormatter} />}
          cursor={{ fill: chartColors.cursor }}
        />
        {showLegend && <Legend wrapperStyle={{ paddingTop: "20px" }} />}
        <Bar
          dataKey="value"
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
          label={
            showValues
              ? { position: "top", fill: chartColors.label, fontSize: 12, fontWeight: "bold" }
              : false
          }
          isAnimationActive={false}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={gradient ? `url(#${chartId}-gradient-${index})` : entry.fill}
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};
