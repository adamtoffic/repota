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
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="text-sm font-bold text-gray-900">{payload[0].payload.subject}</p>
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
  const chartData = data.map((item) => ({
    subject: item.subject.length > 15 ? item.subject.substring(0, 13) + "..." : item.subject,
    score: item.score,
    fullMark: item.fullMark || 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart data={chartData}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "#6b7280", fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} />
        <Radar
          name="Performance"
          dataKey="score"
          stroke={color}
          fill={color}
          fillOpacity={0.5}
          strokeWidth={2}
          animationDuration={800}
          dot={{ fill: color, r: 4 }}
        />
        <Tooltip content={<RadarChartTooltip color={color} />} />
        {showLegend && <Legend />}
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
};
