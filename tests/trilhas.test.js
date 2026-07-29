"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  CATALOGO_PATH,
  carregarCatalogo,
  registrarUsoTrilha,
  selecionarTrilha,
} = require("../scripts/biblioteca-trilhas");

test("catálogo ativo contém 56 MP3 licenciados, aprovados e íntegros", () => {
  const catalogo = carregarCatalogo();
  assert.equal(catalogo.trilhas.length, 56);
  assert.equal(catalogo.quantidade, 56);
  assert.equal(new Set(catalogo.trilhas.map((trilha) => trilha.id)).size, 56);

  for (const trilha of catalogo.trilhas) {
    assert.equal(trilha.instrumental, true);
    assert.equal(trilha.aprovada_pelo_usuario, true);
    assert.equal(trilha.avaliacao_sem_voz_gemido, true);
    assert.equal(trilha.origem, "mixkit-stock-music-free-license");
    assert.equal(trilha.licenca, "Mixkit Stock Music Free License");
    assert.match(trilha.licenca_url, /^https:\/\/mixkit\.co\//);
    assert.ok(Array.isArray(trilha.emocoes) && trilha.emocoes.length >= 2);
    assert.match(trilha.arquivo, /\.mp3$/);
    const hash = crypto.createHash("sha256").update(fs.readFileSync(trilha.caminho)).digest("hex");
    assert.equal(hash, trilha.sha256);
  }
});

test("rotação usa as 56 faixas antes da primeira repetição", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "teste-trilhas-"));
  const historicoPath = path.join(tmp, "estado-trilhas.json");
  fs.writeFileSync(historicoPath, '{"versao":1,"usos":[]}\n', "utf-8");

  try {
    const escolhidas = [];
    for (let i = 0; i < 56; i += 1) {
      const trilha = selecionarTrilha({
        emocao: ["sonho", "familiar", "conquista", "confianca", "urgencia"][i % 5],
        codigo: `CF-TESTE-${i}`,
        chavePublicacao: `2026-08-${String((i % 28) + 1).padStart(2, "0")}|teste|${i}`,
        catalogoPath: CATALOGO_PATH,
        historicoPath,
      });
      escolhidas.push(trilha.id);
      registrarUsoTrilha(trilha, {
        codigo: `CF-TESTE-${i}`,
        emocao: "teste",
        historicoPath,
      });
    }
    assert.equal(new Set(escolhidas).size, 56);

    const proxima = selecionarTrilha({
      emocao: "sonho",
      codigo: "CF-TESTE-57",
      chavePublicacao: "2026-09-01|teste|57",
      catalogoPath: CATALOGO_PATH,
      historicoPath,
    });
    assert.notEqual(proxima.id, escolhidas.at(-1));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("uma repetição da mesma execução reaproveita a mesma faixa", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "teste-trilha-idempotente-"));
  const historicoPath = path.join(tmp, "estado-trilhas.json");
  fs.writeFileSync(historicoPath, '{"versao":1,"usos":[]}\n', "utf-8");

  try {
    const parametros = {
      emocao: "confianca",
      codigo: "CF-999",
      chavePublicacao: "2026-09-01|venda|CF-999",
      catalogoPath: CATALOGO_PATH,
      historicoPath,
    };
    const primeira = selecionarTrilha(parametros);
    registrarUsoTrilha(primeira, { codigo: "CF-999", emocao: "confianca", historicoPath });
    const repeticao = selecionarTrilha(parametros);
    assert.equal(repeticao.id, primeira.id);
    assert.equal(repeticao.reutilizada, true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
