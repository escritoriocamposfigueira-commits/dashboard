"use client";

import { useState, useEffect } from "react";
import calendario from "@/content/calendario-julho-2026.json";

type Post = (typeof calendario.posts)[number];
type Status = "idle" | "ok" | "erro";

type PostStatus = {
  facebook: Status;
  instagram: Status;
  fbId?: string;
  igId?: string;
  erro?: string;
};

export default function AgendadorPage() {
  const [token, setToken] = useState("");
  const [tokenNome, setTokenNome] = useState<string | null>(null);
  const [tokenValido, setTokenValido] = useState<boolean | null>(null);
  const [verificando, setVerificando] = useState(false);

  const [agendandoFb, setAgendandoFb] = useState(false);
  const [fbProgresso, setFbProgresso] = useState(0);
  const [fbResultados, setFbResultados] = useState<Record<string, PostStatus>>({});

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [igPublicando, setIgPublicando] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const salvo = localStorage.getItem("meta_token");
    if (salvo) setToken(salvo);
  }, []);

  async function verificarToken() {
    if (!token.trim()) return;
    setVerificando(true);
    setTokenValido(null);
    try {
      const res = await fetch("/api/meta/verificar-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setTokenValido(data.valido);
      setTokenNome(data.nome ?? null);
      if (data.valido) localStorage.setItem("meta_token", token);
    } catch {
      setTokenValido(false);
    } finally {
      setVerificando(false);
    }
  }

  async function agendarTodosFacebook() {
    if (!token.trim()) return;
    setAgendandoFb(true);
    setFbProgresso(0);
    setFbResultados({});

    const res = await fetch("/api/meta/agendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();

    const mapa: Record<string, PostStatus> = {};
    for (const r of data.results) {
      mapa[r.ref] = {
        facebook: r.status,
        fbId: r.id,
        erro: r.erro,
        instagram: fbResultados[r.ref]?.instagram ?? "idle",
        igId: fbResultados[r.ref]?.igId,
      };
    }
    setFbResultados(mapa);
    setFbProgresso(data.ok);
    setAgendandoFb(false);
  }

  async function publicarInstagram(post: Post) {
    const imgUrl = imageUrls[post.ref];
    if (!imgUrl || !token.trim()) return;

    setIgPublicando((p) => ({ ...p, [post.ref]: true }));
    try {
      const res = await fetch("/api/meta/publicar-instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ref: post.ref, caption: post.caption, imageUrl: imgUrl }),
      });
      const data = await res.json();
      setFbResultados((prev) => ({
        ...prev,
        [post.ref]: {
          ...prev[post.ref],
          instagram: data.status,
          igId: data.id,
          erro: data.erro,
          facebook: prev[post.ref]?.facebook ?? "idle",
        },
      }));
    } finally {
      setIgPublicando((p) => ({ ...p, [post.ref]: false }));
    }
  }

  const fbOk = Object.values(fbResultados).filter((r) => r.facebook === "ok").length;
  const igOk = Object.values(fbResultados).filter((r) => r.instagram === "ok").length;

  return (
    <div className="min-h-screen p-6" style={{ background: "#0b0f1a", color: "#f1f5f9" }}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #1877f2, #833ab4)" }}
          >
            📣
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Agendador Meta</h1>
            <p className="text-xs" style={{ color: "#64748b" }}>Facebook + Instagram — 40 posts · Julho 2026</p>
          </div>
          <a href="/" className="ml-auto text-xs px-3 py-1.5 rounded-lg" style={{ background: "#1e3a5f", color: "#60a5fa" }}>
            ← Dashboard
          </a>
        </div>

        {/* Token */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">🔑 Page Access Token</h2>
            {tokenValido === true && (
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#14532d", color: "#34d399" }}>
                ✅ {tokenNome}
              </span>
            )}
            {tokenValido === false && (
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#7f1d1d", color: "#f87171" }}>
                ❌ Token inválido
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole seu Page Access Token aqui"
              className="flex-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: "#0b0f1a", border: "1px solid #2a3550" }}
            />
            <button
              onClick={verificarToken}
              disabled={verificando || !token}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: "#1877f2", color: "white" }}
            >
              {verificando ? "Verificando..." : "Verificar"}
            </button>
          </div>

          <details className="text-xs" style={{ color: "#64748b" }}>
            <summary className="cursor-pointer hover:text-white">Como obter o token gratuito (3 passos)</summary>
            <ol className="mt-3 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Acesse{" "}
                <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa" }}>
                  developers.facebook.com/tools/explorer
                </a>
              </li>
              <li>
                Selecione seu App → clique em <strong style={{ color: "#f1f5f9" }}>"Gerar Token"</strong> → marque as permissões:
                <code className="mx-1 px-1 rounded" style={{ background: "#0b0f1a" }}>pages_manage_posts</code>
                <code className="mx-1 px-1 rounded" style={{ background: "#0b0f1a" }}>instagram_content_publish</code>
                <code className="mx-1 px-1 rounded" style={{ background: "#0b0f1a" }}>instagram_basic</code>
                <code className="mx-1 px-1 rounded" style={{ background: "#0b0f1a" }}>pages_read_engagement</code>
              </li>
              <li>
                Acesse{" "}
                <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa" }}>
                  Access Token Debugger
                </a>{" "}
                → clique <strong style={{ color: "#f1f5f9" }}>"Estender Token de Acesso"</strong> (válido 60 dias).
                Depois no Explorer, clique em <strong style={{ color: "#f1f5f9" }}>Escritório Campos Figueira (Page)</strong> para gerar o Page Token permanente.
              </li>
            </ol>
          </details>
        </div>

        {/* Facebook — Agendar Todos */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">📘 Facebook — Agendar 40 Posts</h2>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                Agenda todos os posts no Facebook Planner com data e hora exatas
              </p>
            </div>
            <div className="text-right">
              {fbOk > 0 && (
                <span className="text-xs font-bold" style={{ color: "#34d399" }}>{fbOk}/40 agendados</span>
              )}
            </div>
          </div>

          <button
            onClick={agendarTodosFacebook}
            disabled={agendandoFb || !token || tokenValido === false}
            className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ background: "#1877f2", color: "white" }}
          >
            {agendandoFb ? `Agendando... (${fbProgresso}/40)` : "🚀 Agendar Todos os 40 Posts no Facebook"}
          </button>

          {Object.keys(fbResultados).length > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {calendario.posts.map((post) => {
                const s = fbResultados[post.ref];
                return (
                  <div key={post.ref} className="flex items-center gap-3 py-1.5 px-3 rounded-lg text-xs" style={{ background: "#0b0f1a" }}>
                    <span className="font-mono w-8 shrink-0" style={{ color: "#64748b" }}>{post.ref}</span>
                    <span className="flex-1 truncate" style={{ color: "#94a3b8" }}>{post.imovel}</span>
                    <span style={{ color: "#64748b" }}>{post.data} {post.hora}</span>
                    {s?.facebook === "ok" && <span style={{ color: "#34d399" }}>✅ FB</span>}
                    {s?.facebook === "erro" && (
                      <span title={s.erro} style={{ color: "#f87171" }}>❌ {s.erro?.slice(0, 30)}</span>
                    )}
                    {!s && <span style={{ color: "#334155" }}>—</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Instagram — Por Post */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          <div>
            <h2 className="text-sm font-bold text-white">📸 Instagram — Publicar por Post</h2>
            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
              Cole a URL pública da foto para cada post e clique em Publicar.
              {igOk > 0 && <span style={{ color: "#34d399" }}> {igOk} publicados.</span>}
            </p>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {calendario.posts.map((post) => {
              const igStatus = fbResultados[post.ref]?.instagram;
              const publicando = igPublicando[post.ref];
              return (
                <div
                  key={post.ref}
                  className="rounded-lg p-3 space-y-2"
                  style={{
                    background: "#0b0f1a",
                    border: `1px solid ${igStatus === "ok" ? "#14532d" : igStatus === "erro" ? "#7f1d1d" : "#2a3550"}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      <span className="font-mono text-xs" style={{ color: "#64748b" }}>{post.ref}</span>
                      <p className="text-xs font-semibold text-white">{post.imovel}</p>
                      <p className="text-xs" style={{ color: "#64748b" }}>{post.data} · {post.hora}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#94a3b8" }}>
                        {post.caption.split("\n")[0]}
                      </p>
                    </div>
                    {igStatus === "ok" && (
                      <span className="text-xs shrink-0" style={{ color: "#34d399" }}>✅ Publicado</span>
                    )}
                    {igStatus === "erro" && (
                      <span className="text-xs shrink-0" style={{ color: "#f87171" }}>❌ Erro</span>
                    )}
                  </div>
                  {igStatus !== "ok" && (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={imageUrls[post.ref] ?? ""}
                        onChange={(e) => setImageUrls((prev) => ({ ...prev, [post.ref]: e.target.value }))}
                        placeholder="https://... URL pública da foto"
                        className="flex-1 px-2 py-1.5 rounded text-xs text-white outline-none"
                        style={{ background: "#131928", border: "1px solid #2a3550" }}
                      />
                      <button
                        onClick={() => publicarInstagram(post)}
                        disabled={publicando || !imageUrls[post.ref] || !token}
                        className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #833ab4, #fd1d1d)", color: "white" }}
                      >
                        {publicando ? "..." : "Publicar"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs pb-4" style={{ color: "#334155" }}>
          Central de Marketing · Escritório Campos Figueira · Meta Graph API v22.0
        </p>
      </div>
    </div>
  );
}
