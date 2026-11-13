export const OPERACOES = new Set(["imobiliaria", "engenharia", "advocacia"]);
export const FONTES = new Set([
  "formulario", "comentario_instagram", "comentario_facebook", "dm", "whatsapp",
  "google_meu_negocio", "indicacao", "mailerfind_b2b", "site", "youtube", "tiktok",
]);
export const ETAPAS = new Set([
  "novo", "validar", "qualificado", "contato_autorizado", "reuniao", "visita",
  "proposta", "contratado", "perdido", "nao_contatar",
]);

export function somenteDigitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

export function normalizarTelefoneBR(valor) {
  let digitos = somenteDigitos(valor);
  if (digitos.startsWith("00")) digitos = digitos.slice(2);
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (!digitos.startsWith("55") || ![12, 13].includes(digitos.length)) return null;
  return `+${digitos}`;
}

export function normalizarEmail(valor) {
  const email = String(valor ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function normalizarTexto(valor, maximo = 500) {
  return String(valor ?? "").trim().replace(/\s+/g, " ").slice(0, maximo);
}

export function canaisAutorizados(input) {
  const aceitos = new Set(["whatsapp", "email"]);
  return [...new Set((Array.isArray(input) ? input : [input]).map((x) => String(x || "").toLowerCase()))]
    .filter((x) => aceitos.has(x));
}

export function validarLead(input = {}) {
  const operacao = String(input.operacao || "").toLowerCase();
  const fonte = String(input.fonte || "formulario").toLowerCase();
  const telefone_e164 = normalizarTelefoneBR(input.telefone);
  const email_normalizado = normalizarEmail(input.email);
  const consentiu = input.consentimento === true || input.consentimento === "true";
  const baseLegal = input.base_legal === "legitimo_interesse_b2b"
    ? "legitimo_interesse_b2b"
    : "consentimento";
  const erros = [];
  if (!OPERACOES.has(operacao)) erros.push("operação inválida");
  if (!FONTES.has(fonte)) erros.push("fonte inválida");
  if (!normalizarTexto(input.nome, 120)) erros.push("nome obrigatório");
  if (!normalizarTexto(input.interesse, 160)) erros.push("interesse obrigatório");
  if (!telefone_e164 && !email_normalizado) erros.push("WhatsApp ou e-mail válido é obrigatório");
  if (baseLegal === "consentimento" && !consentiu) erros.push("consentimento obrigatório");
  if (operacao === "advocacia" && baseLegal !== "consentimento") {
    erros.push("advocacia exige contato iniciado e consentimento");
  }

  const canal = canaisAutorizados(input.canal_autorizado);
  if (baseLegal === "consentimento" && consentiu && canal.length === 0) {
    if (telefone_e164) canal.push("whatsapp");
    else if (email_normalizado) canal.push("email");
  }

  return {
    ok: erros.length === 0,
    erros,
    lead: {
      operacao,
      fonte,
      url_origem: normalizarTexto(input.url_origem, 1000) || null,
      nome: normalizarTexto(input.nome, 120),
      empresa: normalizarTexto(input.empresa, 160) || null,
      categoria: normalizarTexto(input.categoria, 160) || null,
      municipio: normalizarTexto(input.municipio, 120) || null,
      bairro: normalizarTexto(input.bairro, 120) || null,
      interesse: normalizarTexto(input.interesse, 160),
      faixa_preco: normalizarTexto(input.faixa_preco, 120) || null,
      codigo_imovel: normalizarTexto(input.codigo_imovel, 80) || null,
      telefone: normalizarTexto(input.telefone, 40) || null,
      telefone_e164,
      email: normalizarTexto(input.email, 240) || null,
      email_normalizado,
      base_legal: baseLegal,
      consentimento_texto: baseLegal === "consentimento"
        ? normalizarTexto(input.consentimento_texto, 1000)
        : null,
      consentimento_em: baseLegal === "consentimento" ? new Date().toISOString() : null,
      canal_autorizado: canal,
      etapa: baseLegal === "legitimo_interesse_b2b" ? "validar" : "novo",
      metadata: typeof input.metadata === "object" && input.metadata ? input.metadata : {},
    },
  };
}

export function chaveDedupe(lead) {
  return lead.telefone_e164
    ? `${lead.operacao}|tel:${lead.telefone_e164}`
    : `${lead.operacao}|email:${lead.email_normalizado}`;
}

export function estaBloqueado(lead, bloqueios = []) {
  return bloqueios.some((item) => {
    const mesmaOperacao = !item.operacao || item.operacao === lead.operacao;
    const mesmoTelefone = lead.telefone_e164 && item.telefone_e164 === lead.telefone_e164;
    const mesmoEmail = lead.email_normalizado && item.email_normalizado === lead.email_normalizado;
    return mesmaOperacao && (mesmoTelefone || mesmoEmail);
  });
}

export function respostaAutomaticaSegura(lead) {
  if (lead.operacao === "advocacia") {
    return "Recebemos sua mensagem. Um advogado responsável analisará o contato e responderá pessoalmente.";
  }
  if (lead.operacao === "engenharia") {
    return `Olá, ${lead.nome}. Recebemos seu interesse em ${lead.interesse}. A equipe técnica da Campos Figueira vai analisar e falar com você.`;
  }
  const referencia = lead.codigo_imovel ? ` sobre o imóvel ${lead.codigo_imovel}` : "";
  return `Olá, ${lead.nome}. Recebemos seu interesse${referencia}. A equipe Campos Figueira vai continuar seu atendimento pelo canal autorizado.`;
}

export function podeReceberConteudo(lead, canal) {
  return Boolean(
    lead
    && lead.operacao !== "advocacia"
    && !lead.nao_contatar
    && ["contato_autorizado", "qualificado", "novo"].includes(lead.etapa)
    && Array.isArray(lead.canal_autorizado)
    && lead.canal_autorizado.includes(canal),
  );
}

export function linhaEhEmpresa(row = {}) {
  const empresa = normalizarTexto(row.empresa || row.company || row.nome_empresa, 160);
  const cnpj = somenteDigitos(row.cnpj || row.documento);
  const site = normalizarTexto(row.site || row.website, 300);
  const categoria = normalizarTexto(row.categoria || row.category, 160);
  const nome = normalizarTexto(row.nome || row.name, 160);
  const parecePessoa = /^(sr\.?|sra\.?|dr\.?|dra\.?|pessoa fisica|particular)\b/i.test(nome);
  return Boolean(empresa && !parecePessoa && (cnpj.length === 14 || site || categoria));
}

export function aplicarDescadastro(lead, motivo = "Solicitação SAIR") {
  return {
    ...lead,
    nao_contatar: true,
    motivo_nao_contatar: motivo,
    etapa: "nao_contatar",
    canal_autorizado: [],
  };
}
