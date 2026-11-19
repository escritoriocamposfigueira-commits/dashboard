"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { confirmedVideoPublications, processStatusQueue } = require("../scripts/whatsapp-status-web");

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

test("fila publica todos os Status primeiro e uma cópia falha não interrompe as demais", async () => {
  const pending = [{ key: "anterior", code: "584" }, { key: "novo", code: "554" }, { key: "outro", code: "521" }];
  const state = { posted: { anterior: { message_id: "já publicado", contacts: { Renan: { sent_at: "ontem" } } } } };
  const sent = [], warns = [];
  await processStatusQueue({
    pending, state, contacts: ["Henrique", "Renan"],
    publish: async (item) => { sent.push("status-" + item.code); return "status-" + item.code; },
    copy: async (item, name) => {
      sent.push(`cópia-${item.code}-${name}`);
      if (name === "Henrique") throw new Error("busca indisponível");
    },
    save: () => {},
    warn: (message) => warns.push(message),
  });
  assert.deepEqual(sent, ["status-554", "status-521", "cópia-584-Henrique", "cópia-554-Renan", "cópia-521-Renan"]);
  assert.equal(state.posted.novo.message_id, "status-554");
  assert.equal(state.posted.novo.contacts.Henrique, undefined);
  assert.equal(warns.length, 1);
});
