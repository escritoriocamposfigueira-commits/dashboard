"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  carregarCodigosInativos,
  codigoInativo,
  filtrarCodigosAtivos,
  normalizarCodigo,
} = require("../scripts/imoveis-inativos");
const { escolherProximo } = require("../scripts/publicar-servidor");

test("normaliza variações do código CF-001", () => {
  assert.equal(normalizarCodigo("CF-001"), "1");
  assert.equal(normalizarCodigo("CF - 001"), "1");
  assert.equal(normalizarCodigo("001"), "1");
});

test("bloqueia CF-001 e CF-413", () => {
  const inativos = carregarCodigosInativos();
  assert.equal(codigoInativo("CF-001", inativos), true);
  assert.equal(codigoInativo("413", inativos), true);
  assert.equal(codigoInativo("537", inativos), false);
});

test("remove imóveis inativos de qualquer fila", () => {
  const inativos = carregarCodigosInativos();
  assert.deepEqual(
    filtrarCodigosAtivos(["001", "413", "527", "537"], inativos),
    ["527", "537"],
  );
});

test("a rotação do robô nunca escolhe um imóvel inativo", () => {
  const plano = escolherProximo(
    { ordem: ["001", "413", "527"] },
    { indiceVenda: 0, publicados: [] },
    "venda",
  );
  assert.equal(plano.codigo, "527");
});
