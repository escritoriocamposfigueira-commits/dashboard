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

function normalizarCodigo(codigo) {
  return String(codigo ?? "")
    .trim()
    .toUpperCase()
    .replace(/^CF\s*-\s*/, "")
    .replace(/^0+(?=\d)/, "");
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
  ARQUIVO_INATIVOS,
  carregarCodigosInativos,
  carregarImoveisInativos,
  codigoInativo,
  filtrarCodigosAtivos,
  normalizarCodigo,
};
