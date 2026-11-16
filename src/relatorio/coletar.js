"use strict";

const fs = require("fs");
const path = require("path");
const { atualizarPesos, mediana, renderizarRelatorio } = require("./core");

const RAIZ = path.resolve(__dirname, "../..");
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";
const PAGE_ID = process.env.META_PAGE_ID || "512040582222121";
const IG_ID = process.env.META_IG_ID || "17841461388445580";
const DIAS = Math.max(1, Math.min(90, Number(process.env.RELATORIO_DIAS) || 7));
const LIMITE_VARIACAO = 0.2;

function isoData(data) { return data.toISOString().slice(0, 10); }
function inicioPeriodo() { return new Date(Date.now() - DIAS * 86400000); }

async function fetchJson(url, opcoes = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const resposta = await fetch(url, { ...opcoes, signal: controller.signal });
    const texto = await resposta.text();
    let dados;
    try { dados = texto ? JSON.parse(texto) : {}; } catch { dados = { raw: texto }; }
    if (!resposta.ok || dados.error) {
      const mensagem = dados?.error?.message || dados?.error_description || dados?.erro || `HTTP ${resposta.status}`;
      throw new Error(mensagem);
    }
    return dados;
  } finally { clearTimeout(timeout); }
}

async function graph(endpoint, token) {
  const separador = endpoint.includes("?") ? "&" : "?";
  return fetchJson(`https://graph.facebook.com/${GRAPH_VERSION}/${endpoint}${separador}access_token=${encodeURIComponent(token)}`);
}

async function resolverPageToken(tokenInicial) {
  const contas = await graph("me/accounts?fields=id,name,access_token&limit=100", tokenInicial);
  const pagina = (contas.data || []).find((item) => String(item.id) === PAGE_ID) || contas.data?.[0];
  return pagina?.access_token || tokenInicial;
}

async function paginarGraph(endpoint, token, limite = 100) {
  const itens = [];
  let proxima = null;
  let dados = await graph(endpoint, token);
  for (;;) {
    itens.push(...(dados.data || []));
    proxima = dados.paging?.next;
    if (!proxima || itens.length >= limite) break;
    dados = await fetchJson(proxima);
  }
  return itens.slice(0, limite);
}

async function insightsIndividuais(id, metricas, token) {
  const valores = {};
  const erros = {};
  for (const metrica of metricas) {
    try {
      const dados = await graph(`${id}/insights?metric=${encodeURIComponent(metrica)}&period=lifetime`, token);
      const item = dados.data?.[0];
      const valor = item?.values?.at(-1)?.value ?? item?.value;
      if (valor !== null && valor !== undefined) {
        valores[metrica] = typeof valor === "object"
          ? Object.values(valor || {}).reduce((s, n) => s + Number(n || 0), 0)
          : Number(valor);
      }
    } catch (erro) {
      erros[metrica] = erro.message;
    }
  }
  return { valores, erros };
}

function formatoMeta(item) {
  const produto = String(item.media_product_type || item.attachments?.data?.[0]?.media_type || item.media_type || "").toLowerCase();
  if (produto.includes("reel") || produto.includes("video")) return "reel";
  if (produto.includes("story")) return "story";
  return "feed";
}

async function coletarInstagram(token) {
  const desde = inicioPeriodo();
  const campos = "id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count";
  const itens = await paginarGraph(`${IG_ID}/media?fields=${campos}&limit=100`, token, 100);
  const recentes = itens.filter((item) => new Date(item.timestamp) >= desde);
  const saida = [];
  for (const item of recentes) {
    const { valores: insights, erros: errosInsights } = await insightsIndividuais(item.id, ["views", "reach", "saved", "shares", "total_interactions"], token);
    saida.push({
      rede: "Instagram",
      id: item.id,
      formato: formatoMeta(item),
      legenda: item.caption || "",
      url: item.permalink,
      data: item.timestamp,
      visualizacoes: insights.views,
      alcance: insights.reach,
      curtidas: item.like_count,
      comentarios: item.comments_count,
      compartilhamentos: insights.shares,
      salvamentos: insights.saved,
      interacoes: insights.total_interactions,
      erros_metricas: errosInsights,
      metricas_disponiveis: Object.keys(insights),
    });
  }
  return saida;
}

async function coletarFacebook(token) {
  const desde = inicioPeriodo();
  const since = Math.floor(desde.getTime() / 1000);
  const campos = "id,message,created_time,permalink_url,attachments{media_type},reactions.limit(0).summary(true),comments.limit(0).summary(true),shares";
  const itens = await paginarGraph(`${PAGE_ID}/published_posts?fields=${encodeURIComponent(campos)}&since=${since}&limit=100`, token, 100);
  const saida = [];
  for (const item of itens) {
    const { valores: insights, erros: errosInsights } = await insightsIndividuais(item.id, [
      "post_media_view", "post_total_media_view_unique", "post_clicks", "post_video_views",
      "post_impressions", "post_impressions_unique",
    ], token);
    saida.push({
      rede: "Facebook",
      id: item.id,
      formato: formatoMeta(item),
      legenda: item.message || "",
      url: item.permalink_url,
      data: item.created_time,
      alcance: insights.post_total_media_view_unique ?? insights.post_impressions_unique,
      visualizacoes: insights.post_media_view ?? insights.post_video_views ?? insights.post_impressions,
      curtidas: item.reactions?.summary?.total_count,
      comentarios: item.comments?.summary?.total_count,
      compartilhamentos: item.shares?.count,
      cliques: insights.post_clicks,
      erros_metricas: errosInsights,
      metricas_disponiveis: Object.keys(insights),
    });
  }
  return saida;
}

function idsYoutubeRecentes() {
  const estadoPath = path.join(RAIZ, "controle/estado-publicacao.json");
  if (!fs.existsSync(estadoPath)) return [];
  const estado = JSON.parse(fs.readFileSync(estadoPath, "utf8"));
  const desde = inicioPeriodo();
  return (estado.publicados || [])
    .filter((item) => new Date(item.data) >= desde && /^✅\s+[A-Za-z0-9_-]{6,}$/.test(String(item.youtube || "")))
    .map((item) => ({
      id: String(item.youtube).replace(/^✅\s+/, "").trim(),
      codigo: String(item.codigo || "—").startsWith("CF-") ? item.codigo : `CF-${item.codigo}`,
      data: item.data,
    }));
}

async function tokenYoutube() {
  const params = new URLSearchParams({
    client_id: process.env.YT_CLIENT_ID || "",
    client_secret: process.env.YT_CLIENT_SECRET || "",
    refresh_token: process.env.YT_REFRESH_TOKEN || "",
    grant_type: "refresh_token",
  });
  return fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

async function coletarYoutube() {
  if (!process.env.YT_CLIENT_ID || !process.env.YT_CLIENT_SECRET || !process.env.YT_REFRESH_TOKEN) {
    return { itens: [], observacao: "Credenciais do YouTube não configuradas nesta execução." };
  }
  const ids = idsYoutubeRecentes();
  if (!ids.length) return { itens: [], observacao: "Nenhum Short novo identificado no período." };
  const mapa = new Map(ids.map((item) => [item.id, item]));
  try {
    const oauth = await tokenYoutube();
    const dados = await fetchJson(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,status&id=${encodeURIComponent(ids.map((x) => x.id).join(","))}`, {
      headers: { authorization: `Bearer ${oauth.access_token}` },
    });
    return {
      itens: (dados.items || []).map((item) => ({
        rede: "YouTube", id: item.id, codigo: mapa.get(item.id)?.codigo, formato: "video",
        titulo: item.snippet?.title, legenda: item.snippet?.description,
        url: `https://www.youtube.com/shorts/${item.id}`,
        data: item.snippet?.publishedAt || mapa.get(item.id)?.data,
        visualizacoes: item.statistics?.viewCount, curtidas: item.statistics?.likeCount,
        comentarios: item.statistics?.commentCount,
        publico: item.status?.privacyStatus === "public",
      })),
      observacao: "Estatísticas e visibilidade consultadas pela YouTube Data API.",
    };
  } catch (erroApi) {
    const itens = [];
    for (const registro of ids) {
      try {
        const dados = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${registro.id}`)}&format=json`);
        itens.push({
          rede: "YouTube", id: registro.id, codigo: registro.codigo, formato: "video",
          titulo: dados.title, url: `https://www.youtube.com/shorts/${registro.id}`,
          data: registro.data, publico: true,
        });
      } catch {
        itens.push({
          rede: "YouTube", id: registro.id, codigo: registro.codigo, formato: "video",
          url: `https://www.youtube.com/shorts/${registro.id}`, data: registro.data, publico: false,
        });
      }
    }
    const acessiveis = itens.filter((item) => item.publico).length;
    return {
      itens,
      observacao: `${acessiveis}/${itens.length} vídeos acessíveis publicamente; métricas não medidas porque o OAuth não possui youtube.readonly (${erroApi.message}).`,
    };
  }
}

function idPublicoDaUrl(url = "") {
  return String(url).match(/facebook\.com\/(\d+)(?:\/|$)/i)?.[1] || null;
}

async function diagnosticarMeta(token, facebook = []) {
  const campos = "id,name,username,link,fan_count,followers_count,instagram_business_account{id,username}";
  const configurada = await graph(`${PAGE_ID}?fields=${encodeURIComponent(campos)}`, token);
  const idPublico = facebook.map((item) => idPublicoDaUrl(item.url)).find(Boolean) || null;
  const idDosPosts = facebook.map((item) => String(item.id || "").split("_")[0]).find(Boolean) || null;
  let destino = null;
  if (idPublico && idPublico !== String(configurada.id)) {
    try { destino = await graph(`${idPublico}?fields=${encodeURIComponent(campos)}`, token); }
    catch (erro) { destino = { id: idPublico, erro: erro.message }; }
  }
  return { configurada, idPublico, idDosPosts, destino };
}

function resumoCanal(itens = [], observacao = "") {
  const visualizacoes = itens.map((item) => item.visualizacoes ?? item.alcance).filter((valor) => valor !== null && valor !== undefined);
  const publicosConhecidos = itens.filter((item) => item.publico !== undefined);
  return {
    ok: true,
    total: itens.length,
    publicos: publicosConhecidos.length ? publicosConhecidos.filter((item) => item.publico).length : undefined,
    medidos: visualizacoes.length,
    mediana_views: mediana(visualizacoes),
    observacao,
  };
}

async function coletarLeads() {
  const api = process.env.CAPTADOR_API_URL;
  const oidc = process.env.GITHUB_OIDC_TOKEN;
  if (!api || !oidc) return { total: 0, radar: 0, markdown: "Coleta de leads não configurada nesta execução." };
  const dados = await fetchJson(`${api}/report/weekly`, { headers: { authorization: `Bearer ${oidc}` } });
  const radar = Number(String(dados.markdown || "").match(/radar:\s*\*\*(\d+)\*\*/i)?.[1] || 0);
  const detalhe = String(dados.markdown || "").split("\n").filter((linha) => linha.startsWith("|") || /Total de leads novos|Oportunidades/.test(linha)).join("\n");
  return { total: Number(dados.total || 0), radar, markdown: detalhe };
}

function lerPesos() {
  const arquivo = path.join(RAIZ, "config/pesos-formatos.json");
  if (!fs.existsSync(arquivo)) return { feed: 1, reel: 1, story: 1, video: 1 };
  return JSON.parse(fs.readFileSync(arquivo, "utf8"));
}

function salvarPesos(pesos) {
  const arquivo = path.join(RAIZ, "config/pesos-formatos.json");
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, `${JSON.stringify(pesos, null, 2)}\n`, "utf8");
}

async function main() {
  const destino = path.resolve(process.argv[2] || path.join(RAIZ, `relatorios/performance/${isoData(new Date())}.md`));
  const canais = {};
  const publicacoes = [];
  let pageToken = null;
  if (process.env.META_PAGE_TOKEN) {
    try {
      pageToken = await resolverPageToken(process.env.META_PAGE_TOKEN);
      const [facebook, instagram] = await Promise.allSettled([coletarFacebook(pageToken), coletarInstagram(pageToken)]);
      if (facebook.status === "fulfilled") {
        publicacoes.push(...facebook.value);
        let observacao = "Graph API conectada; ausências de alcance/views são exibidas como não medido.";
        try {
          const identidade = await diagnosticarMeta(pageToken, facebook.value);
          const alvo = identidade.destino?.name ? `; URL pública aponta para ${identidade.destino.name} (${identidade.idPublico})` : "";
          const atuaisViews = facebook.value.filter((item) => item.metricas_disponiveis?.includes("post_media_view")).length;
          const atuaisAlcance = facebook.value.filter((item) => item.metricas_disponiveis?.includes("post_total_media_view_unique")).length;
          observacao += ` Página configurada: ${identidade.configurada.name} (${identidade.configurada.id}); posts retornados pelo ID ${identidade.idDosPosts || "não identificado"}${alvo}. Métricas atuais: views ${atuaisViews}/${facebook.value.length}, alcance ${atuaisAlcance}/${facebook.value.length}.`;
        } catch (erro) { observacao += ` Identidade da página não confirmada: ${erro.message}.`; }
        canais.Facebook = resumoCanal(facebook.value, observacao);
      } else canais.Facebook = { ok: false, total: 0, observacao: facebook.reason.message };
      if (instagram.status === "fulfilled") {
        publicacoes.push(...instagram.value);
        canais.Instagram = resumoCanal(instagram.value, "Instagram Graph API conectada.");
      } else canais.Instagram = { ok: false, total: 0, observacao: instagram.reason.message };
    } catch (erro) {
      canais.Facebook = { ok: false, total: 0, observacao: erro.message };
      canais.Instagram = { ok: false, total: 0, observacao: erro.message };
    }
  } else {
    canais.Facebook = { ok: false, total: 0, observacao: "META_PAGE_TOKEN ausente" };
    canais.Instagram = { ok: false, total: 0, observacao: "META_PAGE_TOKEN ausente" };
  }
  try {
    const youtube = await coletarYoutube();
    publicacoes.push(...youtube.itens);
    canais.YouTube = resumoCanal(youtube.itens, youtube.observacao);
  } catch (erro) { canais.YouTube = { ok: false, total: 0, observacao: erro.message }; }
  canais.TikTok = { ok: false, total: 0, publicos: 0, medidos: 0, mediana_views: null, observacao: "Publicação pausada por decisão do escritório; nenhuma métrica foi inventada." };

  let leads;
  try { leads = await coletarLeads(); }
  catch (erro) { leads = { total: 0, radar: 0, markdown: `Coleta de leads indisponível: ${erro.message}` }; }

  const pesosAntes = lerPesos();
  const relatorioJaExiste = fs.existsSync(destino);
  const pesosDepois = relatorioJaExiste ? pesosAntes : atualizarPesos(pesosAntes, publicacoes, LIMITE_VARIACAO);
  salvarPesos(pesosDepois);
  const fim = new Date();
  const markdown = renderizarRelatorio({
    data: isoData(fim), inicio: isoData(inicioPeriodo()), fim: isoData(fim),
    publicacoes, canais, leads, pesosAntes, pesosDepois,
  });
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, markdown, "utf8");
  console.log(JSON.stringify({ ok: true, destino, publicacoes: publicacoes.length, canais, leads: leads.total, pesosAntes, pesosDepois }));
}

if (require.main === module) main().catch((erro) => { console.error(erro); process.exit(1); });

module.exports = { coletarFacebook, coletarInstagram, coletarLeads, coletarYoutube, diagnosticarMeta, idPublicoDaUrl, resolverPageToken, resumoCanal };
