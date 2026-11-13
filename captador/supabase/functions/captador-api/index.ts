import { createClient } from "npm:@supabase/supabase-js@2";
import {
  aplicarDescadastro,
  estaBloqueado,
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
    const { data, error } = await db.from("bloqueio").select("operacao,telefone_e164,email_normalizado")
      .eq("telefone_e164", lead.telefone_e164);
    if (error) throw error;
    encontrados.push(...(data || []));
  }
  if (lead.email_normalizado) {
    const { data, error } = await db.from("bloqueio").select("operacao,telefone_e164,email_normalizado")
      .eq("email_normalizado", lead.email_normalizado);
    if (error) throw error;
    encontrados.push(...(data || []));
  }
  return encontrados;
}

async function buscarExistente(lead: Record<string, unknown>) {
  let consulta = db.from("leads").select("*").eq("operacao", lead.operacao).limit(1);
  if (lead.telefone_e164) consulta = consulta.eq("telefone_e164", lead.telefone_e164);
  else consulta = consulta.eq("email_normalizado", lead.email_normalizado);
  const { data, error } = await consulta.maybeSingle();
  if (error) throw error;
  return data;
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
    const { data, error } = await db.from("leads").update({
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
    const { data, error } = await db.from("leads").insert(lead).select("*").single();
    if (error) throw error;
    salvo = data;
  }

  await db.from("interacoes").insert({
    lead_id: salvo.id,
    canal: lead.fonte,
    resumo: duplicado ? "Novo interesse anexado ao lead existente" : "Lead captado",
    automatica: true,
    metadata: { codigo_imovel: lead.codigo_imovel, url_origem: lead.url_origem },
  });
  await db.from("eventos_captacao").insert({
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
  const { error: erroBloqueio } = await db.from("bloqueio").insert(bloqueio);
  if (erroBloqueio && erroBloqueio.code !== "23505") throw erroBloqueio;

  let consulta = db.from("leads").select("*");
  if (operacao) consulta = consulta.eq("operacao", operacao);
  consulta = telefone ? consulta.eq("telefone_e164", telefone) : consulta.eq("email_normalizado", email);
  const { data: encontrados, error } = await consulta;
  if (error) throw error;
  for (const lead of encontrados || []) {
    const alterado = aplicarDescadastro(lead);
    await db.from("leads").update({
      nao_contatar: alterado.nao_contatar,
      motivo_nao_contatar: alterado.motivo_nao_contatar,
      etapa: alterado.etapa,
      canal_autorizado: alterado.canal_autorizado,
    }).eq("id", lead.id);
    await db.from("interacoes").insert({
      lead_id: lead.id, canal: "descadastro", resumo: "Descadastro processado imediatamente", automatica: true,
    });
  }
  return resposta(req, { ok: true, mensagem: "Descadastro concluído. Não enviaremos novos conteúdos." });
}

async function relatorioSemanal(req: Request) {
  const inicio = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data, error } = await db.from("leads").select("operacao,fonte,etapa").gte("data_coleta", inicio);
  if (error) throw error;
  const grupos = new Map<string, number>();
  for (const item of data || []) {
    const chave = `${item.operacao}|${item.fonte}|${item.etapa}`;
    grupos.set(chave, (grupos.get(chave) || 0) + 1);
  }
  const linhas = [...grupos.entries()].sort().map(([chave, total]) => `| ${chave.split("|").join(" | ")} | ${total} |`);
  const markdown = [
    `# Relatório semanal de leads — ${new Date().toISOString().slice(0, 10)}`,
    "", `Total de leads novos: **${(data || []).length}**`, "",
    "| Operação | Fonte | Etapa | Total |", "|---|---|---:|---:|", ...linhas,
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
    if (req.method === "POST" && rota === "/unsubscribe") return descadastrar(req, await json(req));

    if (rota.startsWith("/admin") || rota.startsWith("/report") || rota.startsWith("/maintenance")
      || rota.startsWith("/leads/para-receber-conteudo")) {
      if (!exigirInterno(req)) return resposta(req, { ok: false, erro: "não autorizado" }, 401);
    }

    if (req.method === "POST" && rota === "/admin/leads") {
      const input = await json(req);
      const resultado = await registrarLead({ ...input, fonte: input.fonte || "indicacao" });
      return resposta(req, resultado.body, resultado.status);
    }
    if (req.method === "GET" && rota === "/admin/leads") {
      const url = new URL(req.url);
      let consulta = db.from("leads").select("*").order("data_coleta", { ascending: false }).limit(500);
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
      const { data, error } = await db.from("leads").update(permitido).eq("id", patchLead[1]).select("*").single();
      if (error) throw error;
      return resposta(req, { ok: true, lead: data });
    }
    if (req.method === "GET" && rota === "/leads/para-receber-conteudo") {
      const url = new URL(req.url);
      const operacao = url.searchParams.get("operacao") || "imobiliaria";
      const interesse = url.searchParams.get("interesse");
      const canal = url.searchParams.get("canal") || "whatsapp";
      let consulta = db.from("leads").select("id,nome,telefone_e164,email_normalizado,operacao,interesse,etapa,canal_autorizado,nao_contatar")
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
