"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DailyMetric } from "@/lib/data";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  data: DailyMetric[];
}

export default function ReachChart({ data }: Props) {
  const chartData = data.map((d) => ({
    date: d.date,
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    Alcance: d.reach ?? 0,
    Visualizações: d.views ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3550" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={3}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#131928",
            border: "1px solid #2a3550",
            borderRadius: "8px",
            color: "#f1f5f9",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#94a3b8" }}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", color: "#94a3b8", paddingTop: "8px" }}
        />
        <Area
          type="monotone"
          dataKey="Alcance"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#colorReach)"
          dot={false}
          activeDot={{ r: 4, fill: "#3b82f6" }}
        />
        <Area
          type="monotone"
          dataKey="Visualizações"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#colorViews)"
          dot={false}
          activeDot={{ r: 4, fill: "#f59e0b" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
