"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { filtrarCodigosAtivos } = require("./imoveis-inativos");

const ROOT = path.resolve(__dirname, "..");
const MANIFESTO = path.join(ROOT, "src/content/imagens-urls.json");
const CAPTIONS = path.join(ROOT, "src/content/captions-imoveis.json");
const FOTOS = path.join(ROOT, "src/content/fotos-imoveis.json");
const PRIORIDADES = path.join(ROOT, "src/content/prioridade-vendas.json");
const RELATORIO = path.join(ROOT, "docs/RELATORIO-AUDITORIA-FILA-2026-08-03.md");
const JSON_SAIDA = path.join(ROOT, "docs/RELATORIO-AUDITORIA-FILA-2026-08-03.json");
const MANIFESTO_VIDEOS = "D:\\01 - ESCRITÓRIO IMOBILIÁRIO\\04- REDE SOCIAL\\IMAGENS ANUNCIOS\\VÍDEOS ANIMADOS 9.16\\manifesto-videos.json";

const LOCACOES = new Set([
  "584", "607", "609", "609B", "619", "620",
  "CASA INDAIA BERTIOGA", "CASA JARDIM ARMENIA",
]);

function lerJson(arquivo) {
  return JSON.parse(fs.readFileSync(arquivo, "utf8"));
}

function normalizarCodigo(codigo) {
  return String(codigo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/^CF\s*-?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extrairCondicoes(caption) {
  return String(caption || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => /entrada|parcel|financi|aceita (carro|veículo|terreno|apartamento|casa)|permuta|parte do pagamento|negociação direta|sem burocracia|sem juros|aceita proposta|estuda proposta|venda ou troca/i.test(linha));
}

function pontuar(caption) {
  const texto = String(caption || "").toLowerCase();
  let pontos = 0;
  if (/entrada de r\$\s*(25|50)\.?000/.test(texto)) pontos += 35;
  else if (/entrada de r\$\s*100\.?000/.test(texto)) pontos += 30;
  else if (/entrada (facilitada|reduzida)|aceita entrada/.test(texto)) pontos += 24;
  else if (/\bentrada\b/.test(texto)) pontos += 12;
  if (/parcel/.test(texto)) pontos += 25;
  if (/aceita (carro|veículo)|aceita carro|aceita ve[ií]culo/.test(texto)) pontos += 22;
  if (/direto com (o escritório|a imobiliária)|negociação direta/.test(texto)) pontos += 10;
  if (/sem juros|sem burocracia/.test(texto)) pontos += 8;
  if (/permuta|parte do pagamento|venda ou troca/.test(texto)) pontos += 10;
  if (/financiamento bancário/.test(texto)) pontos += 5;
  if (/aceita proposta|estuda proposta/.test(texto)) pontos += 3;
  return pontos;
}

function faixa(pontos) {
  if (pontos >= 50) return "A — maior potencial comercial";
  if (pontos >= 25) return "B — negociação facilitada";
  if (pontos >= 8) return "C — aceita troca/permuta";
  return "D — condição convencional";
}

function duplicados(objeto) {
  const porValor = new Map();
  for (const [codigo, valor] of Object.entries(objeto || {})) {
    const chave = JSON.stringify(valor);
    if (!porValor.has(chave)) porValor.set(chave, []);
    porValor.get(chave).push(codigo);
  }
  return [...porValor.values()].filter((codigos) => codigos.length > 1);
}

function main() {
  const manifest = lerJson(MANIFESTO);
  const captions = lerJson(CAPTIONS);
  const fotos = lerJson(FOTOS);
  const prioridades = lerJson(PRIORIDADES).map(String);
  const ordem = filtrarCodigosAtivos(manifest.ordem).map(String);
  const captionPorCodigo = Object.fromEntries(captions.map((item) => [String(item.codigo_imovel), item.caption]));
  const vendasBase = ordem.filter((codigo) => !LOCACOES.has(codigo));
  const vendasSet = new Set(vendasBase);
  const prioridadeAtiva = prioridades.filter((codigo) => vendasSet.has(codigo));
  const prioridadeSet = new Set(prioridadeAtiva);
  const vendas = [...prioridadeAtiva, ...vendasBase.filter((codigo) => !prioridadeSet.has(codigo))];
  const locacoes = ordem.filter((codigo) => LOCACOES.has(codigo));

  let videos = [];
  if (fs.existsSync(MANIFESTO_VIDEOS)) videos = lerJson(MANIFESTO_VIDEOS).itens || [];
  const videoPorCodigo = new Map(videos.map((item) => [normalizarCodigo(item.codigo_arte), item]));

  const itens = [...vendas.map((codigo) => ({ codigo, tipo: "venda" })), ...locacoes.map((codigo) => ({ codigo, tipo: "locação" }))]
    .map((item, indice) => {
      const caption = captionPorCodigo[item.codigo] || "";
      const condicoes = extrairCondicoes(caption);
      const pontos = item.tipo === "venda" ? pontuar(caption) : 0;
      const video = videoPorCodigo.get(normalizarCodigo(item.codigo));
      return {
        sequencia: indice + 1,
        ...item,
        pontos,
        faixa: item.tipo === "locação" ? "Locação semanal" : faixa(pontos),
        condicoes,
        fotos_especificas: Array.isArray(fotos[item.codigo]) ? fotos[item.codigo].length : 0,
        url_feed: manifest.urls_feed?.[item.codigo] || null,
        url_story: manifest.urls?.[item.codigo] || null,
        video_modelo: video?.modelo_id || null,
        video_trilha: video?.trilha_id || null,
      };
    });

  const erros = [];
  if (!ordem.length) erros.push("Fila ativa está vazia.");
  for (const item of itens) {
    if (!captionPorCodigo[item.codigo]) erros.push(`CF-${item.codigo}: legenda ausente.`);
    if (!item.url_feed) erros.push(`CF-${item.codigo}: arte feed ausente.`);
    if (!item.url_story) erros.push(`CF-${item.codigo}: arte story ausente.`);
    if (!item.fotos_especificas) erros.push(`CF-${item.codigo}: fotos específicas ausentes.`);
    if (!item.video_modelo) erros.push(`CF-${item.codigo}: vídeo local ausente do manifesto.`);
  }

  const duplicadasFeed = duplicados(Object.fromEntries(ordem.map((codigo) => [codigo, manifest.urls_feed?.[codigo]])));
  const duplicadasStory = duplicados(Object.fromEntries(ordem.map((codigo) => [codigo, manifest.urls?.[codigo]])));
  const arraysFotosDuplicados = duplicados(Object.fromEntries(ordem.map((codigo) => [codigo, fotos[codigo] || []])));
  if (duplicadasFeed.length) erros.push(`URLs de feed repetidas: ${JSON.stringify(duplicadasFeed)}.`);
  if (duplicadasStory.length) erros.push(`URLs de story repetidas: ${JSON.stringify(duplicadasStory)}.`);
  if (arraysFotosDuplicados.length) erros.push(`Conjuntos completos de fotos repetidos: ${JSON.stringify(arraysFotosDuplicados)}.`);

  const resultado = {
    gerado_em: new Date().toISOString(),
    fila_ativa: ordem.length,
    vendas: vendas.length,
    locacoes: locacoes.length,
    videos: itens.filter((item) => item.video_modelo).length,
    videos_biblioteca_total: videos.length,
    erros,
    hash_ordem: crypto.createHash("sha256").update(JSON.stringify(itens.map((item) => item.codigo))).digest("hex"),
    itens,
  };

  const linhas = [
    "# Auditoria da fila de publicação — 03/08/2026",
    "",
    `- Fila ativa: **${resultado.fila_ativa} imóveis** (${resultado.vendas} vendas e ${resultado.locacoes} locações).`,
    `- Vídeos vinculados: **${resultado.videos}**.`,
    `- Validação estrutural: **${erros.length ? `${erros.length} problema(s)` : "aprovada sem erros"}**.`,
    "- Critério comercial: pontuação baseada somente nas condições anunciadas (entrada, parcelas, veículo, negociação direta, permuta e financiamento); não é previsão estatística de venda.",
    "",
    "## Sequência efetiva",
    "",
    "| # | Código | Tipo | Potencial | Pontos | Fotos | Vídeo | Condições anunciadas |",
    "|---:|---|---|---|---:|---:|---|---|",
    ...itens.map((item) => `| ${item.sequencia} | CF-${item.codigo} | ${item.tipo} | ${item.faixa} | ${item.pontos} | ${item.fotos_especificas} | ${item.video_modelo || "—"} / ${item.video_trilha || "—"} | ${(item.condicoes.join("; ") || "Condição convencional").replace(/\|/g, "/")} |`),
    "",
    "## Falhas encontradas pela validação",
    "",
    ...(erros.length ? erros.map((erro) => `- ${erro}`) : ["- Nenhuma."]),
    "",
  ];

  fs.mkdirSync(path.dirname(RELATORIO), { recursive: true });
  fs.writeFileSync(RELATORIO, linhas.join("\n"), "utf8");
  fs.writeFileSync(JSON_SAIDA, `${JSON.stringify(resultado, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ fila: ordem.length, vendas: vendas.length, locacoes: locacoes.length, videos: resultado.videos, erros: erros.length }));
  if (erros.length) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { extrairCondicoes, faixa, normalizarCodigo, pontuar };
