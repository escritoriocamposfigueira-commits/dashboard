export const OPERACOES = new Set(["imobiliaria", "engenharia", "advocacia"]);
export const FONTES = new Set([
  "formulario", "comentario_instagram", "comentario_facebook", "dm", "whatsapp",
  "google_meu_negocio", "indicacao", "mailerfind_b2b", "site", "youtube", "tiktok",
]);
export const REDES_SOCIAIS = new Set(["facebook", "instagram"]);
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
  const aceitos = new Set(["whatsapp", "email", "social"]);
  return [...new Set((Array.isArray(input) ? input : [input]).map((x) => String(x || "").toLowerCase()))]
    .filter((x) => aceitos.has(x));
}

export function validarLead(input = {}) {
  const operacao = String(input.operacao || "").toLowerCase();
  const fonte = String(input.fonte || "formulario").toLowerCase();
  const telefone_e164 = normalizarTelefoneBR(input.telefone);
  const email_normalizado = normalizarEmail(input.email);
  const consentiu = input.consentimento === true || input.consentimento === "true";
  const baseLegal = ["legitimo_interesse_b2b", "interacao_iniciada"].includes(input.base_legal)
    ? input.base_legal
    : "consentimento";
  const rede_social = String(input.rede_social || "").toLowerCase();
  const social_profile_id = normalizarTexto(input.social_profile_id, 160) || null;
  const erros = [];
  if (!OPERACOES.has(operacao)) erros.push("operação inválida");
  if (!FONTES.has(fonte)) erros.push("fonte inválida");
  if (!normalizarTexto(input.nome, 120)) erros.push("nome obrigatório");
  if (!normalizarTexto(input.interesse, 160)) erros.push("interesse obrigatório");
  if (!telefone_e164 && !email_normalizado && !(REDES_SOCIAIS.has(rede_social) && social_profile_id)) {
    erros.push("WhatsApp, e-mail ou perfil social válido é obrigatório");
  }
  if (baseLegal === "consentimento" && !consentiu) erros.push("consentimento obrigatório");
  if (operacao === "advocacia" && !["consentimento", "interacao_iniciada"].includes(baseLegal)) {
    erros.push("advocacia exige contato iniciado pelo interessado");
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
      rede_social: REDES_SOCIAIS.has(rede_social) ? rede_social : null,
      social_profile_id,
      social_username: normalizarTexto(input.social_username, 160) || null,
      base_legal: baseLegal,
      consentimento_texto: baseLegal !== "legitimo_interesse_b2b"
        ? normalizarTexto(input.consentimento_texto, 1000)
        : null,
      consentimento_em: baseLegal !== "legitimo_interesse_b2b" ? new Date().toISOString() : null,
      canal_autorizado: canal,
      etapa: baseLegal === "legitimo_interesse_b2b" ? "validar" : "novo",
      metadata: typeof input.metadata === "object" && input.metadata ? input.metadata : {},
    },
  };
}

export function chaveDedupe(lead) {
  return lead.telefone_e164
    ? `${lead.operacao}|tel:${lead.telefone_e164}`
    : lead.email_normalizado
      ? `${lead.operacao}|email:${lead.email_normalizado}`
      : `${lead.operacao}|${lead.rede_social}:${lead.social_profile_id}`;
}

const REGRAS_SOCIAIS = [
  {
    operacao: "engenharia",
    interesse: "engenharia, obra ou regularização técnica",
    palavras: ["OBRA", "REFORMA", "ENGENHARIA", "PROJETO", "LAUDO", "DESMEMBRAMENTO", "TOPOGRAFIA", "GEORREFERENCIAMENTO"],
  },
  {
    operacao: "advocacia",
    interesse: "atendimento jurídico imobiliário",
    palavras: ["INVENTARIO", "USUCAPIAO", "ESCRITURA", "ADVOGADO", "JURIDICO", "RETIFICACAO", "REGULARIZAR"],
  },
  {
    operacao: "imobiliaria",
    interesse: "locação de imóvel",
    palavras: ["ALUGAR", "ALUGUEL", "LOCACAO", "LOCAR"],
  },
  {
    operacao: "imobiliaria",
    interesse: "venda, avaliação ou administração de imóvel",
    palavras: ["AVALIAR", "VENDER", "ADMINISTRAR", "CAPTACAO"],
  },
  {
    operacao: "imobiliaria",
    interesse: "compra de imóvel",
    palavras: ["IMOVEL", "COMPRAR", "COMPRA", "CASA", "APARTAMENTO", "TERRENO", "SOBRADO", "VENDA", "GUIA"],
  },
];

export function textoBusca(valor) {
  return normalizarTexto(valor, 2000).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

export function classificarInteracaoSocial(mensagem, contexto = "") {
  const texto = textoBusca(`${mensagem} ${contexto}`);
  if (/\b(SAIR|PARAR|DESCADASTRAR|CANCELAR)\b/.test(texto)) {
    return { acao: "descadastrar", operacao: null, interesse: "descadastro", palavra: "SAIR" };
  }
  for (const regra of REGRAS_SOCIAIS) {
    const palavra = regra.palavras.find((item) => new RegExp(`\\b${item}\\b`).test(texto));
    if (palavra) return { acao: "captar", operacao: regra.operacao, interesse: regra.interesse, palavra };
  }
  return { acao: "ignorar", operacao: null, interesse: null, palavra: null };
}

export function montarRespostaSocial({ classificacao, nome = "", whatsapp = "551123785643" }) {
  const primeiroNome = normalizarTexto(nome, 80).split(" ")[0];
  const saudacao = primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!";
  if (classificacao?.acao === "descadastrar") {
    return `${saudacao} seu pedido foi registrado e não enviaremos novos conteúdos.`;
  }
  const frases = {
    imobiliaria: "Vamos encontrar a melhor oportunidade para você.",
    engenharia: "Nossa equipe técnica pode analisar seu caso com segurança.",
    advocacia: "Para preservar seus dados, o atendimento jurídico continua em conversa privada.",
  };
  const termo = classificacao?.palavra || "ATENDIMENTO";
  const link = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá, vim pelas redes sociais e quero atendimento sobre ${termo}.`)}`;
  return `${saudacao} ${frases[classificacao?.operacao] || "Vamos ajudar você."} Fale com a Campos Figueira: ${link}`;
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
