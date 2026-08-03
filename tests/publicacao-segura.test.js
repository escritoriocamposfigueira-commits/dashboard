"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  avancarPonteiros,
  escolherProximo,
  publicadoRecentementeNoEstado,
} = require("../scripts/publicar-servidor");

const ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/imagens-urls.json"), "utf8"));

test("a fila de 76 vendas completa um ciclo sem repetir e volta ao início", () => {
  const estado = { indiceVenda: 0, indice: 0, publicados: [] };
  const codigos = [];
  for (let i = 0; i < 76; i += 1) {
    const plano = escolherProximo(manifest, estado, "venda");
    codigos.push(plano.codigo);
    avancarPonteiros(estado, plano, manifest);
  }
  assert.equal(codigos.length, 76);
  assert.equal(new Set(codigos).size, 76);
  assert.equal(escolherProximo(manifest, estado, "venda").codigo, codigos[0]);
});

test("condições comerciais entram primeiro na fila", () => {
  const estado = { indiceVenda: 0, publicados: [] };
  assert.equal(escolherProximo(manifest, estado, "venda").codigo, "516");
});

test("estado bloqueia uma republicação bem-sucedida nas últimas 30 horas", () => {
  const agora = new Date("2026-08-03T15:00:00.000Z");
  const estado = {
    publicados: [{ codigo: "547", data: "2026-08-03T10:00:00.000Z", fb_feed: "✅ post" }],
  };
  assert.equal(publicadoRecentementeNoEstado(estado, "547", agora), true);
  assert.equal(publicadoRecentementeNoEstado(estado, "547", new Date("2026-08-04T17:00:00.000Z")), false);
});

test("registro que só contém falha não bloqueia uma tentativa válida", () => {
  const agora = new Date("2026-08-03T15:00:00.000Z");
  const estado = {
    publicados: [{ codigo: "547", data: "2026-08-03T10:00:00.000Z", fb_feed: "❌ falhou" }],
  };
  assert.equal(publicadoRecentementeNoEstado(estado, "547", agora), false);
});
