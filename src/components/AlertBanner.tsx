"use client";

interface Props {
  type: "warning" | "info" | "success" | "danger";
  title: string;
  message: string;
  action?: { label: string; href: string };
}

const styles = {
  warning: { bg: "#2d1f0a", border: "#78350f", icon: "⚠️", color: "#fbbf24" },
  info: { bg: "#0c1d38", border: "#1e3a5f", icon: "ℹ️", color: "#60a5fa" },
  success: { bg: "#0a2218", border: "#14532d", icon: "✅", color: "#34d399" },
  danger: { bg: "#1f0a0a", border: "#7f1d1d", icon: "🚨", color: "#f87171" },
};

export default function AlertBanner({ type, title, message, action }: Props) {
  const s = styles[type];
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="text-lg mt-0.5 shrink-0">{s.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: s.color }}>{title}</p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#94a3b8" }}>{message}</p>
      </div>
      {action && (
        <a
          href={action.href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ background: s.color, color: "#0b0f1a" }}
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
