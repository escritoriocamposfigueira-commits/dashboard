"use client";

import { useState, useEffect, useMemo } from "react";
import calendario from "@/content/calendario-julho-2026.json";

type Post = (typeof calendario.posts)[number] & { customRef?: boolean };
type Status = "idle" | "ok" | "erro" | "skip";
type GrupoStatus = { nome: string; status: Status; erro?: string };
type PostStatus = {
  facebook: Status;
  instagram: Status;
  grupos?: GrupoStatus[];
  fbId?: string; igId?: string; erro?: string;
};

// Distribui posts em 2 por dia (09:00 e 18:00) a partir da data inicial
function distribuirDatas(posts: Post[], dataInicio: string): Post[] {
  const result: Post[] = [];
  let diaIndex = 0;
  for (let i = 0; i < posts.length; i++) {
    const hora = i % 2 === 0 ? "09:00" : "18:00";
    if (i > 0 && i % 2 === 0) diaIndex++;
    const d = new Date(dataInicio + "T12:00:00");
    d.setDate(d.getDate() + diaIndex);
    const data = d.toISOString().slice(0, 10);
    result.push({ ...posts[i], data, hora });
  }
  return result;
}

const STORAGE_KEY = "cf_posts_extras";

export default function AgendadorPage() {
  const [token, setToken] = useState("");
  const [tokenNome, setTokenNome] = useState<string | null>(null);
  const [tokenValido, setTokenValido] = useState<boolean | null>(null);
  const [verificando, setVerificando] = useState(false);

  const [userToken, setUserToken] = useState("");
  const [userTokenNome, setUserTokenNome] = useState<string | null>(null);
  const [userTokenValido, setUserTokenValido] = useState<boolean | null>(null);
  const [verificandoUser, setVerificandoUser] = useState(false);

  // Data de início configurável
  const hoje = new Date().toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState("2026-07-01");

  // Posts extras adicionados pelo usuário
  const [postsExtras, setPostsExtras] = useState<Post[]>([]);
  const [novoPost, setNovoPost] = useState({ imovel: "", tipo: "VENDA", valor: "", caption: "" });
  const [mostrarFormPost, setMostrarFormPost] = useState(false);

  const [agendando, setAgendando] = useState(false);
  const [resultados, setResultados] = useState<Record<string, PostStatus>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [mostrarFotos, setMostrarFotos] = useState(false);
  const [gruposPublicando, setGruposPublicando] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = localStorage.getItem("meta_token");
    if (t) setToken(t);
    const ut = localStorage.getItem("meta_user_token");
    if (ut) setUserToken(ut);
    const extras = localStorage.getItem(STORAGE_KEY);
    if (extras) setPostsExtras(JSON.parse(extras));
  }, []);

  // Todos os posts (base + extras) com datas redistribuídas
  const todosPosts = useMemo(() => {
    const base = calendario.posts as Post[];
    const todos = [...base, ...postsExtras];
    return distribuirDatas(todos, dataInicio);
  }, [dataInicio, postsExtras]);

  function adicionarPost() {
    if (!novoPost.imovel || !novoPost.caption) return;
    const ref = `X${String(postsExtras.length + 1).padStart(2, "0")}`;
    const novo: Post = {
      ref,
      tipo: novoPost.tipo as "VENDA" | "LOCAÇÃO" | "CONTEÚDO",
      imovel: novoPost.imovel,
      valor: novoPost.valor,
      data: "",
      hora: "",
      caption: novoPost.caption,
      customRef: true,
    };
    const atualizados = [...postsExtras, novo];
    setPostsExtras(atualizados);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizados));
    setNovoPost({ imovel: "", tipo: "VENDA", valor: "", caption: "" });
    setMostrarFormPost(false);
  }

  function removerPostExtra(ref: string) {
    const atualizados = postsExtras.filter((p) => p.ref !== ref);
    setPostsExtras(atualizados);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizados));
  }

  async function verificarToken() {
    if (!token.trim()) return;
    setVerificando(true); setTokenValido(null);
    try {
      const res = await fetch("/api/meta/verificar-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await res.json();
      setTokenValido(data.valido); setTokenNome(data.nome ?? null);
      if (data.valido) localStorage.setItem("meta_token", token);
    } catch { setTokenValido(false); } finally { setVerificando(false); }
  }

  async function verificarUserToken() {
    if (!userToken.trim()) return;
    setVerificandoUser(true); setUserTokenValido(null);
    try {
      const res = await fetch("/api/meta/verificar-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: userToken }) });
      const data = await res.json();
      setUserTokenValido(data.valido); setUserTokenNome(data.nome ?? null);
      if (data.valido) localStorage.setItem("meta_user_token", userToken);
    } catch { setUserTokenValido(false); } finally { setVerificandoUser(false); }
  }

  async function agendarTudo() {
    if (!token.trim()) return;
    setAgendando(true); setResultados({});
    const postsComDatas = todosPosts.map((p) => ({ ...p }));
    const res = await fetch("/api/meta/agendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, imageUrls, posts: postsComDatas }),
    });
    const data = await res.json();
    const mapa: Record<string, PostStatus> = {};
    for (const r of data.results) {
      mapa[r.ref] = { facebook: r.facebook, instagram: r.instagram, fbId: r.fbId, igId: r.igId, erro: r.erro };
    }
    setResultados(mapa);
    setAgendando(false);
  }

  async function publicarNosGrupos(post: Post) {
    if (!userToken.trim()) return;
    setGruposPublicando((p) => ({ ...p, [post.ref]: true }));
    try {
      const res = await fetch("/api/meta/publicar-grupos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken, ref: post.ref, message: post.caption, imageUrl: imageUrls[post.ref] }),
      });
      const data = await res.json();
      setResultados((prev) => ({
        ...prev,
        [post.ref]: {
          ...prev[post.ref],
          facebook: prev[post.ref]?.facebook ?? "idle",
          instagram: prev[post.ref]?.instagram ?? "idle",
          grupos: data.results.map((r: { nome: string; status: string; erro?: string }) => ({ nome: r.nome, status: r.status as Status, erro: r.erro })),
        },
      }));
    } finally { setGruposPublicando((p) => ({ ...p, [post.ref]: false })); }
  }

  const fbOk = Object.values(resultados).filter((r) => r.facebook === "ok").length;
  const igOk = Object.values(resultados).filter((r) => r.instagram === "ok").length;
  const fotosPreenchidas = Object.values(imageUrls).filter(Boolean).length;
  const totalPosts = todosPosts.length;
  const dataFim = todosPosts[totalPosts - 1]?.data ?? "";

  return (
    <div className="min-h-screen p-6" style={{ background: "#0b0f1a", color: "#f1f5f9" }}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #1877f2, #833ab4)", color: "white" }}>📣</div>
          <div>
            <h1 className="text-xl font-bold text-white">Agendador Meta</h1>
            <p className="text-xs" style={{ color: "#64748b" }}>
              {totalPosts} posts · {dataInicio} → {dataFim} · Facebook + Instagram + Grupos
            </p>
          </div>
          <a href="/" className="ml-auto text-xs px-3 py-1.5 rounded-lg" style={{ background: "#1e3a5f", color: "#60a5fa" }}>← Dashboard</a>
        </div>

        {/* Configurar Datas */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          <h2 className="text-sm font-bold text-white">📅 Configurar Calendário</h2>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "#64748b" }}>Data de início</label>
              <input type="date" value={dataInicio} min={hoje}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: "#0b0f1a", border: "1px solid #2a3550" }} />
            </div>
            <div className="flex-1 text-xs space-y-1" style={{ color: "#64748b" }}>
              <p>📌 <strong style={{ color: "#f1f5f9" }}>{totalPosts} posts</strong> distribuídos automaticamente</p>
              <p>🕘 2 por dia: <strong style={{ color: "#f1f5f9" }}>09:00</strong> e <strong style={{ color: "#f1f5f9" }}>18:00</strong></p>
              <p>📆 Término previsto: <strong style={{ color: "#f1f5f9" }}>{dataFim}</strong></p>
            </div>
          </div>

          {/* Adicionar posts */}
          <div style={{ borderTop: "1px solid #2a3550", paddingTop: "12px" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs" style={{ color: "#64748b" }}>
                {postsExtras.length > 0
                  ? <span style={{ color: "#34d399" }}>+{postsExtras.length} posts adicionados além dos 40 padrão</span>
                  : "Adicione imóveis extras à fila"
                }
              </p>
              <button onClick={() => setMostrarFormPost(!mostrarFormPost)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "#1e3a5f", color: "#60a5fa" }}>
                {mostrarFormPost ? "Cancelar" : "+ Adicionar Post"}
              </button>
            </div>

            {mostrarFormPost && (
              <div className="space-y-2 p-3 rounded-lg" style={{ background: "#0b0f1a", border: "1px solid #2a3550" }}>
                <div className="flex gap-2">
                  <input value={novoPost.imovel} onChange={(e) => setNovoPost((p) => ({ ...p, imovel: e.target.value }))}
                    placeholder="Nome do imóvel" className="flex-1 px-2 py-1.5 rounded text-xs text-white outline-none"
                    style={{ background: "#131928", border: "1px solid #2a3550" }} />
                  <select value={novoPost.tipo} onChange={(e) => setNovoPost((p) => ({ ...p, tipo: e.target.value }))}
                    className="px-2 py-1.5 rounded text-xs text-white outline-none"
                    style={{ background: "#131928", border: "1px solid #2a3550" }}>
                    <option>VENDA</option><option>LOCAÇÃO</option><option>CONTEÚDO</option>
                  </select>
                  <input value={novoPost.valor} onChange={(e) => setNovoPost((p) => ({ ...p, valor: e.target.value }))}
                    placeholder="Valor" className="w-32 px-2 py-1.5 rounded text-xs text-white outline-none"
                    style={{ background: "#131928", border: "1px solid #2a3550" }} />
                </div>
                <textarea value={novoPost.caption} onChange={(e) => setNovoPost((p) => ({ ...p, caption: e.target.value }))}
                  placeholder="Caption completo do post (texto que vai no Facebook/Instagram)"
                  rows={4} className="w-full px-2 py-1.5 rounded text-xs text-white outline-none"
                  style={{ background: "#131928", border: "1px solid #2a3550", resize: "vertical" }} />
                <button onClick={adicionarPost} disabled={!novoPost.imovel || !novoPost.caption}
                  className="px-4 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
                  style={{ background: "#1877f2", color: "white" }}>
                  Adicionar à Fila
                </button>
              </div>
            )}

            {postsExtras.length > 0 && (
              <div className="space-y-1 mt-2">
                {postsExtras.map((p) => (
                  <div key={p.ref} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs"
                    style={{ background: "#0b0f1a", border: "1px solid #1e3a5f" }}>
                    <span className="font-mono" style={{ color: "#60a5fa" }}>{p.ref}</span>
                    <span className="flex-1" style={{ color: "#94a3b8" }}>{p.imovel}</span>
                    <span style={{ color: "#64748b" }}>{p.tipo}</span>
                    <button onClick={() => removerPostExtra(p.ref)} className="text-xs px-2 py-0.5 rounded"
                      style={{ background: "#7f1d1d", color: "#f87171" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tokens */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">🔑 Page Access Token</h2>
              {tokenValido === true && <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#14532d", color: "#34d399" }}>✅ {tokenNome}</span>}
              {tokenValido === false && <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#7f1d1d", color: "#f87171" }}>❌ Inválido</span>}
            </div>
            <div className="flex gap-2">
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
                placeholder="Token da Escritório Campos Figueira"
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: "#0b0f1a", border: "1px solid #2a3550" }} />
              <button onClick={verificarToken} disabled={verificando || !token}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "#1877f2", color: "white" }}>{verificando ? "..." : "Verificar"}</button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #2a3550" }} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">👤 User Token — Grupos</h2>
              {userTokenValido === true && <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#14532d", color: "#34d399" }}>✅ {userTokenNome}</span>}
              {userTokenValido === false && <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#7f1d1d", color: "#f87171" }}>❌ Inválido</span>}
            </div>
            <div className="flex gap-2">
              <input type="password" value={userToken} onChange={(e) => setUserToken(e.target.value)}
                placeholder="User Token com publish_to_groups"
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: "#0b0f1a", border: "1px solid #2a3550" }} />
              <button onClick={verificarUserToken} disabled={verificandoUser || !userToken}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "#6366f1", color: "white" }}>{verificandoUser ? "..." : "Verificar"}</button>
            </div>
          </div>
        </div>

        {/* Fotos */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">🖼️ URLs das Fotos <span className="font-normal text-xs" style={{ color: "#64748b" }}>(opcional — IG agenda junto)</span></h2>
              {fotosPreenchidas > 0 && <p className="text-xs mt-0.5" style={{ color: "#34d399" }}>{fotosPreenchidas}/{totalPosts} fotos adicionadas</p>}
            </div>
            <button onClick={() => setMostrarFotos(!mostrarFotos)}
              className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "#1e3a5f", color: "#60a5fa" }}>
              {mostrarFotos ? "Ocultar" : "Adicionar fotos"}
            </button>
          </div>
          {mostrarFotos && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {todosPosts.map((post) => (
                <div key={post.ref} className="flex items-center gap-2">
                  <span className="font-mono text-xs w-8 shrink-0" style={{ color: "#64748b" }}>{post.ref}</span>
                  <span className="text-xs w-36 shrink-0 truncate" style={{ color: "#94a3b8" }}>{post.imovel}</span>
                  <span className="text-xs w-20 shrink-0" style={{ color: "#475569" }}>{post.data} {post.hora}</span>
                  <input type="url" value={imageUrls[post.ref] ?? ""}
                    onChange={(e) => setImageUrls((prev) => ({ ...prev, [post.ref]: e.target.value }))}
                    placeholder="https://..."
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
              <h2 className="text-sm font-bold text-white">🚀 Agendar Facebook + Instagram</h2>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                {totalPosts} posts · início {dataInicio} · 2/dia
              </p>
            </div>
            <div className="text-right text-xs space-y-0.5">
              {fbOk > 0 && <div style={{ color: "#60a5fa" }}>📘 {fbOk}/{totalPosts} FB</div>}
              {igOk > 0 && <div style={{ color: "#c084fc" }}>📸 {igOk}/{totalPosts} IG</div>}
            </div>
          </div>

          <button onClick={agendarTudo} disabled={agendando || !token || tokenValido === false}
            className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #1877f2, #833ab4)", color: "white" }}>
            {agendando ? "Agendando..." : `🚀 Agendar ${totalPosts} Posts${fotosPreenchidas > 0 ? ` (+ ${fotosPreenchidas} no Instagram)` : ""}`}
          </button>

          {Object.keys(resultados).length > 0 && (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {todosPosts.map((post) => {
                const s = resultados[post.ref];
                return (
                  <div key={post.ref} className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs" style={{ background: "#0b0f1a" }}>
                    <span className="font-mono w-8 shrink-0" style={{ color: "#64748b" }}>{post.ref}</span>
                    <span className="flex-1 truncate" style={{ color: "#94a3b8" }}>{post.imovel}</span>
                    <span style={{ color: "#475569" }}>{post.data} {post.hora}</span>
                    {s?.facebook === "ok" && <span style={{ color: "#60a5fa" }}>✅FB</span>}
                    {s?.facebook === "erro" && <span title={s.erro} style={{ color: "#f87171" }}>❌FB</span>}
                    {s?.instagram === "ok" && <span style={{ color: "#c084fc" }}>✅IG</span>}
                    {s?.instagram === "erro" && <span title={s.erro} style={{ color: "#f87171" }}>❌IG</span>}
                    {!s && <span style={{ color: "#334155" }}>—</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grupos */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: "#1a2236", border: "1px solid #2a3550" }}>
          <div>
            <h2 className="text-sm font-bold text-white">👥 Publicar nos 3 Grupos</h2>
            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Publicação imediata — escolha o momento certo para cada post.</p>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {todosPosts.map((post) => {
              const grupos = resultados[post.ref]?.grupos;
              const publicando = gruposPublicando[post.ref];
              const todosOk = grupos && grupos.every((g) => g.status === "ok");
              return (
                <div key={post.ref} className="rounded-lg p-3 flex items-center gap-3"
                  style={{ background: "#0b0f1a", border: `1px solid ${todosOk ? "#14532d" : "#2a3550"}` }}>
                  <span className="font-mono text-xs w-8 shrink-0" style={{ color: "#64748b" }}>{post.ref}</span>
                  <span className="flex-1 text-xs truncate" style={{ color: "#94a3b8" }}>{post.imovel}</span>
                  <span className="text-xs shrink-0" style={{ color: "#475569" }}>{post.data}</span>
                  {todosOk
                    ? <span className="text-xs" style={{ color: "#818cf8" }}>✅ Publicado</span>
                    : <button onClick={() => publicarNosGrupos(post)}
                        disabled={publicando || !userToken || userTokenValido === false}
                        className="px-3 py-1 rounded text-xs font-semibold disabled:opacity-40 shrink-0"
                        style={{ background: "linear-gradient(135deg, #1877f2, #6366f1)", color: "white" }}>
                        {publicando ? "..." : "👥 Grupos"}
                      </button>
                  }
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
