import test from "node:test";
import assert from "node:assert/strict";
import modulo from "../meta-respostas.js";

const { planoRespostaPrivada, planoRespostaPublica } = modulo;

test("Facebook usa uma única resposta privada ligada ao comentário", () => {
  assert.deepEqual(
    planoRespostaPrivada({ rede: "facebook", eventId: "comentario-1", texto: "Olá" }),
    { endpoint: "comentario-1/private_replies", body: { message: "Olá" } },
  );
});

test("Instagram envia Direct a partir do comentário", () => {
  assert.deepEqual(
    planoRespostaPrivada({ rede: "instagram", eventId: "comentario-2", igId: "ig-1", texto: "Olá" }),
    {
      endpoint: "ig-1/messages",
      body: { recipient: { comment_id: "comentario-2" }, message: { text: "Olá" } },
    },
  );
});

test("fallback público respeita o endpoint de cada rede", () => {
  assert.equal(
    planoRespostaPublica({ rede: "facebook", eventId: "fb-1", texto: "Oi" }).endpoint,
    "fb-1/comments",
  );
  assert.equal(
    planoRespostaPublica({ rede: "instagram", eventId: "ig-2", texto: "Oi" }).endpoint,
    "ig-2/replies",
  );
});

test("plano recusa entrada incompleta", () => {
  assert.throws(
    () => planoRespostaPrivada({ rede: "instagram", eventId: "c-1", texto: "Oi" }),
    /Instagram obrigatório/,
  );
  assert.throws(
    () => planoRespostaPublica({ rede: "outra", eventId: "c-1", texto: "Oi" }),
    /Rede Meta inválida/,
  );
});
