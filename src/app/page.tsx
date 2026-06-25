import KPICard from "@/components/KPICard";
import AlertBanner from "@/components/AlertBanner";
import ReachChart from "@/components/ReachChart";
import EngagementChart from "@/components/EngagementChart";
import FbChart from "@/components/FbChart";
import {
  igProfile,
  igDaily,
  fbDailyRaw,
  computeIgTotals,
  computeFbTotals,
} from "@/lib/data";

const ig = computeIgTotals(igDaily);
const fb = computeFbTotals(fbDailyRaw);

const engRate = ig.reach > 0
  ? ((ig.interactions / ig.reach) * 100).toFixed(1)
  : "0.0";

const fbEngRate = fb.impressions > 0
  ? ((fb.clicks / fb.impressions) * 100).toFixed(1)
  : "0.0";

export default function DashboardPage() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen" style={{ background: "#0b0f1a" }}>
      {/* Sidebar */}
      <aside
        className="w-64 shrink-0 flex flex-col border-r"
        style={{ background: "#131928", borderColor: "#2a3550" }}
      >
        <div className="p-5 border-b" style={{ borderColor: "#2a3550" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #1877f2, #3b82f6)" }}
            >
              CF
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Campos Figueira</p>
              <p className="text-xs" style={{ color: "#64748b" }}>Central de Marketing</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {[
            { icon: "📊", label: "Visão Geral", active: true },
            { icon: "📸", label: "Instagram", active: false },
            { icon: "📘", label: "Facebook", active: false },
            { icon: "📣", label: "Anúncios", active: false, badge: "!" },
            { icon: "📅", label: "Calendário", active: false },
            { icon: "🔍", label: "Auditoria", active: false },
            { icon: "📈", label: "Relatórios", active: false },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
              style={{
                background: item.active ? "#1e3a5f" : "transparent",
                color: item.active ? "#60a5fa" : "#94a3b8",
              }}
            >
              <span className="text-sm">{item.icon}</span>
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "#ef4444", color: "white" }}
                >
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: "#2a3550" }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "#64748b" }}>
            Integrações
          </p>
          {[
            { label: "Instagram", connected: true },
            { label: "Facebook Orgânico", connected: true },
            { label: "Facebook Leads", connected: true },
            { label: "Meta Ads", connected: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 py-1">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: item.connected ? "#10b981" : "#ef4444" }}
              />
              <span className="text-xs" style={{ color: item.connected ? "#94a3b8" : "#f87171" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ background: "#131928", borderColor: "#2a3550" }}
        >
          <div>
            <h1 className="text-lg font-bold text-white">Visão Geral</h1>
            <p className="text-xs capitalize" style={{ color: "#64748b" }}>{dateStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: "#1e3a5f", color: "#60a5fa" }}
            >
              Últimos 30 dias
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #833ab4, #fd1d1d)" }}
            >
              @
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">

          <AlertBanner
            type="warning"
            title="Meta Ads não conectado — anúncios indisponíveis"
            message="Conecte o Meta Ads para visualizar campanhas, orçamentos, custo por lead e alcance pago do Facebook e Instagram."
            action={{
              label: "Conectar agora →",
              href: "https://onboard.windsor.ai/token_login?access_token=7rMAzoyW4igP1tKpAjT3RSSdCOd7aBrJcIWu6RrPHj&next=/app/facebook",
            }}
          />

          {/* Perfil Instagram */}
          <div
            className="rounded-xl p-4 flex items-center gap-4"
            style={{
              background: "linear-gradient(135deg, #1a0d2e 0%, #1a2236 100%)",
              border: "1px solid #2a3550",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)" }}
            >
              IG
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">{igProfile.name}</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>@{igProfile.username}</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-xl font-bold text-white">{igProfile.followers_count.toLocaleString("pt-BR")}</p>
                <p className="text-xs" style={{ color: "#64748b" }}>Seguidores</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{igProfile.media_count.toLocaleString("pt-BR")}</p>
                <p className="text-xs" style={{ color: "#64748b" }}>Publicações</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{engRate}%</p>
                <p className="text-xs" style={{ color: "#64748b" }}>Engaj. 30d</p>
              </div>
            </div>
          </div>

          {/* KPIs Instagram */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>
              Instagram — últimos 30 dias
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Alcance Total" value={ig.reach.toLocaleString("pt-BR")} icon="👁️" accent="#833ab4" sub="contas únicas atingidas" />
              <KPICard label="Visualizações" value={ig.views.toLocaleString("pt-BR")} icon="▶️" accent="#fd1d1d" sub="plays em reels e posts" />
              <KPICard label="Interações" value={ig.interactions.toLocaleString("pt-BR")} icon="❤️" accent="#f59e0b" sub={`${ig.likes} curtidas · ${ig.shares} comp.`} />
              <KPICard label="Novos Seguidores" value={`+${ig.newFollowers}`} icon="👥" accent="#10b981" sub="ganhos no período" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <KPICard label="Salvamentos" value={ig.saves} icon="🔖" accent="#6366f1" sub="conteúdo salvo" />
              <KPICard label="Comentários" value={ig.comments} icon="💬" accent="#06b6d4" sub="comentários recebidos" />
              <KPICard label="Taxa de Engaj." value={`${engRate}%`} icon="📊" accent="#ec4899" sub="interações ÷ alcance" />
              <KPICard label="Curtidas Totais" value={ig.likes} icon="👍" accent="#f97316" sub="reações nos posts" />
            </div>
          </div>

          {/* Charts Instagram */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
              <h3 className="text-sm font-semibold text-white mb-4">Alcance × Visualizações</h3>
              <ReachChart data={igDaily} />
            </div>
            <div className="rounded-xl p-5" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
              <h3 className="text-sm font-semibold text-white mb-4">Engajamento × Novos Seguidores</h3>
              <EngagementChart data={igDaily} />
            </div>
          </div>

          {/* KPIs Facebook */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>
              Facebook Orgânico — últimos 30 dias
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPICard label="Impressões" value={fb.impressions.toLocaleString("pt-BR")} icon="📢" accent="#1877f2" sub="vezes que posts foram vistos" />
              <KPICard label="Cliques em Posts" value={fb.clicks} icon="🖱️" accent="#0ea5e9" sub={`CTR: ${fbEngRate}%`} />
              <KPICard label="Reações" value={fb.reactions} icon="❤️" accent="#3b82f6" sub="curtidas e reações" />
            </div>
          </div>

          {/* Chart Facebook */}
          <div className="rounded-xl p-5" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Impressões × Cliques — Facebook Orgânico</h3>
            <FbChart data={fbDailyRaw} />
          </div>

          {/* Meta Ads placeholder */}
          <div
            className="rounded-xl p-8 flex flex-col items-center justify-center text-center"
            style={{ background: "#1a2236", border: "1px dashed #2a3550" }}
          >
            <span className="text-4xl mb-3">📣</span>
            <h3 className="text-sm font-bold text-white mb-1">Meta Ads — Gerenciador de Anúncios</h3>
            <p className="text-xs mb-4 max-w-sm" style={{ color: "#64748b" }}>
              Campanhas, conjuntos de anúncios, criativos, orçamento diário, custo por lead, alcance pago e conversões disponíveis após conectar.
            </p>
            <a
              href="https://onboard.windsor.ai/token_login?access_token=7rMAzoyW4igP1tKpAjT3RSSdCOd7aBrJcIWu6RrPHj&next=/app/facebook"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-5 py-2.5 rounded-lg"
              style={{ background: "#1877f2", color: "white" }}
            >
              Conectar Meta Ads →
            </a>
          </div>

          {/* Diagnóstico */}
          <div className="rounded-xl p-5" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
            <h3 className="text-sm font-bold text-white mb-4">🔍 Diagnóstico — 30 dias</h3>
            <div className="space-y-3">
              {[
                { s: "danger", t: `Taxa de engajamento Instagram: ${engRate}% — abaixo de 1%. Alcance chegou a 246 em 16/06 mas interações não acompanharam.` },
                { s: "warning", t: `Salvamentos muito baixos (${ig.saves} em 30 dias) — conteúdo não está sendo percebido como referência.` },
                { s: "warning", t: `Comentários: ${ig.comments} no período — ausência de CTAs conversacionais e perguntas abertas.` },
                { s: "info", t: `+${ig.newFollowers} novos seguidores em 30 dias — crescimento real mas irregular. Picos em 27/05 (6) e 30/05 (8).` },
                { s: "success", t: `Facebook: ${fb.clicks} cliques com CTR de ${fbEngRate}% — desempenho razoável para página orgânica.` },
              ].map((item, i) => {
                const dots: Record<string, string> = { danger: "🔴", warning: "🟡", info: "🔵", success: "🟢" };
                return (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-sm shrink-0 mt-0.5">{dots[item.s]}</span>
                    <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{item.t}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-xs pb-2" style={{ color: "#334155" }}>
            Central de Marketing · Escritório Campos Figueira · Dados via Windsor.ai · {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>
      </main>
    </div>
  );
}
