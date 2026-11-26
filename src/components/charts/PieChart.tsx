// src/components/charts/PieChart.tsx
import React from "react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../../hooks/useTheme";
import { getChartThemeColors } from "../../utils/theme";

const RADIAN = Math.PI / 180;

interface PieTooltipPayload {
  name?: string;
  value?: number;
  payload?: {
    name?: string;
    color?: string;
  };
}

export const PieChartTooltip: React.FC<{
  active?: boolean;
  payload?: PieTooltipPayload[];
}> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const swatchColor = item.payload?.color || "#3b82f6";
    const label = item.payload?.name || item.name || "";
    return (
      <div className="border-border bg-elevated rounded-lg border px-3 py-2 shadow-lg">
        <p className="text-main text-xs font-bold">{label}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: swatchColor }}
          />
          <p className="text-primary-text text-sm font-black tabular-nums">{item.value}</p>
        </div>
      </div>
    );
  }
  return null;
};

interface PieChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
  }[];
  size?: number;
  showLegend?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({ data, size = 200, showLegend = true }) => {
  const { resolvedTheme } = useTheme();
  const chartColors = getChartThemeColors(resolvedTheme);

  const getColor = (index: number, customColor?: string) => {
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

  const chartData = data.map((item, index) => ({
    name: item.label,
    value: item.value,
    color: item.color || getColor(index),
  }));

  const outerRadius = size / 2.6;

  const renderCustomLabel = (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    percent?: number;
  }) => {
    if (!props.percent || props.percent < 0.05) return null;
    const cx = props.cx ?? size / 2;
    const cy = props.cy ?? size / 2;
    const midAngle = props.midAngle ?? 0;
    const radius = outerRadius + 12;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={chartColors.label}
        textAnchor={x >= cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={700}
      >
        {`${(props.percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={size} debounce={50} className="chart-gpu-pie">
        <RechartsPieChart margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={outerRadius}
            innerRadius={size / 5}
            paddingAngle={2}
            dataKey="value"
            isAnimationActive={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<PieChartTooltip />} />
        </RechartsPieChart>
      </ResponsiveContainer>

      {showLegend && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-secondary truncate">{item.name}</span>
              <span className="text-muted ml-auto">({item.value})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
