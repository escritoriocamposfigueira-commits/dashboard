"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { MANIFESTO, PLANOS, SAIDA } = require("../scripts/gerar-amostras-tour-vertical");

test("etapa 2 define duas versões para cada imóvel-piloto", () => {
  assert.deepEqual(Object.keys(PLANOS).sort(), ["CF-493", "CF-609", "CF-620"]);
  for (const [codigo, plano] of Object.entries(PLANOS)) {
    assert.deepEqual(Object.keys(plano.versoes).sort(), ["A", "B"], codigo);
    assert.notEqual(plano.versoes.A.fotos[0], plano.versoes.B.fotos[0], `${codigo}: A/B precisam abrir com fotos diferentes`);
    for (const [versao, roteiro] of Object.entries(plano.versoes)) {
      assert.ok(new Set(roteiro.fotos).size >= 5, `${codigo}-${versao}: mínimo de cinco fotos`);
      assert.equal(roteiro.fotos.length, roteiro.rotulos.length, `${codigo}-${versao}: foto sem rótulo`);
      assert.ok(roteiro.gancho.includes("\n"), `${codigo}-${versao}: gancho deve ter quebra editorial`);
    }
  }
});

test("manifesto contém seis vídeos reais, verticais e sem publicação automática", () => {
  const manifesto = JSON.parse(fs.readFileSync(MANIFESTO, "utf8"));
  assert.equal(manifesto.total, 6);
  assert.equal(manifesto.politica.somente_fotos_reais, true);
  assert.equal(manifesto.politica.video_generativo, false);
  assert.equal(manifesto.politica.publicacao_automatica, false);
  for (const item of manifesto.itens) {
    assert.equal(item.imagem_gerada_por_ia, false, `${item.codigo}-${item.versao}`);
    assert.equal(item.resolucao, "1080x1920");
    assert.equal(item.fps, 30);
    assert.ok(item.fotos_usadas.length >= 5);
    assert.ok(item.arte_inicio_segundos >= 20);
    assert.match(item.origem, /^https:\/\/www\.escritoriocamposfigueira\.com\.br\/imovel\//);
    assert.ok(fs.existsSync(path.join(path.dirname(SAIDA), "..", item.video)));
  }
});

test("validação técnica não registra erros", () => {
  const validacao = JSON.parse(fs.readFileSync(path.join(SAIDA, "validacao.json"), "utf8"));
  assert.equal(validacao.resultados.length, 6);
  for (const item of validacao.resultados) {
    assert.equal(item.valido, true, `${item.codigo}-${item.versao}: ${item.erros.join(", ")}`);
    assert.deepEqual(item.erros, []);
    assert.ok(item.duracao >= 20 && item.duracao <= 30);
    assert.equal(item.resolucao, "1080x1920");
    assert.ok(item.fotos_unicas >= 5);
  }
});
