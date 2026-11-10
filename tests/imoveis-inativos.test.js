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
  assert.equal(normalizarCodigo("CF-001"), "CF-001");
  assert.equal(normalizarCodigo("CF - 001"), "CF-001");
  assert.equal(normalizarCodigo("001"), "CF-001");
});

test("bloqueia todos os imóveis retirados de circulação", () => {
  const inativos = carregarCodigosInativos();
  assert.equal(codigoInativo("CF-001", inativos), true);
  assert.equal(codigoInativo("413", inativos), true);
  for (const codigo of ["417", "458", "527", "537", "550", "610", "616", "619"]) {
    assert.equal(codigoInativo(`CF-${codigo}`, inativos), true);
  }
  assert.equal(codigoInativo("CF-FD1FEFC4", inativos), true);
});

test("remove imóveis inativos de qualquer fila", () => {
  const inativos = carregarCodigosInativos();
  assert.deepEqual(
    filtrarCodigosAtivos(["001", "413", "417", "458", "527", "537", "550", "610", "547"], inativos),
    ["547"],
  );
});

test("a rotação do robô nunca escolhe um imóvel inativo", () => {
  const plano = escolherProximo(
    { ordem: ["001", "413", "417", "458", "527", "537", "550", "610", "547"] },
    { indiceVenda: 0, publicados: [] },
    "venda",
  );
  assert.equal(plano.codigo, "547");
});
