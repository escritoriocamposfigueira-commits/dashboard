"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { DailyMetric } from "@/lib/data";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  data: DailyMetric[];
}

export default function EngagementChart({ data }: Props) {
  const chartData = data.map((d) => ({
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    Interações: Math.max(d.total_interactions ?? 0, 0),
    Seguidores: d.follower_count ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3550" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#64748b", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "#131928",
            border: "1px solid #2a3550",
            borderRadius: "8px",
            color: "#f1f5f9",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="Interações" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={14}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={chartData[i].Interações > 4 ? "#10b981" : "#1e4d3b"} />
          ))}
        </Bar>
        <Bar dataKey="Seguidores" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
