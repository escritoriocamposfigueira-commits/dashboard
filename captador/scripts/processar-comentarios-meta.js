"use strict";

const { planoRespostaPrivada, planoRespostaPublica } = require("../meta-respostas.js");

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";
const PAGE_ID = process.env.META_PAGE_ID || "512040582222121";
const IG_ID = process.env.META_IG_ID || "17841461388445580";
let TOKEN = process.env.META_PAGE_TOKEN || "";
const API_URL = (process.env.CAPTADOR_API_URL || "").replace(/\/$/, "");
const OIDC_TOKEN = process.env.GITHUB_OIDC_TOKEN || "";
const DRY_RUN = process.env.CAPTADOR_META_DRY_RUN === "true";
const DESDE = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
let classificar;

if (!TOKEN || !API_URL || !OIDC_TOKEN) {
  console.error("Configuração incompleta: Meta token, URL do captador e OIDC são obrigatórios.");
  process.exit(1);
}

async function graphGet(caminho, parametros = {}) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${caminho.replace(/^\//, "")}`);
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== "") url.searchParams.set(chave, String(valor));
  }
  const resposta = await fetch(url, { headers: { authorization: `Bearer ${TOKEN}` } });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(`Meta GET ${caminho}: ${corpo?.error?.message || resposta.status}`);
  return corpo;
}

async function graphPost(caminho, body) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${caminho.replace(/^\//, "")}`;
  const resposta = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok || corpo.error) {
    const erro = new Error(`Meta POST ${caminho}: ${corpo?.error?.message || resposta.status}`);
    erro.metaCode = Number(corpo?.error?.code);
    throw erro;
  }
  return corpo;
}

async function resolverPageToken() {
  try {
    const contas = await graphGet("me/accounts", { fields: "id,name,access_token", limit: 100 });
    const pagina = (contas.data || []).find((item) => String(item.id) === PAGE_ID) || contas.data?.[0];
    if (pagina?.access_token) {
      TOKEN = pagina.access_token;
      return "me/accounts";
    }
  } catch (erro) {
    console.error(`Derivação me/accounts: ${erro.message}`);
  }
  try {
    const pagina = await graphGet(PAGE_ID, { fields: "access_token" });
    if (pagina?.access_token) {
      TOKEN = pagina.access_token;
      return "page-node";
    }
  } catch (erro) {
    console.error(`Derivação page-node: ${erro.message}`);
  }
  return "token-original";
}

async function captador(caminho, payload) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: "POST",
    headers: { authorization: `Bearer ${OIDC_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(`Captador ${caminho}: ${corpo.erro || resposta.status}`);
  return corpo;
}

async function listarTudo(caminho, parametros, limitePaginas = 3) {
  const itens = [];
  let pagina = await graphGet(caminho, parametros);
  for (let i = 0; i < limitePaginas && pagina; i += 1) {
    itens.push(...(pagina.data || []));
    const proxima = pagina.paging?.next;
    if (!proxima) break;
    const resposta = await fetch(proxima, { headers: { authorization: `Bearer ${TOKEN}` } });
    pagina = await resposta.json().catch(() => null);
    if (!resposta.ok) throw new Error(`Meta paginação: ${pagina?.error?.message || resposta.status}`);
  }
  return itens;
}

async function processarComentario(item) {
  if (!item.event_id || !item.social_profile_id || !item.mensagem) return { ignorado: 1 };
  const classificacao = classificar(item.mensagem, item.contexto);
  if (classificacao.acao === "ignorar") return { ignorado: 1 };
  if (DRY_RUN) return { elegivel_sem_envio: 1 };
  const decisao = await captador("/meta-poll", item);
  if (!decisao.responder || !decisao.resposta_publica) return { duplicado: decisao.duplicado ? 1 : 0, ignorado: 1 };
  const privada = planoRespostaPrivada({
    rede: item.rede,
    eventId: item.event_id,
    igId: IG_ID,
    texto: decisao.resposta_publica,
  });
  let canal = "privado";
  try {
    await graphPost(privada.endpoint, privada.body);
  } catch (erro) {
    // Só usar o comentário público se a Meta negou expressamente o Direct.
    // Timeout, erro de confirmação ou mensagem já enviada não são novas autorizações.
    if (![10, 200].includes(erro.metaCode)) throw erro;
    console.error(`Meta negou a permissão de Direct em ${item.rede}; usando resposta pública.`);
    const publica = planoRespostaPublica({
      rede: item.rede,
      eventId: item.event_id,
      texto: decisao.resposta_publica,
    });
    await graphPost(publica.endpoint, publica.body);
    canal = "publico";
  }
  await captador("/meta-poll/ack", { event_id: item.event_id });
  return { captado: 1, respondido: 1, [canal]: 1 };
}

async function processarFacebook() {
  const posts = await listarTudo(`${PAGE_ID}/published_posts`, {
    fields: "id,message,permalink_url,created_time",
    since: DESDE,
    limit: 25,
  });
  const resultados = [];
  for (const post of posts) {
    const comentarios = await listarTudo(`${post.id}/comments`, {
      fields: "id,message,from{id,name},created_time",
      since: DESDE,
      filter: "stream",
      limit: 100,
    });
    for (const comentario of comentarios) {
      if (!comentario.from?.id || comentario.from.id === PAGE_ID) continue;
      resultados.push(await processarComentario({
        event_id: comentario.id,
        rede: "facebook",
        tipo: "comentario",
        social_profile_id: comentario.from.id,
        social_username: comentario.from.name,
        nome: comentario.from.name,
        mensagem: comentario.message,
        contexto: post.message || "",
        url_origem: post.permalink_url || null,
        metadata: { post_id: post.id, created_time: comentario.created_time },
      }));
    }
  }
  return resultados;
}

async function processarInstagram() {
  const midias = await listarTudo(`${IG_ID}/media`, {
    fields: "id,caption,permalink,timestamp",
    since: DESDE,
    limit: 25,
  });
  const resultados = [];
  for (const midia of midias) {
    const comentarios = await listarTudo(`${midia.id}/comments`, {
      fields: "id,text,from{id,username},username,timestamp",
      since: DESDE,
      limit: 100,
    });
    for (const comentario of comentarios) {
      const username = comentario.from?.username || comentario.username || "";
      if (!username || /escritorio[._]?figueira/i.test(username)) continue;
      resultados.push(await processarComentario({
        event_id: comentario.id,
        rede: "instagram",
        tipo: "comentario",
        social_profile_id: comentario.from?.id || username.toLowerCase(),
        social_username: username,
        nome: username,
        mensagem: comentario.text,
        contexto: midia.caption || "",
        url_origem: midia.permalink || null,
        metadata: { media_id: midia.id, timestamp: comentario.timestamp },
      }));
    }
  }
  return resultados;
}

async function principal() {
  ({ classificarInteracaoSocial: classificar } = await import("../supabase/functions/_shared/core.mjs"));
  const resultados = [];
  const origemToken = await resolverPageToken();
  const canaisOk = [];
  const canaisErro = [];
  for (const [nome, executar] of [["Facebook", processarFacebook], ["Instagram", processarInstagram]]) {
    try {
      resultados.push(...await executar());
      canaisOk.push(nome.toLowerCase());
    } catch (erro) {
      console.error(`${nome}: ${erro.message}`);
      canaisErro.push(nome.toLowerCase());
    }
  }
  const totais = resultados.reduce((acc, item) => {
    for (const [chave, valor] of Object.entries(item)) acc[chave] = (acc[chave] || 0) + valor;
    return acc;
  }, {});
  console.log(JSON.stringify({ ok: !canaisErro.length, dry_run: DRY_RUN, origem_token: origemToken, canais_ok: canaisOk, canais_erro: canaisErro, ...totais }));
  if (canaisErro.length) process.exitCode = 1;
}

principal().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});
