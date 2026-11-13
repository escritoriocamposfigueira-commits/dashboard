import test from "node:test";
import assert from "node:assert/strict";
import modulo from "../integracao-publicador.js";

const { enriquecerLegendaCaptador } = modulo;

test("integração desligada preserva a legenda", () => {
  assert.equal(enriquecerLegendaCaptador("Legenda", { enabled: false }), "Legenda");
});

test("venda recebe link rastreável e palavra IMOVEL", () => {
  const texto = enriquecerLegendaCaptador("Casa", {
    enabled: true, manychatActive: true, baseUrl: "https://exemplo.com/captador", codigo: "516", tipo: "venda",
  });
  assert.match(texto, /Comente "IMOVEL"/);
  assert.match(texto, /codigo_imovel=CF-516/);
  assert.match(texto, /utm_campaign=venda-cf-516/);
});

test("locação usa página e palavra corretas", () => {
  const texto = enriquecerLegendaCaptador("Locação", {
    enabled: "true", manychatActive: "true", baseUrl: "https://exemplo.com/captador", codigo: "620", tipo: "locacao",
  });
  assert.match(texto, /Comente "ALUGAR"/);
  assert.match(texto, /alugar-sem-fiador\.html/);
});

test("não ativa URL insegura", () => {
  assert.throws(() => enriquecerLegendaCaptador("x", { enabled: true, baseUrl: "http://exemplo.com" }), /HTTPS/);
});
