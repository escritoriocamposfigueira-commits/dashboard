"use client";

import { useState, useEffect } from "react";
import calendario from "@/content/calendario-julho-2026.json";

type Post = (typeof calendario.posts)[number];
type Status = "idle" | "ok" | "erro";

type GrupoStatus = { nome: string; status: Status; erro?: string };

type PostStatus = {
  facebook: Status;
  instagram: Status;
  grupos?: GrupoStatus[];
  fbId?: string;
  igId?: string;
  erro?: string;
};

const GRUPOS_NOMES = [
  "Venda e Locação MDC",
  "Negócios MDC",
  "Grupo MDC (618...)",
];

export default function AgendadorPage() {
  const [token, setToken] = useState("");
  const [tokenNome, setTokenNome] = useState<string | null>(null);
  const [tokenValido, setTokenValido] = useState<boolean | null>(null);
  const [verificando, setVerificando] = useState(false);

  // User Token separado — necessário para grupos
  const [userToken, setUserToken] = useState("");
  const [userTokenNome, setUserTokenNome] = useState<string | null>(null);
  const [userTokenValido, setUserTokenValido] = useState<boolean | null>(null);
  const [verificandoUser, setVerificandoUser] = useState(false);

  const [agendandoFb, setAgendandoFb] = useState(false);
  const [fbProgresso, setFbProgresso] = useState(0);
  const [fbResultados, setFbResultados] = useState<Record<string, PostStatus>>({});

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [igPublicando, setIgPublicando] = useState<Record<string, boolean>>({});
  const [gruposPublicando, setGruposPublicando] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const salvo = localStorage.getItem("meta_token");
    if (salvo) setToken(salvo);
    const savedUser = localStorage.getItem("meta_user_token");
    if (savedUser) setUserToken(savedUser);
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

  async function verificarUserToken() {
    if (!userToken.trim()) return;
    setVerificandoUser(true);
    setUserTokenValido(null);
    try {
      const res = await fetch("/api/meta/verificar-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: userToken }),
      });
      const data = await res.json();
      setUserTokenValido(data.valido);
      setUserTokenNome(data.nome ?? null);
      if (data.valido) localStorage.setItem("meta_user_token", userToken);
    } catch {
      setUserTokenValido(false);
    } finally {
      setVerificandoUser(false);
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
        grupos: fbResultados[r.ref]?.grupos,
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

  async function publicarNosGrupos(post: Post) {
    if (!userToken.trim()) return;
    setGruposPublicando((p) => ({ ...p, [post.ref]: true }));
    try {
      const res = await fetch("/api/meta/publicar-grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userToken,
          ref: post.ref,
          message: post.caption,
          imageUrl: imageUrls[post.ref] ?? undefined,
        }),
      });
      const data = await res.json();
      setFbResultados((prev) => ({
        ...prev,
        [post.ref]: {
          ...prev[post.ref],
          facebook: prev[post.ref]?.facebook ?? "idle",
          instagram: prev[post.ref]?.instagram ?? "idle",
          grupos: data.results.map((r: { nome: string; status: string; erro?: string }) => ({
            nome: r.nome,
            status: r.status as Status,
            erro: r.erro,
          })),
        },
      }));
    } finally {
      setGruposPublicando((p) => ({ ...p, [post.ref]: false }));
    }
  }

  const fbOk = Object.values(fbResultados).filter((r) => r.facebook === "ok").length;
  const igOk = Object.values(fbResultados).filter((r) => r.instagram === "ok").length;
  const gruposOk = Object.values(fbResultados).filter(
    (r) => r.grupos && r.grupos.every((g) => g.status === "ok")
  ).length;

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
            <p className="text-xs" style={{ color: "#64748b" }}>
              Facebook + Instagram + Grupos — 40 posts · Julho 2026
            </p>
          </div>
          <a href="/" className="ml-auto text-xs px-3 py-1.5 rounded-lg" style={{ background: "#1e3a5f", color: "#60a5fa" }}>
            ← Dashboard
          </a>
        </div>

        {/* Tokens */}
        <div className="rounded-xl p-5 space-y-5" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          {/* Page Token */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">🔑 Page Access Token</h2>
              {tokenValido === true && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#14532d", color: "#34d399" }}>
                  ✅ {tokenNome}
                </span>
              )}
              {tokenValido === false && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#7f1d1d", color: "#f87171" }}>
                  ❌ Inválido
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Usado para agendar no Facebook Page e publicar no Instagram.
            </p>
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
                {verificando ? "..." : "Verificar"}
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #2a3550" }} />

          {/* User Token */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">👤 User Token — Grupos</h2>
              {userTokenValido === true && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#14532d", color: "#34d399" }}>
                  ✅ {userTokenNome}
                </span>
              )}
              {userTokenValido === false && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#7f1d1d", color: "#f87171" }}>
                  ❌ Inválido
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Necessário para publicar nos grupos. Use <strong style={{ color: "#f1f5f9" }}>User Token</strong>{" "}
              (não Page Token) com permissão{" "}
              <code className="px-1 rounded" style={{ background: "#0b0f1a" }}>publish_to_groups</code>.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={userToken}
                onChange={(e) => setUserToken(e.target.value)}
                placeholder="Cole seu User Access Token aqui"
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: "#0b0f1a", border: "1px solid #2a3550" }}
              />
              <button
                onClick={verificarUserToken}
                disabled={verificandoUser || !userToken}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "#6366f1", color: "white" }}
              >
                {verificandoUser ? "..." : "Verificar"}
              </button>
            </div>
            {/* Grupos configurados */}
            <div className="flex gap-2 flex-wrap">
              {GRUPOS_NOMES.map((nome) => (
                <span key={nome} className="text-xs px-2 py-1 rounded-full" style={{ background: "#1e1e3a", color: "#818cf8" }}>
                  👥 {nome}
                </span>
              ))}
            </div>
          </div>

          <details className="text-xs" style={{ color: "#64748b" }}>
            <summary className="cursor-pointer hover:text-white">Como obter os tokens (4 passos)</summary>
            <ol className="mt-3 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Acesse{" "}
                <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa" }}>
                  developers.facebook.com/tools/explorer
                </a>
              </li>
              <li>
                Para o <strong style={{ color: "#f1f5f9" }}>Page Token</strong>: Gerar Token → marque
                <code className="mx-1 px-1 rounded" style={{ background: "#0b0f1a" }}>pages_manage_posts</code>
                <code className="mx-1 px-1 rounded" style={{ background: "#0b0f1a" }}>instagram_content_publish</code>
                → selecione a Página.
              </li>
              <li>
                Para o <strong style={{ color: "#f1f5f9" }}>User Token</strong> (grupos): Gerar Token → marque
                <code className="mx-1 px-1 rounded" style={{ background: "#0b0f1a" }}>publish_to_groups</code>
                → <strong style={{ color: "#f8d000" }}>NÃO</strong> selecione página.
              </li>
              <li>
                Grupos só permitem publicação <strong style={{ color: "#f1f5f9" }}>imediata</strong> — não é possível agendar.
                Publique no momento certo.
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
            {fbOk > 0 && (
              <span className="text-xs font-bold" style={{ color: "#34d399" }}>{fbOk}/40 agendados</span>
            )}
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

        {/* Instagram + Grupos — Por Post */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          <div>
            <h2 className="text-sm font-bold text-white">📸 Instagram + 👥 Grupos — Publicar por Post</h2>
            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
              Cole a URL pública da foto, publique no Instagram e/ou nos 3 grupos do Facebook.
              {igOk > 0 && <span style={{ color: "#34d399" }}> {igOk} no IG.</span>}
              {gruposOk > 0 && <span style={{ color: "#818cf8" }}> {gruposOk} posts em todos os grupos.</span>}
            </p>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {calendario.posts.map((post) => {
              const igStatus = fbResultados[post.ref]?.instagram;
              const grupos = fbResultados[post.ref]?.grupos;
              const publicandoIg = igPublicando[post.ref];
              const publicandoGrupos = gruposPublicando[post.ref];
              const todosGruposOk = grupos && grupos.every((g) => g.status === "ok");

              return (
                <div
                  key={post.ref}
                  className="rounded-lg p-3 space-y-2"
                  style={{
                    background: "#0b0f1a",
                    border: `1px solid ${igStatus === "ok" && todosGruposOk ? "#14532d" : igStatus === "erro" ? "#7f1d1d" : "#2a3550"}`,
                  }}
                >
                  {/* Cabeçalho do post */}
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
                    <div className="shrink-0 flex flex-col gap-1 items-end">
                      {igStatus === "ok" && <span className="text-xs" style={{ color: "#34d399" }}>✅ IG</span>}
                      {igStatus === "erro" && <span className="text-xs" style={{ color: "#f87171" }}>❌ IG</span>}
                      {todosGruposOk && <span className="text-xs" style={{ color: "#818cf8" }}>✅ Grupos</span>}
                    </div>
                  </div>

                  {/* URL da imagem */}
                  <input
                    type="url"
                    value={imageUrls[post.ref] ?? ""}
                    onChange={(e) => setImageUrls((prev) => ({ ...prev, [post.ref]: e.target.value }))}
                    placeholder="https://... URL pública da foto (necessária para Instagram)"
                    className="w-full px-2 py-1.5 rounded text-xs text-white outline-none"
                    style={{ background: "#131928", border: "1px solid #2a3550" }}
                  />

                  {/* Botões */}
                  <div className="flex gap-2">
                    {igStatus !== "ok" && (
                      <button
                        onClick={() => publicarInstagram(post)}
                        disabled={publicandoIg || !imageUrls[post.ref] || !token}
                        className="flex-1 px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #833ab4, #fd1d1d)", color: "white" }}
                      >
                        {publicandoIg ? "Publicando IG..." : "📸 Instagram"}
                      </button>
                    )}
                    {!todosGruposOk && (
                      <button
                        onClick={() => publicarNosGrupos(post)}
                        disabled={publicandoGrupos || !userToken || userTokenValido === false}
                        className="flex-1 px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #1877f2, #6366f1)", color: "white" }}
                      >
                        {publicandoGrupos ? "Publicando grupos..." : "👥 3 Grupos FB"}
                      </button>
                    )}
                  </div>

                  {/* Status dos grupos */}
                  {grupos && grupos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {grupos.map((g) => (
                        <span
                          key={g.nome}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: g.status === "ok" ? "#14532d" : g.status === "erro" ? "#7f1d1d" : "#1e1e3a",
                            color: g.status === "ok" ? "#34d399" : g.status === "erro" ? "#f87171" : "#818cf8",
                          }}
                          title={g.erro}
                        >
                          {g.status === "ok" ? "✅" : g.status === "erro" ? "❌" : "⏳"} {g.nome}
                        </span>
                      ))}
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
