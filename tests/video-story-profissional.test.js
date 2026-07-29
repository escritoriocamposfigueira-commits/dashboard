"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const {
  MODELOS,
  ROTEIROS,
  construirFiltroVideo,
  registrarUsoModelo,
  selecionarModeloStory,
} = require("../scripts/video-story-profissional");

test("todos os modelos preservam 1080x1920 e terminam com o rodapé", () => {
  MODELOS.forEach((modelo) => {
    const filtro = construirFiltroVideo(modelo.id);
    assert.match(filtro, /scale=1080:1920/);
    assert.match(filtro, /crop=1080:90:0:1830/);
    assert.match(filtro, /format=yuv420p\[v\]$/);
    assert.equal(ROTEIROS[modelo.id].ordem.at(-1), "rodape");
  });
});

test("iluminação usa dourado compatível com a marca", () => {
  const filtro = construirFiltroVideo("iluminacao-dourada");
  assert.match(filtro, /0xD9AA4A@0\.16/);
});

test("rotação não repete o modelo imediatamente e reutiliza a mesma publicação", () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "cf-modelos-"));
  const historicoPath = path.join(pasta, "estado.json");
  const primeiro = selecionarModeloStory({
    codigo: "CF-582",
    chavePublicacao: "2026-07-29|venda|CF-582",
    historicoPath,
  });
  registrarUsoModelo(primeiro, { codigo: "CF-582", historicoPath });

  const repetido = selecionarModeloStory({
    codigo: "CF-582",
    chavePublicacao: "2026-07-29|venda|CF-582",
    historicoPath,
  });
  assert.equal(repetido.id, primeiro.id);
  assert.equal(repetido.reutilizado, true);

  const segundo = selecionarModeloStory({
    codigo: "CF-584",
    chavePublicacao: "2026-07-30|venda|CF-584",
    historicoPath,
  });
  assert.notEqual(segundo.id, primeiro.id);
});
