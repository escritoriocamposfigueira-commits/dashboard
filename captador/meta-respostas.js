"use strict";

function validarEntrada({ rede, eventId, texto }) {
  if (!['facebook', 'instagram'].includes(rede)) throw new Error('Rede Meta inválida.');
  if (!String(eventId || '').trim()) throw new Error('ID do comentário obrigatório.');
  if (!String(texto || '').trim()) throw new Error('Texto da resposta obrigatório.');
}

function planoRespostaPrivada({ rede, eventId, igId, texto }) {
  validarEntrada({ rede, eventId, texto });
  if (rede === 'facebook') {
    return { endpoint: `${eventId}/private_replies`, body: { message: texto } };
  }
  if (!String(igId || '').trim()) throw new Error('ID profissional do Instagram obrigatório.');
  return {
    endpoint: `${igId}/messages`,
    body: { recipient: { comment_id: eventId }, message: { text: texto } },
  };
}

function planoRespostaPublica({ rede, eventId, texto }) {
  validarEntrada({ rede, eventId, texto });
  return {
    endpoint: rede === 'instagram' ? `${eventId}/replies` : `${eventId}/comments`,
    body: { message: texto },
  };
}

module.exports = { planoRespostaPrivada, planoRespostaPublica };
