"use strict";

const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/imagens-urls.json"), "utf8"));
const fotos = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/fotos-imoveis.json"), "utf8"));
const saida = path.join(ROOT, "docs/RELATORIO-FOTOS-REMOTAS-2026-08-03.json");

function verificar(url, metodo = "HEAD", redirecionamentos = 0) {
  return new Promise((resolve) => {
    if (redirecionamentos > 5) return resolve({ ok: false, erro: "redirecionamentos demais" });
    const req = https.request(url, {
      method: metodo,
      timeout: 20_000,
      headers: {
        "User-Agent": "campos-figueira-auditoria/1.0",
        ...(metodo === "GET" ? { Range: "bytes=0-1023" } : {}),
      },
    }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return verificar(new URL(res.headers.location, url).toString(), metodo, redirecionamentos + 1).then(resolve);
      }
      const tipo = String(res.headers["content-type"] || "").toLowerCase();
      res.resume();
      if (metodo === "HEAD" && [403, 405].includes(res.statusCode)) return verificar(url, "GET", redirecionamentos).then(resolve);
      resolve({
        ok: res.statusCode >= 200 && res.statusCode < 400 && tipo.startsWith("image/"),
        status: res.statusCode,
        tipo,
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (erro) => resolve({ ok: false, erro: erro.message }));
    req.end();
  });
}

async function main() {
  const codigos = manifest.ordem.map(String);
  const referencias = [];
  for (const codigo of codigos) {
    referencias.push({ codigo, uso: "feed", url: manifest.urls_feed[codigo] });
    referencias.push({ codigo, uso: "story", url: manifest.urls[codigo] });
    for (const [indice, url] of (fotos[codigo] || []).entries()) referencias.push({ codigo, uso: `foto-${indice + 1}`, url });
  }
  const porUrl = new Map();
  for (const ref of referencias) {
    if (!porUrl.has(ref.url)) porUrl.set(ref.url, []);
    porUrl.get(ref.url).push({ codigo: ref.codigo, uso: ref.uso });
  }
  const entradas = [...porUrl.entries()];
  const resultados = new Array(entradas.length);
  let cursor = 0;
  async function trabalhador() {
    while (cursor < entradas.length) {
      const indice = cursor;
      cursor += 1;
      const [url, usos] = entradas[indice];
      resultados[indice] = { url, usos, ...(await verificar(url)) };
    }
  }
  await Promise.all(Array.from({ length: 16 }, trabalhador));
  const falhas = resultados.filter((item) => !item.ok);
  const relatorio = {
    gerado_em: new Date().toISOString(),
    imoveis: codigos.length,
    referencias: referencias.length,
    urls_unicas: resultados.length,
    aprovadas: resultados.length - falhas.length,
    falhas,
  };
  fs.writeFileSync(saida, `${JSON.stringify(relatorio, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ imoveis: relatorio.imoveis, referencias: relatorio.referencias, urls_unicas: relatorio.urls_unicas, aprovadas: relatorio.aprovadas, falhas: falhas.length }));
  if (falhas.length) process.exitCode = 1;
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
