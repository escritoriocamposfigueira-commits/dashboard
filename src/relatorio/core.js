"use strict";

const FORMATOS = ["feed", "reel", "story", "video"];

function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function definido(valor) {
  return valor !== null && valor !== undefined && valor !== "" && Number.isFinite(Number(valor));
}

function textoCurto(valor, limite = 84) {
  const limpo = String(valor || "").replace(/\s+/g, " ").trim();
  return limpo.length > limite ? `${limpo.slice(0, limite - 1).trim()}…` : limpo;
}

function codigoDaLegenda(texto = "") {
  const padroes = [
    /\bCF\s*[-–]?\s*([A-Z0-9]+)\b/i,
    /\b(?:ALUGUEL|TERRENO|CONDOMINIO|CONDOMÍNIO)\s+([A-Z0-9]+)\b/i,
  ];
  for (const padrao of padroes) {
    const achado = String(texto).match(padrao);
    if (achado) return `CF-${achado[1].toUpperCase()}`;
  }
  return "—";
}

function metricasPublicacao(item = {}) {
  const alcanceBruto = item.alcance ?? item.reach;
  const visualizacoesBruto = item.visualizacoes ?? item.views;
  const alcance = definido(alcanceBruto) ? numero(alcanceBruto) : null;
  const visualizacoes = definido(visualizacoesBruto) ? numero(visualizacoesBruto) : null;
  const curtidas = numero(item.curtidas || item.likes);
  const comentarios = numero(item.comentarios || item.comments);
  const compartilhamentos = numero(item.compartilhamentos || item.shares);
  const salvamentos = numero(item.salvamentos || item.saved);
  const cliques = numero(item.cliques || item.clicks);
  const interacoes = numero(item.interacoes)
    || curtidas + comentarios + compartilhamentos + salvamentos + cliques;
  const denominador = alcance ?? visualizacoes;
  return {
    alcance,
    visualizacoes,
    curtidas,
    comentarios,
    compartilhamentos,
    salvamentos,
    cliques,
    interacoes,
    metricas_medido: definido(denominador),
    taxa_engajamento: denominador > 0 ? interacoes / denominador : (definido(denominador) ? 0 : null),
  };
}

function enriquecerPublicacao(item = {}) {
  const metricas = metricasPublicacao(item);
  return {
    ...item,
    ...metricas,
    codigo: item.codigo || codigoDaLegenda(item.legenda || item.titulo),
    formato: String(item.formato || "feed").toLowerCase(),
  };
}

function ordenarPublicacoes(publicacoes = []) {
  return publicacoes.map(enriquecerPublicacao).sort((a, b) => {
    const scoreA = a.taxa_engajamento === null ? -1 : a.taxa_engajamento * 1_000_000 + a.interacoes * 100 + numero(a.visualizacoes);
    const scoreB = b.taxa_engajamento === null ? -1 : b.taxa_engajamento * 1_000_000 + b.interacoes * 100 + numero(b.visualizacoes);
    return scoreB - scoreA;
  });
}

function resumirFormatos(publicacoes = []) {
  const grupos = new Map();
  for (const item of publicacoes.map(enriquecerPublicacao)) {
    const formato = FORMATOS.includes(item.formato) ? item.formato : "feed";
    const atual = grupos.get(formato) || {
      formato, publicacoes: 0, medidos: 0, alcance: 0, alcance_medidos: 0,
      visualizacoes: 0, visualizacoes_medidas: 0, interacoes: 0,
    };
    atual.publicacoes += 1;
    if (definido(item.alcance)) { atual.alcance += item.alcance; atual.alcance_medidos += 1; }
    if (definido(item.visualizacoes)) { atual.visualizacoes += item.visualizacoes; atual.visualizacoes_medidas += 1; }
    if (item.metricas_medido) atual.medidos += 1;
    atual.interacoes += item.interacoes;
    grupos.set(formato, atual);
  }
  return [...grupos.values()].map((grupo) => {
    const denominador = grupo.alcance_medidos ? grupo.alcance : (grupo.visualizacoes_medidas ? grupo.visualizacoes : null);
    return {
      ...grupo,
      taxa_engajamento: denominador > 0 ? grupo.interacoes / denominador : (definido(denominador) ? 0 : null),
      alcance_medio: grupo.alcance_medidos ? grupo.alcance / grupo.alcance_medidos : null,
      visualizacoes_medias: grupo.visualizacoes_medidas ? grupo.visualizacoes / grupo.visualizacoes_medidas : null,
    };
  }).sort((a, b) => b.taxa_engajamento - a.taxa_engajamento);
}

function limitarVariacao(atual, alvo, limite = 0.2) {
  const base = numero(atual) || 1;
  const minimo = base * (1 - limite);
  const maximo = base * (1 + limite);
  return Math.min(maximo, Math.max(minimo, numero(alvo) || base));
}

function atualizarPesos(pesosAtuais = {}, publicacoes = [], limite = 0.2) {
  const resumo = resumirFormatos(publicacoes).filter((x) => x.medidos >= 10 && x.taxa_engajamento !== null);
  const media = resumo.length
    ? resumo.reduce((soma, item) => soma + item.taxa_engajamento, 0) / resumo.length
    : 0;
  const novos = { ...pesosAtuais };
  for (const item of resumo) {
    if (!Object.prototype.hasOwnProperty.call(novos, item.formato)) continue;
    const fator = media > 0 ? item.taxa_engajamento / media : 1;
    novos[item.formato] = Number(limitarVariacao(
      numero(novos[item.formato]) || 1,
      (numero(novos[item.formato]) || 1) * fator,
      limite,
    ).toFixed(3));
  }
  return novos;
}

function percentual(valor) {
  return valor === null || valor === undefined ? "não medido" : `${(numero(valor) * 100).toFixed(2).replace(".", ",")}%`;
}

function inteiro(valor) {
  return Math.round(numero(valor)).toLocaleString("pt-BR");
}

function medidaInteira(valor) {
  return valor === null || valor === undefined ? "não medido" : inteiro(valor);
}

function mediana(valores = []) {
  const nums = valores.filter(definido).map(Number).sort((a, b) => a - b);
  if (!nums.length) return null;
  const meio = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[meio] : (nums[meio - 1] + nums[meio]) / 2;
}

function linhaPublicacao(item) {
  const titulo = textoCurto(item.legenda || item.titulo || item.codigo || "Publicação");
  const link = /^https:\/\//.test(String(item.url || "")) ? `[${titulo}](${item.url})` : titulo;
  const exposicao = item.alcance ?? item.visualizacoes;
  return `| ${item.rede || "—"} | ${item.formato || "—"} | ${item.codigo || "—"} | ${link} | ${medidaInteira(exposicao)} | ${inteiro(item.interacoes)} | ${percentual(item.taxa_engajamento)} |`;
}

function gerarRecomendacoes(publicacoes = [], leads = {}) {
  const enriquecidas = publicacoes.map(enriquecerPublicacao);
  const formatos = resumirFormatos(enriquecidas);
  const recomendacoes = [];
  if (!enriquecidas.length) {
    recomendacoes.push("Corrigir a coleta de métricas antes de alterar a grade; nenhuma publicação mensurável foi retornada pelas APIs.");
  } else {
    const campeao = formatos.find((item) => item.medidos >= 10 && item.taxa_engajamento !== null);
    if (campeao) recomendacoes.push(`Testar até 20% mais conteúdo no formato **${campeao.formato}**, sustentado por ${campeao.medidos} posts medidos e taxa de ${percentual(campeao.taxa_engajamento)}.`);
    else recomendacoes.push("Não alterar pesos por formato nesta semana: nenhum formato alcançou 10 publicações com denominador mensurável.");
    const comCompartilhamento = [...enriquecidas].sort((a, b) => b.compartilhamentos - a.compartilhamentos)[0];
    if (comCompartilhamento?.compartilhamentos > 0) recomendacoes.push(`Reaproveitar o gancho de **${comCompartilhamento.codigo}** em uma variação nova: foi a peça mais compartilhada (${inteiro(comCompartilhamento.compartilhamentos)}).`);
    else recomendacoes.push("Testar ganchos locais e condições reais do imóvel nos primeiros 3 segundos para estimular compartilhamentos, sem inventar ofertas.");
  }
  if (numero(leads.total) === 0) recomendacoes.push("Manter CTA de palavra-chave + WhatsApp e revisar a página de captura: houve conteúdo publicado, mas nenhum lead novo atribuído na semana.");
  else recomendacoes.push(`Priorizar as origens que geraram os **${inteiro(leads.total)}** leads consentidos da semana e repetir somente os temas vencedores.`);
  if (recomendacoes.length < 3) recomendacoes.push("Alternar imóvel, bastidor, dica local e captação de proprietário; repetir o tema vencedor com capa e gancho novos, nunca o mesmo arquivo.");
  return recomendacoes.slice(0, 3);
}

function renderizarRelatorio({ data, inicio, fim, publicacoes = [], canais = {}, leads = {}, pesosAntes = {}, pesosDepois = {} }) {
  const ordenadas = ordenarPublicacoes(publicacoes);
  const top = ordenadas.slice(0, 5);
  const piores = [...ordenadas].reverse().slice(0, 5);
  const formatos = resumirFormatos(ordenadas);
  const recomendacoes = gerarRecomendacoes(ordenadas, leads);
  const linhas = [
    `# Desempenho multicanal — ${data}`,
    "",
    `Período: **${inicio} a ${fim}**. Métricas informadas pelas próprias plataformas; alcance e visualizações não são diretamente comparáveis entre redes.`,
    "",
    "## Situação dos canais",
    "",
    "| Canal | Situação | Posts | Públicos | Métricas medidas | Mediana views | Observação |",
    "|---|---|---:|---:|---:|---:|---|",
    ...Object.entries(canais).map(([canal, info]) => `| ${canal} | ${info.ok ? "✅ conectado" : "⚠️ parcial"} | ${inteiro(info.total)} | ${info.publicos === undefined ? "não medido" : inteiro(info.publicos)} | ${inteiro(info.medidos)} | ${medidaInteira(info.mediana_views)} | ${textoCurto(info.observacao, 320) || "—"} |`),
    "",
    `Publicações encontradas: **${ordenadas.length}** · Leads consentidos na semana: **${inteiro(leads.total)}** · Oportunidades aguardando validação no radar: **${inteiro(leads.radar)}**.`,
    "",
    "## Top 5 por taxa de engajamento",
    "",
    "| Rede | Formato | Imóvel | Publicação | Alcance/Views | Interações | Taxa |",
    "|---|---|---|---|---:|---:|---:|",
    ...(top.length ? top.map(linhaPublicacao) : ["| — | — | — | Sem dados | 0 | 0 | 0,00% |"]),
    "",
    "## 5 peças com menor resposta",
    "",
    "| Rede | Formato | Imóvel | Publicação | Alcance/Views | Interações | Taxa |",
    "|---|---|---|---|---:|---:|---:|",
    ...(piores.length ? piores.map(linhaPublicacao) : ["| — | — | — | Sem dados | 0 | 0 | 0,00% |"]),
    "",
    "## Formatos",
    "",
    "| Formato | Posts | Alcance médio | Views médias | Interações | Taxa | Peso anterior → novo |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...formatos.map((item) => `| ${item.formato} | ${item.publicacoes} (${item.medidos} medidos) | ${medidaInteira(item.alcance_medio)} | ${medidaInteira(item.visualizacoes_medias)} | ${inteiro(item.interacoes)} | ${percentual(item.taxa_engajamento)} | ${(pesosAntes[item.formato] ?? "—")} → ${(pesosDepois[item.formato] ?? "—")} |`),
    "",
    "## Recomendações automáticas da semana",
    "",
    ...recomendacoes.map((item, indice) => `${indice + 1}. ${item}`),
    "",
    "## Captação",
    "",
    leads.markdown || "Sem detalhamento de leads disponível nesta execução.",
    "",
    "Nenhum dado pessoal é gravado neste relatório.",
    "",
  ];
  return linhas.join("\n");
}

module.exports = {
  definido,
  mediana,
  atualizarPesos,
  codigoDaLegenda,
  enriquecerPublicacao,
  gerarRecomendacoes,
  limitarVariacao,
  metricasPublicacao,
  ordenarPublicacoes,
  renderizarRelatorio,
  resumirFormatos,
};
