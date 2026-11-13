import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";
import {
  aplicarDescadastro,
  classificarInteracaoSocial,
  estaBloqueado,
  montarRespostaSocial,
  normalizarEmail,
  normalizarTelefoneBR,
  normalizarTexto,
  podeReceberConteudo,
  respostaAutomaticaSegura,
  validarLead,
} from "../_shared/core.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const INTERNAL_TOKEN = Deno.env.get("CAPTADOR_INTERNAL_TOKEN") || "";
const MANYCHAT_TOKEN = Deno.env.get("MANYCHAT_WEBHOOK_TOKEN") || "";
const WHATSAPP = Deno.env.get("WHATSAPP_IMOBILIARIA") || "551123785643";
const GITHUB_REPOSITORY = Deno.env.get("CAPTADOR_GITHUB_REPOSITORY") || "escritoriocamposfigueira-commits/dashboard";
const GITHUB_BRANCH = Deno.env.get("CAPTADOR_GITHUB_BRANCH") || "claude/campos-figueira-growth-qmjsux";
const OIDC_AUDIENCE = Deno.env.get("CAPTADOR_OIDC_AUDIENCE") || `${SUPABASE_URL}/functions/v1/captador-api/meta-poll`;
const GITHUB_JWKS = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const ORIGENS = new Set((Deno.env.get("CAPTADOR_ALLOWED_ORIGINS") || [
  "https://escritoriocamposfigueira-commits.github.io",
  "https://www.escritoriocamposfigueira.com.br",
  "https://escritoriocamposfigueira.com.br",
].join(",")).split(",").map((x) => x.trim()).filter(Boolean));

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase não configurado no ambiente seguro.");
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function cors(req: Request) {
  const origem = req.headers.get("origin") || "";
  const permitida = ORIGENS.has(origem) ? origem : [...ORIGENS][0] || "null";
  return {
    "access-control-allow-origin": permitida,
    "access-control-allow-headers": "authorization, content-type, x-internal-token",
    "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function resposta(req: Request, body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...cors(req), ...headers },
  });
}

function bearer(req: Request) {
  return (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
}

function exigirInterno(req: Request) {
  const recebido = req.headers.get("x-internal-token") || bearer(req);
  return Boolean(INTERNAL_TOKEN && recebido && recebido === INTERNAL_TOKEN);
}

async function exigirGitHubActions(req: Request) {
  const token = bearer(req);
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, GITHUB_JWKS, {
      issuer: "https://token.actions.githubusercontent.com",
      audience: OIDC_AUDIENCE,
    });
    const workflow = String(payload.job_workflow_ref || payload.workflow_ref || "");
    const workflowPermitido = ["captador-meta.yml", "captador-relatorio.yml"]
      .some((arquivo) => workflow.includes(`${GITHUB_REPOSITORY}/.github/workflows/${arquivo}@`));
    return payload.repository === GITHUB_REPOSITORY
      && payload.ref === `refs/heads/${GITHUB_BRANCH}`
      && workflowPermitido;
  } catch (erro) {
    console.error("OIDC GitHub recusado", erro);
    return false;
  }
}

function caminho(req: Request) {
  const url = new URL(req.url);
  const marcador = "/captador-api";
  const indice = url.pathname.indexOf(marcador);
  return indice >= 0 ? url.pathname.slice(indice + marcador.length) || "/" : url.pathname;
}

async function json(req: Request) {
  try { return await req.json(); } catch { throw new Error("JSON inválido"); }
}

async function buscarBloqueios(lead: Record<string, unknown>) {
  const encontrados = [];
  if (lead.telefone_e164) {
    const { data, error } = await db.from("captador_bloqueio").select("operacao,telefone_e164,email_normalizado")
      .eq("telefone_e164", lead.telefone_e164);
    if (error) throw error;
    encontrados.push(...(data || []));
  }
  if (lead.email_normalizado) {
    const { data, error } = await db.from("captador_bloqueio").select("operacao,telefone_e164,email_normalizado")
      .eq("email_normalizado", lead.email_normalizado);
    if (error) throw error;
    encontrados.push(...(data || []));
  }
  return encontrados;
}

async function buscarExistente(lead: Record<string, unknown>) {
  let consulta = db.from("captador_leads").select("*").eq("operacao", lead.operacao).limit(1);
  if (lead.telefone_e164) consulta = consulta.eq("telefone_e164", lead.telefone_e164);
  else if (lead.email_normalizado) consulta = consulta.eq("email_normalizado", lead.email_normalizado);
  else consulta = consulta.eq("rede_social", lead.rede_social).eq("social_profile_id", lead.social_profile_id);
  const { data, error } = await consulta.maybeSingle();
  if (error) throw error;
  return data;
}

async function processarEventoSocial(input: Record<string, unknown>) {
  const eventId = normalizarTexto(input.event_id, 240);
  const rede = normalizarTexto(input.rede, 30).toLowerCase();
  const mensagem = normalizarTexto(input.mensagem, 2000);
  const profileId = normalizarTexto(input.social_profile_id, 160);
  const username = normalizarTexto(input.social_username, 160);
  const nome = normalizarTexto(input.nome, 120) || username || "Contato das redes sociais";
  const contexto = normalizarTexto(input.contexto, 2000);
  if (!eventId || !["facebook", "instagram"].includes(rede) || !mensagem || !profileId) {
    return { status: 400, body: { ok: false, erro: "evento social inválido" } };
  }

  const classificacao = classificarInteracaoSocial(mensagem, contexto);
  if (classificacao.acao === "ignorar") {
    return { status: 200, body: { ok: true, responder: false, motivo: "sem intenção comercial identificada" } };
  }

  const evento = {
    event_id: eventId,
    rede,
    tipo: normalizarTexto(input.tipo, 40) || "comentario",
    social_profile_id: profileId,
    social_username: username || null,
    mensagem,
    url_origem: normalizarTexto(input.url_origem, 1000) || null,
    metadata: typeof input.metadata === "object" && input.metadata ? input.metadata : {},
  };
  const { error: erroEvento } = await db.from("captador_eventos_social").insert(evento);
  if (erroEvento?.code === "23505") {
    return { status: 200, body: { ok: true, responder: false, duplicado: true } };
  }
  if (erroEvento) throw erroEvento;

  if (classificacao.acao === "descadastrar") {
    const { data: leads } = await db.from("captador_leads").select("id").eq("rede_social", rede).eq("social_profile_id", profileId);
    for (const lead of leads || []) {
      await db.from("captador_leads").update({ nao_contatar: true, motivo_nao_contatar: "Solicitação SAIR em rede social", etapa: "nao_contatar", canal_autorizado: [] }).eq("id", lead.id);
    }
    return {
      status: 200,
      body: { ok: true, responder: true, resposta_publica: montarRespostaSocial({ classificacao, nome, whatsapp: WHATSAPP }) },
    };
  }

  const resultado = await registrarLead({
    operacao: classificacao.operacao,
    fonte: rede === "facebook" ? "comentario_facebook" : "comentario_instagram",
    nome,
    interesse: classificacao.interesse,
    base_legal: "interacao_iniciada",
    consentimento_texto: `Interação iniciada pelo próprio interessado em comentário público com a palavra ${classificacao.palavra}.`,
    canal_autorizado: ["social"],
    rede_social: rede,
    social_profile_id: profileId,
    social_username: username,
    url_origem: evento.url_origem,
    metadata: { ...evento.metadata, palavra_chave: classificacao.palavra, social_event_id: eventId },
  });
  if (resultado.status >= 400) return resultado;
  await db.from("captador_eventos_social").update({ lead_id: resultado.body.lead_id }).eq("event_id", eventId);
  return {
    status: resultado.status,
    body: {
      ok: true,
      lead_id: resultado.body.lead_id,
      duplicado_lead: resultado.body.duplicado,
      responder: true,
      resposta_publica: montarRespostaSocial({ classificacao, nome, whatsapp: WHATSAPP }),
    },
  };
}

async function registrarLead(input: Record<string, unknown>) {
  const validado = validarLead(input);
  if (!validado.ok) return { status: 400, body: { ok: false, erros: validado.erros } };
  const lead = validado.lead;
  if (estaBloqueado(lead, await buscarBloqueios(lead))) {
    return { status: 409, body: { ok: false, erro: "contato bloqueado; nenhuma mensagem será enviada" } };
  }

  const existente = await buscarExistente(lead);
  if (existente?.nao_contatar) {
    return { status: 409, body: { ok: false, erro: "contato pediu descadastro" } };
  }

  let salvo;
  let duplicado = false;
  if (existente) {
    duplicado = true;
    const canais = [...new Set([...(existente.canal_autorizado || []), ...lead.canal_autorizado])];
    const { data, error } = await db.from("captador_leads").update({
      fonte: lead.fonte,
      url_origem: lead.url_origem || existente.url_origem,
      interesse: lead.interesse,
      faixa_preco: lead.faixa_preco || existente.faixa_preco,
      codigo_imovel: lead.codigo_imovel || existente.codigo_imovel,
      consentimento_texto: lead.consentimento_texto || existente.consentimento_texto,
      consentimento_em: lead.consentimento_em || existente.consentimento_em,
      canal_autorizado: canais,
      metadata: { ...(existente.metadata || {}), ...(lead.metadata || {}) },
    }).eq("id", existente.id).select("*").single();
    if (error) throw error;
    salvo = data;
  } else {
    const { data, error } = await db.from("captador_leads").insert(lead).select("*").single();
    if (error) throw error;
    salvo = data;
  }

  await db.from("captador_interacoes").insert({
    lead_id: salvo.id,
    canal: lead.fonte,
    resumo: duplicado ? "Novo interesse anexado ao lead existente" : "Lead captado",
    automatica: true,
    metadata: { codigo_imovel: lead.codigo_imovel, url_origem: lead.url_origem },
  });
  await db.from("captador_eventos").insert({
    tipo: duplicado ? "lead_atualizado" : "lead_criado",
    operacao: lead.operacao,
    fonte: lead.fonte,
    campanha: lead.metadata?.campanha || null,
    codigo_imovel: lead.codigo_imovel,
    url_origem: lead.url_origem,
    lead_id: salvo.id,
  });

  const textoWhatsApp = lead.codigo_imovel
    ? `Olá, tenho interesse no ${lead.codigo_imovel}. Meu nome é ${lead.nome}.`
    : `Olá, meu nome é ${lead.nome} e tenho interesse em ${lead.interesse}.`;
  return {
    status: duplicado ? 200 : 201,
    body: {
      ok: true,
      lead_id: salvo.id,
      duplicado,
      resposta: respostaAutomaticaSegura(salvo),
      whatsapp_url: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(textoWhatsApp)}`,
    },
  };
}

async function descadastrar(req: Request, input: Record<string, unknown>) {
  const operacaoTexto = normalizarTexto(input.operacao, 30).toLowerCase();
  const operacao = operacaoTexto || null;
  const telefone = normalizarTelefoneBR(input.telefone);
  const email = normalizarEmail(input.email);
  if (!telefone && !email) return resposta(req, { ok: false, erro: "contato inválido" }, 400);
  const bloqueio = {
    operacao: ["imobiliaria", "engenharia", "advocacia"].includes(operacao || "") ? operacao : null,
    telefone_e164: telefone,
    email_normalizado: email,
    motivo: "Solicitação SAIR/descadastro",
    permanente: true,
  };
  const { error: erroBloqueio } = await db.from("captador_bloqueio").insert(bloqueio);
  if (erroBloqueio && erroBloqueio.code !== "23505") throw erroBloqueio;

  let consulta = db.from("captador_leads").select("*");
  if (operacao) consulta = consulta.eq("operacao", operacao);
  consulta = telefone ? consulta.eq("telefone_e164", telefone) : consulta.eq("email_normalizado", email);
  const { data: encontrados, error } = await consulta;
  if (error) throw error;
  for (const lead of encontrados || []) {
    const alterado = aplicarDescadastro(lead);
    await db.from("captador_leads").update({
      nao_contatar: alterado.nao_contatar,
      motivo_nao_contatar: alterado.motivo_nao_contatar,
      etapa: alterado.etapa,
      canal_autorizado: alterado.canal_autorizado,
    }).eq("id", lead.id);
    await db.from("captador_interacoes").insert({
      lead_id: lead.id, canal: "descadastro", resumo: "Descadastro processado imediatamente", automatica: true,
    });
  }
  return resposta(req, { ok: true, mensagem: "Descadastro concluído. Não enviaremos novos conteúdos." });
}

async function relatorioSemanal(req: Request) {
  const inicio = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data, error } = await db.from("captador_leads").select("operacao,fonte,etapa").gte("data_coleta", inicio);
  if (error) throw error;
  const grupos = new Map<string, number>();
  for (const item of data || []) {
    const chave = `${item.operacao}|${item.fonte}|${item.etapa}`;
    grupos.set(chave, (grupos.get(chave) || 0) + 1);
  }
  const linhas = [...grupos.entries()].sort().map(([chave, total]) => `| ${chave.split("|").join(" | ")} | ${total} |`);
  const { count: radarTotal, error: erroRadar } = await db.from("captador_radar")
    .select("slug", { count: "exact", head: true }).eq("status", "radar");
  if (erroRadar) throw erroRadar;
  const markdown = [
    `# Relatório semanal de leads — ${new Date().toISOString().slice(0, 10)}`,
    "", `Total de leads novos: **${(data || []).length}**`, "",
    "| Operação | Fonte | Etapa | Total |", "|---|---|---:|---:|", ...linhas,
    "", `Oportunidades aguardando validação no radar: **${radarTotal || 0}**`,
    "", "Relatório agregado: nenhum dado pessoal foi gravado no GitHub.", "",
  ].join("\n");
  return resposta(req, { ok: true, markdown, total: (data || []).length });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  const rota = caminho(req);
  try {
    if (req.method === "GET" && rota === "/health") {
      return resposta(req, { ok: true, servico: "captador-api", data: new Date().toISOString() });
    }
    if (req.method === "POST" && rota === "/leads") {
      const input = await json(req);
      if (input.website) return resposta(req, { ok: true });
      const resultado = await registrarLead(input);
      return resposta(req, resultado.body, resultado.status);
    }
    if (req.method === "POST" && rota === "/webhooks/manychat") {
      if (!MANYCHAT_TOKEN || bearer(req) !== MANYCHAT_TOKEN) return resposta(req, { ok: false }, 401);
      const payload = await json(req);
      const resultado = await registrarLead({
        ...payload,
        fonte: payload.rede === "facebook" ? "comentario_facebook" : "comentario_instagram",
        consentimento: true,
        consentimento_texto: `Contato iniciado por comentário com a palavra ${payload.palavra_chave || "informada"}.`,
        canal_autorizado: ["whatsapp"],
        metadata: { ...(payload.metadata || {}), manychat_contact_id: payload.contact_id, palavra_chave: payload.palavra_chave },
      });
      return resposta(req, resultado.body, resultado.status);
    }
    if (req.method === "POST" && rota === "/meta-poll") {
      if (!(await exigirGitHubActions(req))) return resposta(req, { ok: false, erro: "origem não autorizada" }, 401);
      const resultado = await processarEventoSocial(await json(req));
      return resposta(req, resultado.body, resultado.status);
    }
    if (req.method === "POST" && rota === "/meta-poll/ack") {
      if (!(await exigirGitHubActions(req))) return resposta(req, { ok: false, erro: "origem não autorizada" }, 401);
      const input = await json(req);
      const eventId = normalizarTexto(input.event_id, 240);
      if (!eventId) return resposta(req, { ok: false, erro: "event_id obrigatório" }, 400);
      const { error } = await db.from("captador_eventos_social").update({ respondido: true, resposta_em: new Date().toISOString() }).eq("event_id", eventId);
      if (error) throw error;
      return resposta(req, { ok: true });
    }
    if (req.method === "POST" && rota === "/unsubscribe") return descadastrar(req, await json(req));

    if (rota.startsWith("/admin") || rota.startsWith("/report") || rota.startsWith("/maintenance")
      || rota.startsWith("/leads/para-receber-conteudo")) {
      if (!exigirInterno(req) && !(await exigirGitHubActions(req))) {
        return resposta(req, { ok: false, erro: "não autorizado" }, 401);
      }
    }

    if (req.method === "POST" && rota === "/admin/leads") {
      const input = await json(req);
      const resultado = await registrarLead({ ...input, fonte: input.fonte || "indicacao" });
      return resposta(req, resultado.body, resultado.status);
    }
    if (req.method === "POST" && rota === "/admin/radar") {
      const input = await json(req);
      const itens = (Array.isArray(input.itens) ? input.itens.slice(0, 100) : []) as Record<string, unknown>[];
      if (!itens.length) return resposta(req, { ok: false, erro: "lote vazio" }, 400);
      const limpos = itens.map((item: Record<string, unknown>) => ({
        slug: normalizarTexto(item.slug, 240),
        nome: normalizarTexto(item.nome, 160) || null,
        telefone_e164: normalizarTelefoneBR(item.telefone),
        email_normalizado: normalizarEmail(item.email),
        tipo_cliente: normalizarTexto(item.tipo_cliente, 80) || null,
        servico: normalizarTexto(item.servico, 80),
        bairro: normalizarTexto(item.bairro, 120) || null,
        endereco: normalizarTexto(item.endereco, 300) || null,
        valor_base: Number.isFinite(Number(item.valor_base)) ? Number(item.valor_base) : null,
        qtd_imoveis: Math.max(1, Math.min(10000, Number(item.qtd_imoveis) || 1)),
        fonte: normalizarTexto(item.fonte, 120) || null,
        url_origem: normalizarTexto(item.link, 1000) || null,
        dias_no_ar: Number.isFinite(Number(item.dias_no_ar)) ? Number(item.dias_no_ar) : null,
        status: normalizarTexto(item.status, 40) || "radar",
        score: Number.isFinite(Number(item.score)) ? Number(item.score) : 0,
        observacoes: normalizarTexto(item.obs, 4000) || null,
        valor_fechado: Number.isFinite(Number(item.valor_fechado)) ? Number(item.valor_fechado) : null,
        contatado_em: item.contatado_em || null,
        fechado_em: item.fechado_em || null,
        atualizado_em: item.atualizado || null,
        metadata: { origem: "crm_local_captacao_mogi" },
      })).filter((item) => item.slug && item.servico);
      const { error } = await db.from("captador_radar").upsert(limpos, { onConflict: "slug" });
      if (error) throw error;
      return resposta(req, { ok: true, importados: limpos.length });
    }
    if (req.method === "GET" && rota === "/admin/radar") {
      const url = new URL(req.url);
      let consulta = db.from("captador_radar").select("*").order("score", { ascending: false }).limit(500);
      if (url.searchParams.get("status")) consulta = consulta.eq("status", url.searchParams.get("status"));
      if (url.searchParams.get("servico")) consulta = consulta.eq("servico", url.searchParams.get("servico"));
      const { data, error } = await consulta;
      if (error) throw error;
      return resposta(req, { ok: true, oportunidades: data });
    }
    if (req.method === "GET" && rota === "/admin/leads") {
      const url = new URL(req.url);
      let consulta = db.from("captador_leads").select("*").order("data_coleta", { ascending: false }).limit(500);
      if (url.searchParams.get("operacao")) consulta = consulta.eq("operacao", url.searchParams.get("operacao"));
      if (url.searchParams.get("etapa")) consulta = consulta.eq("etapa", url.searchParams.get("etapa"));
      const { data, error } = await consulta;
      if (error) throw error;
      return resposta(req, { ok: true, leads: data });
    }
    const patchLead = rota.match(/^\/admin\/leads\/([0-9a-f-]+)$/i);
    if (req.method === "PATCH" && patchLead) {
      const input = await json(req);
      const permitido: Record<string, unknown> = {};
      for (const campo of ["etapa", "responsavel", "ultimo_contato", "motivo_nao_contatar"]) {
        if (input[campo] !== undefined) permitido[campo] = input[campo];
      }
      const { data, error } = await db.from("captador_leads").update(permitido).eq("id", patchLead[1]).select("*").single();
      if (error) throw error;
      return resposta(req, { ok: true, lead: data });
    }
    if (req.method === "GET" && rota === "/leads/para-receber-conteudo") {
      const url = new URL(req.url);
      const operacao = url.searchParams.get("operacao") || "imobiliaria";
      const interesse = url.searchParams.get("interesse");
      const canal = url.searchParams.get("canal") || "whatsapp";
      let consulta = db.from("captador_leads").select("id,nome,telefone_e164,email_normalizado,operacao,interesse,etapa,canal_autorizado,nao_contatar")
        .eq("operacao", operacao).eq("nao_contatar", false).contains("canal_autorizado", [canal]).limit(500);
      if (interesse) consulta = consulta.ilike("interesse", `%${interesse}%`);
      const { data, error } = await consulta;
      if (error) throw error;
      return resposta(req, { ok: true, leads: (data || []).filter((lead) => podeReceberConteudo(lead, canal)) });
    }
    if (req.method === "GET" && rota === "/report/weekly") return relatorioSemanal(req);
    if (req.method === "POST" && rota === "/maintenance/cleanup") {
      const { data, error } = await db.rpc("limpar_leads_expirados");
      if (error) throw error;
      return resposta(req, { ok: true, removidos: data || 0 });
    }
    return resposta(req, { ok: false, erro: "rota não encontrada" }, 404);
  } catch (erro) {
    console.error(erro);
    return resposta(req, { ok: false, erro: "falha interna; a equipe foi notificada" }, 500);
  }
});
