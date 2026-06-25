"use client";

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
  trend?: number;
}

export default function KPICard({ label, value, sub, icon, accent = "#3b82f6", trend }: KPICardProps) {
  const trendColor = trend === undefined ? "" : trend >= 0 ? "#10b981" : "#ef4444";
  const trendSign = trend !== undefined && trend >= 0 ? "+" : "";

  return (
    <div
      className="relative rounded-xl p-5 flex flex-col gap-3 overflow-hidden"
      style={{ background: "#1a2236", border: "1px solid #2a3550" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748b" }}>
          {label}
        </span>
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{ background: `${accent}22`, color: accent }}
        >
          {icon}
        </span>
      </div>
      <div>
        <div className="text-3xl font-bold tracking-tight" style={{ color: "#f1f5f9" }}>
          {value}
        </div>
        {(sub || trend !== undefined) && (
          <div className="flex items-center gap-2 mt-1">
            {trend !== undefined && (
              <span className="text-xs font-semibold" style={{ color: trendColor }}>
                {trendSign}{trend}%
              </span>
            )}
            {sub && <span className="text-xs" style={{ color: "#64748b" }}>{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
