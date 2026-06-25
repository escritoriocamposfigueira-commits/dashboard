"use client";

import { useState, useEffect } from "react";
import calendario from "@/content/calendario-julho-2026.json";

type Post = (typeof calendario.posts)[number];
type Status = "idle" | "ok" | "erro" | "skip";

type GrupoStatus = { nome: string; status: Status; erro?: string };

type PostStatus = {
  facebook: Status;
  instagram: Status;
  grupos?: GrupoStatus[];
  fbId?: string;
  igId?: string;
  erro?: string;
};

export default function AgendadorPage() {
  const [token, setToken] = useState("");
  const [tokenNome, setTokenNome] = useState<string | null>(null);
  const [tokenValido, setTokenValido] = useState<boolean | null>(null);
  const [verificando, setVerificando] = useState(false);

  const [userToken, setUserToken] = useState("");
  const [userTokenNome, setUserTokenNome] = useState<string | null>(null);
  const [userTokenValido, setUserTokenValido] = useState<boolean | null>(null);
  const [verificandoUser, setVerificandoUser] = useState(false);

  const [agendando, setAgendando] = useState(false);
  const [resultados, setResultados] = useState<Record<string, PostStatus>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [gruposPublicando, setGruposPublicando] = useState<Record<string, boolean>>({});

  const [mostrarFotos, setMostrarFotos] = useState(false);

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

  async function agendarTudo() {
    if (!token.trim()) return;
    setAgendando(true);
    setResultados({});

    const res = await fetch("/api/meta/agendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, imageUrls }),
    });
    const data = await res.json();

    const mapa: Record<string, PostStatus> = {};
    for (const r of data.results) {
      mapa[r.ref] = {
        facebook: r.facebook,
        instagram: r.instagram,
        fbId: r.fbId,
        igId: r.igId,
        erro: r.erro,
      };
    }
    setResultados(mapa);
    setAgendando(false);
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
      setResultados((prev) => ({
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

  const fbOk = Object.values(resultados).filter((r) => r.facebook === "ok").length;
  const igOk = Object.values(resultados).filter((r) => r.instagram === "ok").length;
  const fotosPreenchidas = Object.values(imageUrls).filter(Boolean).length;

  return (
    <div className="min-h-screen p-6" style={{ background: "#0b0f1a", color: "#f1f5f9" }}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #1877f2, #833ab4)" }}>
            📣
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Agendador Meta</h1>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Facebook + Instagram juntos — 40 posts · Julho 2026
            </p>
          </div>
          <a href="/" className="ml-auto text-xs px-3 py-1.5 rounded-lg" style={{ background: "#1e3a5f", color: "#60a5fa" }}>
            ← Dashboard
          </a>
        </div>

        {/* Tokens */}
        <div className="rounded-xl p-5 space-y-5" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          {/* Page Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">🔑 Page Access Token</h2>
              {tokenValido === true && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#14532d", color: "#34d399" }}>
                  ✅ {tokenNome}
                </span>
              )}
              {tokenValido === false && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#7f1d1d", color: "#f87171" }}>❌ Inválido</span>
              )}
            </div>
            <p className="text-xs" style={{ color: "#64748b" }}>Token da página — para agendar Facebook e Instagram juntos.</p>
            <div className="flex gap-2">
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
                placeholder="Cole o Page Access Token da Escritório Campos Figueira"
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: "#0b0f1a", border: "1px solid #2a3550" }} />
              <button onClick={verificarToken} disabled={verificando || !token}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "#1877f2", color: "white" }}>
                {verificando ? "..." : "Verificar"}
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #2a3550" }} />

          {/* User Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">👤 User Token — Grupos</h2>
              {userTokenValido === true && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#14532d", color: "#34d399" }}>
                  ✅ {userTokenNome}
                </span>
              )}
              {userTokenValido === false && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#7f1d1d", color: "#f87171" }}>❌ Inválido</span>
              )}
            </div>
            <p className="text-xs" style={{ color: "#64748b" }}>Token pessoal com permissão <code className="px-1 rounded" style={{ background: "#0b0f1a" }}>publish_to_groups</code> para os 3 grupos.</p>
            <div className="flex gap-2">
              <input type="password" value={userToken} onChange={(e) => setUserToken(e.target.value)}
                placeholder="Cole o User Access Token aqui"
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: "#0b0f1a", border: "1px solid #2a3550" }} />
              <button onClick={verificarUserToken} disabled={verificandoUser || !userToken}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "#6366f1", color: "white" }}>
                {verificandoUser ? "..." : "Verificar"}
              </button>
            </div>
          </div>
        </div>

        {/* Fotos (opcional antes de agendar) */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">🖼️ URLs das Fotos <span className="font-normal text-xs" style={{ color: "#64748b" }}>(opcional — para agendar Instagram junto)</span></h2>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                Se preencher a URL da foto, o Instagram é agendado junto com o Facebook automaticamente.
                {fotosPreenchidas > 0 && <span style={{ color: "#34d399" }}> {fotosPreenchidas}/40 fotos adicionadas.</span>}
              </p>
            </div>
            <button onClick={() => setMostrarFotos(!mostrarFotos)}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "#1e3a5f", color: "#60a5fa" }}>
              {mostrarFotos ? "Ocultar" : "Adicionar fotos"}
            </button>
          </div>

          {mostrarFotos && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {calendario.posts.map((post) => (
                <div key={post.ref} className="flex items-center gap-3">
                  <span className="font-mono text-xs w-8 shrink-0" style={{ color: "#64748b" }}>{post.ref}</span>
                  <span className="text-xs w-40 shrink-0 truncate" style={{ color: "#94a3b8" }}>{post.imovel}</span>
                  <input type="url" value={imageUrls[post.ref] ?? ""}
                    onChange={(e) => setImageUrls((prev) => ({ ...prev, [post.ref]: e.target.value }))}
                    placeholder="https://... URL da foto"
                    className="flex-1 px-2 py-1.5 rounded text-xs text-white outline-none"
                    style={{ background: "#0b0f1a", border: "1px solid #2a3550" }} />
                  {imageUrls[post.ref] && <span style={{ color: "#34d399" }}>✅</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agendar Tudo */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">🚀 Agendar Facebook + Instagram — 40 Posts</h2>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                Um clique agenda tudo. Facebook agenda para julho. Instagram agenda junto se tiver foto.
              </p>
            </div>
            <div className="text-right text-xs space-y-0.5">
              {fbOk > 0 && <div style={{ color: "#34d399" }}>📘 {fbOk}/40 FB</div>}
              {igOk > 0 && <div style={{ color: "#c084fc" }}>📸 {igOk}/40 IG</div>}
            </div>
          </div>

          <button onClick={agendarTudo}
            disabled={agendando || !token || tokenValido === false}
            className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #1877f2, #833ab4)", color: "white" }}>
            {agendando ? "Agendando..." : `🚀 Agendar Todos os 40 Posts ${fotosPreenchidas > 0 ? `(+ ${fotosPreenchidas} no Instagram)` : ""}`}
          </button>

          {Object.keys(resultados).length > 0 && (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {calendario.posts.map((post) => {
                const s = resultados[post.ref];
                return (
                  <div key={post.ref} className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs" style={{ background: "#0b0f1a" }}>
                    <span className="font-mono w-8 shrink-0" style={{ color: "#64748b" }}>{post.ref}</span>
                    <span className="flex-1 truncate" style={{ color: "#94a3b8" }}>{post.imovel}</span>
                    <span style={{ color: "#64748b" }}>{post.data}</span>
                    {s?.facebook === "ok" && <span style={{ color: "#60a5fa" }}>✅ FB</span>}
                    {s?.facebook === "erro" && <span title={s.erro} style={{ color: "#f87171" }}>❌ FB</span>}
                    {s?.instagram === "ok" && <span style={{ color: "#c084fc" }}>✅ IG</span>}
                    {s?.instagram === "erro" && <span title={s.erro} style={{ color: "#f87171" }}>❌ IG</span>}
                    {s?.instagram === "skip" && imageUrls[post.ref] === undefined && <span style={{ color: "#334155" }}>— IG</span>}
                    {!s && <span style={{ color: "#334155" }}>—</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grupos — Por Post */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          <div>
            <h2 className="text-sm font-bold text-white">👥 Publicar nos 3 Grupos — Por Post</h2>
            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
              Grupos só permitem publicação imediata (não agendada). Publique no momento certo.
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {calendario.posts.map((post) => {
              const grupos = resultados[post.ref]?.grupos;
              const publicando = gruposPublicando[post.ref];
              const todosOk = grupos && grupos.every((g) => g.status === "ok");

              return (
                <div key={post.ref} className="rounded-lg p-3 space-y-2"
                  style={{ background: "#0b0f1a", border: `1px solid ${todosOk ? "#14532d" : "#2a3550"}` }}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs w-8" style={{ color: "#64748b" }}>{post.ref}</span>
                    <span className="flex-1 text-xs font-semibold text-white truncate">{post.imovel}</span>
                    <span className="text-xs" style={{ color: "#64748b" }}>{post.data}</span>
                    {todosOk && <span className="text-xs" style={{ color: "#818cf8" }}>✅ Grupos</span>}
                    {!todosOk && (
                      <button onClick={() => publicarNosGrupos(post)}
                        disabled={publicando || !userToken || userTokenValido === false}
                        className="px-3 py-1 rounded text-xs font-semibold disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #1877f2, #6366f1)", color: "white" }}>
                        {publicando ? "..." : "👥 Publicar nos Grupos"}
                      </button>
                    )}
                  </div>
                  {grupos && grupos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {grupos.map((g) => (
                        <span key={g.nome} className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: g.status === "ok" ? "#14532d" : g.status === "erro" ? "#7f1d1d" : "#1e1e3a",
                            color: g.status === "ok" ? "#34d399" : g.status === "erro" ? "#f87171" : "#818cf8",
                          }} title={g.erro}>
                          {g.status === "ok" ? "✅" : "❌"} {g.nome}
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
