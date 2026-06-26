/**
 * gerar-grupos.js — Escritório Campos Figueira
 * Gera GRUPOS-COMPARTILHAR.html: página para postar nos Grupos do Facebook
 * em 3 cliques (copiar legenda → abrir grupo → colar).
 *
 * A Meta DESATIVOU a API de postar em grupos (2024) — não há automação
 * possível. Esta página é a forma mais rápida e segura de fazer manual.
 *
 * USO:  node scripts/gerar-grupos.js
 */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const CAPTIONS = path.join(RAIZ, "src/content/captions-imoveis.json");
const MANIFEST = path.join(RAIZ, "src/content/imagens-urls.json");
const SAIDA = path.join(RAIZ, "GRUPOS-COMPARTILHAR.html");

const GRUPOS = [
  { nome: "Venda e Locação MDC", url: "https://www.facebook.com/groups/618454204921867" },
  { nome: "Venda Locação Mogi das Cruzes", url: "https://www.facebook.com/groups/vendalocacaomogidascruzes" },
  { nome: "Negócios Mogi das Cruzes", url: "https://www.facebook.com/groups/negociosmogidascruzes" },
];

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

const captions = JSON.parse(fs.readFileSync(CAPTIONS, "utf-8"));
const mapaCap = {};
captions.forEach((c) => { mapaCap[c.codigo_imovel] = c.caption; });

let urls = {}, ordem = [];
if (fs.existsSync(MANIFEST)) {
  const m = JSON.parse(fs.readFileSync(MANIFEST, "utf-8"));
  urls = m.urls || {}; ordem = m.ordem || [];
}
// se o manifesto ainda estiver vazio, usa a ordem das próprias captions
if (ordem.length === 0) ordem = captions.map((c) => c.codigo_imovel);

const botoes = GRUPOS.map((g) => `<a class="grp" href="${g.url}" target="_blank">📮 ${g.nome}</a>`).join("");

const cards = ordem.map((cod, i) => {
  const cap = mapaCap[cod] || "";
  const img = urls[cod];
  const imgTag = img ? `<img src="${img}" alt="${cod}" loading="lazy"/>` : `<div class="semimg">imagem: rode PREPARAR-SERVIDOR.js</div>`;
  return `
  <div class="card">
    <div class="num">${i + 1} / ${ordem.length} — ${esc(String(cod))}</div>
    ${imgTag}
    <textarea id="t${i}" readonly>${esc(cap)}</textarea>
    <div class="acts">
      <button onclick="copiar(${i})">📋 Copiar legenda</button>
      ${botoes}
    </div>
  </div>`;
}).join("");

const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Compartilhar nos Grupos — Escritório Campos Figueira</title>
<style>
  body{font-family:system-ui,Arial,sans-serif;background:#f0f2f5;margin:0;padding:20px;color:#1c1e21}
  h1{font-size:20px}
  .info,.card{background:#fff;border-radius:10px;padding:16px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
  .num{font-weight:700;color:#1877f2;margin-bottom:8px}
  img{max-width:300px;width:100%;border-radius:8px;display:block;margin-bottom:10px}
  .semimg{color:#888;font-style:italic;margin-bottom:10px}
  textarea{width:100%;height:150px;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:13px;box-sizing:border-box}
  .acts{margin-top:10px;display:flex;flex-wrap:wrap;gap:8px}
  button,.grp{cursor:pointer;border:none;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:600;text-decoration:none;color:#fff}
  button{background:#42b72a}.grp{background:#1877f2}
</style></head><body>
<div class="info">
  <h1>📤 Compartilhar nos Grupos do Facebook</h1>
  <p><b>1.</b> Clique <b>📋 Copiar legenda</b> &nbsp;·&nbsp; <b>2.</b> Clique no <b>grupo</b> &nbsp;·&nbsp; <b>3.</b> No grupo, cole (Ctrl+V) a legenda e anexe a imagem.</p>
  <p>Total: <b>${ordem.length} imóveis</b>. (A Meta não permite postar em grupos automaticamente — por isso é manual, mas em 3 cliques.)</p>
</div>
${cards}
<script>
function copiar(i){
  const t=document.getElementById('t'+i);
  navigator.clipboard.writeText(t.value).then(()=>{
    const b=event.target,o=b.textContent;b.textContent='✅ Copiado!';setTimeout(()=>b.textContent=o,1500);
  });
}
</script>
</body></html>`;

fs.writeFileSync(SAIDA, html, "utf-8");
console.log(`✅ Gerado: GRUPOS-COMPARTILHAR.html (${ordem.length} imóveis)`);
console.log("   Dê 2 cliques nesse arquivo para abrir e compartilhar nos grupos.");
