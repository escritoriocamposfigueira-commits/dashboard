"use strict";

function captacaoAprovada(item) {
  return item?.publicacao_automatica === true && item.tipo_midia === "video"
    && typeof item.arquivo_video === "string" && typeof item.url_video === "string";
}

module.exports = { captacaoAprovada };
