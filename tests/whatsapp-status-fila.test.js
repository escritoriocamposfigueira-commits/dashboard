"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { confirmedVideoPublications } = require("../scripts/whatsapp-status-web");

test("Status aceita vídeo de uma rede mesmo que outra esteja pendente", () => {
  const data = "2026-11-18T01:31:44.048Z";
  const reg = { codigo: "554", data, fb_story: "✅ 123", ig_story: "❌ indisponível" };
  const snapshot = { publicados: [], retryPublicacao: { reg }, retryLocacao: { reg } };
  assert.deepEqual([...confirmedVideoPublications(snapshot).keys()], [data + "|554"]);
  snapshot.publicados.push(reg);
  assert.equal(confirmedVideoPublications(snapshot).size, 1);
});

test("Status ignora fotos, falhas e aceita um Reel confirmado", () => {
  const data = "2026-11-18T01:31:44.048Z";
  const publicados = [
    { codigo: "1", data, fb_feed: "✅ foto" },
    { codigo: "2", data, ig_story: "✅ 123 (imagem)" },
    { codigo: "3", data, fb_story: "❌ falhou" },
    { codigo: "4", data, ig_reel: "✅ 456" },
  ];
  assert.deepEqual([...confirmedVideoPublications({ publicados }).keys()], [data + "|4"]);
});
