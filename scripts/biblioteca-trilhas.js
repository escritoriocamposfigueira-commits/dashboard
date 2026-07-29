"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const TRILHAS_DIR = path.join(RAIZ, "TRILHAS");
const CATALOGO_PATH = path.join(TRILHAS_DIR, "catalogo.json");
const HISTORICO_PATH = path.join(RAIZ, "controle", "estado-trilhas.json");
const LIMITE_HISTORICO = 240;

function lerJson(arquivo, fallback) {
  if (!fs.existsSync(arquivo)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(arquivo, "utf-8"));
  } catch {
    return fallback;
  }
}

function hashNumero(texto) {
  return Number.parseInt(
    crypto.createHash("sha256").update(String(texto)).digest("hex").slice(0, 12),
    16,
  );
}

function carregarCatalogo(catalogoPath = CATALOGO_PATH) {
  const catalogo = lerJson(catalogoPath, { trilhas: [] });
  const baseDir = path.dirname(catalogoPath);
  const trilhas = (catalogo.trilhas || [])
    .map((trilha) => ({
      ...trilha,
      caminho: path.join(baseDir, trilha.arquivo || trilha.nome || ""),
    }))
    .filter((trilha) => trilha.id && fs.existsSync(trilha.caminho));

  if (trilhas.length === 0) {
    throw new Error("Catálogo musical vazio ou sem arquivos válidos.");
  }
  return { ...catalogo, trilhas };
}

function carregarHistorico(historicoPath = HISTORICO_PATH) {
  const historico = lerJson(historicoPath, { versao: 1, usos: [] });
  return {
    versao: 1,
    usos: Array.isArray(historico.usos) ? historico.usos : [],
  };
}

function selecionarTrilha({
  emocao = "sonho",
  codigo = "sem-codigo",
  chavePublicacao,
  catalogoPath = CATALOGO_PATH,
  historicoPath = HISTORICO_PATH,
}) {
  const catalogo = carregarCatalogo(catalogoPath);
  const historico = carregarHistorico(historicoPath);
  const chave = chavePublicacao || `${codigo}|${new Date().toISOString().slice(0, 10)}`;

  const usoDaMesmaPublicacao = [...historico.usos]
    .reverse()
    .find((uso) => uso.chave_publicacao === chave);
  if (usoDaMesmaPublicacao) {
    const repetida = catalogo.trilhas.find((trilha) => trilha.id === usoDaMesmaPublicacao.trilha_id);
    if (repetida) return { ...repetida, chavePublicacao: chave, reutilizada: true };
  }

  const estatisticas = new Map();
  historico.usos.forEach((uso, indice) => {
    const atual = estatisticas.get(uso.trilha_id) || { quantidade: 0, ultimoIndice: -1 };
    atual.quantidade += 1;
    atual.ultimoIndice = indice;
    estatisticas.set(uso.trilha_id, atual);
  });

  const ordenadas = [...catalogo.trilhas].sort((a, b) => {
    const ea = estatisticas.get(a.id) || { quantidade: 0, ultimoIndice: -1 };
    const eb = estatisticas.get(b.id) || { quantidade: 0, ultimoIndice: -1 };
    if (ea.quantidade !== eb.quantidade) return ea.quantidade - eb.quantidade;

    const aCombina = (a.emocoes || []).includes(emocao) ? 1 : 0;
    const bCombina = (b.emocoes || []).includes(emocao) ? 1 : 0;
    if (aCombina !== bCombina) return bCombina - aCombina;
    if (ea.ultimoIndice !== eb.ultimoIndice) return ea.ultimoIndice - eb.ultimoIndice;

    return hashNumero(`${chave}|${a.id}`) - hashNumero(`${chave}|${b.id}`);
  });

  return { ...ordenadas[0], chavePublicacao: chave, reutilizada: false };
}

function registrarUsoTrilha(
  trilha,
  { codigo = "sem-codigo", emocao = "sonho", historicoPath = HISTORICO_PATH } = {},
) {
  if (!trilha?.id || !trilha?.chavePublicacao) return;
  const historico = carregarHistorico(historicoPath);
  if (historico.usos.some((uso) => uso.chave_publicacao === trilha.chavePublicacao)) return;

  historico.usos.push({
    trilha_id: trilha.id,
    codigo,
    emocao,
    chave_publicacao: trilha.chavePublicacao,
    usado_em: new Date().toISOString(),
  });
  historico.usos = historico.usos.slice(-LIMITE_HISTORICO);
  fs.mkdirSync(path.dirname(historicoPath), { recursive: true });
  fs.writeFileSync(historicoPath, `${JSON.stringify(historico, null, 2)}\n`, "utf-8");
}

module.exports = {
  CATALOGO_PATH,
  HISTORICO_PATH,
  carregarCatalogo,
  carregarHistorico,
  hashNumero,
  registrarUsoTrilha,
  selecionarTrilha,
};
