"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { FbDailyMetric } from "@/lib/data";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  data: FbDailyMetric[];
}

export default function FbChart({ data }: Props) {
  const chartData = data.map((d) => ({
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    Impressões: d.impressions,
    Cliques: d.clicks,
    Reações: d.reactions,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3550" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#64748b", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={2}
        />
        <YAxis yAxisId="left" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "#131928",
            border: "1px solid #2a3550",
            borderRadius: "8px",
            color: "#f1f5f9",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8", paddingTop: "8px" }} />
        <Bar yAxisId="left" dataKey="Impressões" fill="#1877f2" radius={[3, 3, 0, 0]} maxBarSize={16} opacity={0.8} />
        <Line yAxisId="right" type="monotone" dataKey="Cliques" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
