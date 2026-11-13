"use strict";

function verdade(valor) {
  return /^(1|true|sim|yes)$/i.test(String(valor || ""));
}

function campanhaPara({ codigo, tipo, ehCaptacao }) {
  if (ehCaptacao) return { palavra: "AVALIAR", pagina: "avaliar-meu-imovel.html", campanha: "captacao-proprietario" };
  if (tipo === "locacao") return { palavra: "ALUGAR", pagina: "alugar-sem-fiador.html", campanha: `locacao-cf-${codigo}` };
  return { palavra: "IMOVEL", pagina: "imoveis-da-semana.html", campanha: `venda-cf-${codigo}` };
}

function enriquecerLegendaCaptador(legenda, opcoes = {}) {
  if (!verdade(opcoes.enabled)) return String(legenda || "");
  const base = String(opcoes.baseUrl || "").replace(/\/$/, "");
  if (!/^https:\/\//i.test(base)) throw new Error("CAPTADOR_PAGES_URL deve ser uma URL HTTPS.");
  const campanha = campanhaPara(opcoes);
  const url = new URL(`${base}/${campanha.pagina}`);
  url.searchParams.set("utm_source", "robo_social");
  url.searchParams.set("utm_medium", "organic");
  url.searchParams.set("utm_campaign", campanha.campanha);
  if (!opcoes.ehCaptacao && opcoes.codigo) url.searchParams.set("codigo_imovel", `CF-${opcoes.codigo}`);
  const linhas = ["", "📋 Receba as informações e deixe seu interesse registrado:", `🔗 ${url.toString()}`];
  if (verdade(opcoes.manychatActive)) {
    linhas.unshift("", `💬 Comente \"${campanha.palavra}\" para receber no direct.`);
  }
  return `${String(legenda || "").trim()}\n${linhas.join("\n").trimEnd()}`;
}

module.exports = { campanhaPara, enriquecerLegendaCaptador, verdade };
