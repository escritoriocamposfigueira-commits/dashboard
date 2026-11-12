"use strict";

const fs = require("fs");
const path = require("path");

const ARQUIVO_INATIVOS = path.join(
  __dirname,
  "..",
  "src",
  "content",
  "imoveis-inativos.json",
);
const ARQUIVO_ALIASES = path.join(
  __dirname,
  "..",
  "src",
  "content",
  "aliases-imoveis.json",
);
function semAcentos(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function chaveAlias(valor) {
  return semAcentos(valor).trim().toUpperCase().replace(/\s+/g, " ");
}

function normalizarCodigoOficial(codigo) {
  const valor = semAcentos(codigo)
    .trim()
    .toUpperCase()
    .replace(/^CF\s*-?\s*/, "")
    .replace(/-(VENDA|LOCACAO)$/i, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
  return valor ? `CF-${valor}` : "";
}

function carregarAliases(arquivo = ARQUIVO_ALIASES) {
  if (!fs.existsSync(arquivo)) return {};
  const aliases = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  return Object.fromEntries(
    Object.entries(aliases).map(([alias, codigo]) => [chaveAlias(alias), normalizarCodigoOficial(codigo)]),
  );
}

function normalizarCodigo(codigo, aliases = carregarAliases()) {
  const baseSemFinalidade = String(codigo ?? "").trim().replace(/-(VENDA|LOCACAO)$/i, "");
  return aliases[chaveAlias(baseSemFinalidade)] || normalizarCodigoOficial(baseSemFinalidade);
}

function carregarImoveisInativos(arquivo = ARQUIVO_INATIVOS) {
  if (!fs.existsSync(arquivo)) return [];
  const itens = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  if (!Array.isArray(itens)) {
    throw new Error("imoveis-inativos.json deve conter uma lista.");
  }
  return itens.map((item) => ({
    ...item,
    codigo_normalizado: normalizarCodigo(item.codigo),
  }));
}

function carregarCodigosInativos(arquivo = ARQUIVO_INATIVOS) {
  return new Set(
    carregarImoveisInativos(arquivo).map((item) => item.codigo_normalizado),
  );
}

function codigoInativo(codigo, codigosInativos = carregarCodigosInativos()) {
  return codigosInativos.has(normalizarCodigo(codigo));
}

function filtrarCodigosAtivos(codigos, codigosInativos = carregarCodigosInativos()) {
  return (codigos || []).filter((codigo) => !codigoInativo(codigo, codigosInativos));
}

module.exports = {
  ARQUIVO_ALIASES,
  ARQUIVO_INATIVOS,
  carregarAliases,
  carregarCodigosInativos,
  carregarImoveisInativos,
  codigoInativo,
  filtrarCodigosAtivos,
  normalizarCodigo,
};
