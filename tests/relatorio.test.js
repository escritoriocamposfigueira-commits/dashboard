"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  atualizarPesos,
  codigoDaLegenda,
  limitarVariacao,
  metricasPublicacao,
  renderizarRelatorio,
  resumirFormatos,
} = require("../src/relatorio/core");

test("extrai código da legenda sem inventar", () => {
  assert.equal(codigoDaLegenda("Veja o imóvel CF-598 em Mogi"), "CF-598");
  assert.equal(codigoDaLegenda("sem referência"), "—");
});

test("calcula engajamento usando alcance", () => {
  const r = metricasPublicacao({ alcance: 1000, curtidas: 20, comentarios: 5, compartilhamentos: 5 });
  assert.equal(r.interacoes, 30);
  assert.equal(r.taxa_engajamento, 0.03);
});

test("peso semanal nunca varia mais de vinte por cento", () => {
  assert.equal(limitarVariacao(1, 10, 0.2), 1.2);
  assert.equal(limitarVariacao(1, 0.1, 0.2), 0.8);
  const pesos = atualizarPesos({ feed: 1, reel: 1 }, [
    { formato: "feed", alcance: 1000, curtidas: 1 },
    { formato: "reel", alcance: 1000, curtidas: 100 },
  ]);
  assert.ok(pesos.feed >= 0.8 && pesos.feed <= 1.2);
  assert.ok(pesos.reel >= 0.8 && pesos.reel <= 1.2);
});

test("resume formatos sem somar alcance entre redes como total global", () => {
  const resumo = resumirFormatos([
    { formato: "reel", alcance: 100, curtidas: 10 },
    { formato: "reel", alcance: 200, curtidas: 10 },
  ])[0];
  assert.equal(resumo.publicacoes, 2);
  assert.equal(resumo.alcance_medio, 150);
});

test("relatório não grava dados pessoais", () => {
  const texto = renderizarRelatorio({
    data: "2026-11-16", inicio: "2026-11-09", fim: "2026-11-16",
    publicacoes: [{ rede: "Instagram", formato: "reel", legenda: "CF-598", alcance: 100, curtidas: 5 }],
    canais: { Instagram: { ok: true, total: 1 } },
    leads: { total: 2, radar: 10, markdown: "Total agregado: 2" },
    pesosAntes: { reel: 1 }, pesosDepois: { reel: 1.2 },
  });
  assert.match(texto, /Top 5/);
  assert.match(texto, /Nenhum dado pessoal/);
  assert.doesNotMatch(texto, /telefone_e164|email_normalizado/);
});
