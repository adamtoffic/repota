// src/components/charts/RadarChart.tsx
import React from "react";
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useTheme } from "../../hooks/useTheme";
import { getChartThemeColors } from "../../utils/theme";

interface TooltipPayload {
  payload: {
    subject: string;
    [key: string]: unknown;
  };
  value: number;
}

interface RadarChartProps {
  data: {
    subject: string;
    score: number;
    fullMark?: number;
  }[];
  height?: number;
  color?: string;
  showLegend?: boolean;
}

const RadarChartTooltip: React.FC<{
  active?: boolean;
  payload?: TooltipPayload[];
  color: string;
}> = ({ active, payload, color }) => {
  if (active && payload && payload.length) {
    return (
      <div className="border-border bg-elevated rounded-lg border p-3 shadow-lg">
        <p className="text-main text-sm font-bold">{payload[0].payload.subject}</p>
        <p className="text-lg font-black" style={{ color }}>
          {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  height = 350,
  color = "#3b82f6",
  showLegend = false,
}) => {
  const { resolvedTheme } = useTheme();
  const chartColors = getChartThemeColors(resolvedTheme);

  const chartData = data.map((item) => ({
    subject: item.subject.length > 15 ? item.subject.substring(0, 13) + "..." : item.subject,
    score: item.score,
    fullMark: item.fullMark || 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={height} debounce={50} className="chart-gpu-radar">
      <RechartsRadarChart data={chartData}>
        <PolarGrid stroke={chartColors.grid} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: chartColors.axis, fontSize: 11 }} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: chartColors.axis, fontSize: 10 }}
        />
        <Radar
          name="Performance"
          dataKey="score"
          stroke={color}
          fill={color}
          fillOpacity={0.5}
          strokeWidth={2}
          isAnimationActive={false}
          dot={{ fill: color, r: 4 }}
        />
        <Tooltip content={<RadarChartTooltip color={color} />} />
        {showLegend && <Legend />}
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
};
