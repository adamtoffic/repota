// src/components/charts/PieChart.tsx
import React from "react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

  const renderCustomLabel = (props: { percent?: number }) => {
    if (!props.percent || props.percent < 0.05) return null;
    return `${(props.percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={size}>
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={size / 2.5}
            innerRadius={size / 5}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "8px 12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          />
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
              <span className="truncate text-gray-700">{item.name}</span>
              <span className="ml-auto text-gray-500">({item.value})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
