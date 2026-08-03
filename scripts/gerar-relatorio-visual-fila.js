"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BRANCH = "claude/campos-figueira-growth-qmjsux";
const RAW = `https://raw.githubusercontent.com/escritoriocamposfigueira-commits/dashboard/refs/heads/${BRANCH}`;
const RELATORIO = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/RELATORIO-AUDITORIA-FILA-2026-08-03.json"), "utf8"));
const CAPTIONS = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/captions-imoveis.json"), "utf8"));
const VIDEO_DIR = path.join(ROOT, "public/videos");
const SAIDA = path.join(ROOT, "docs/fila-publicacao.html");

function normalizar(codigo) {
  return String(codigo || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/^CF\s*-?\s*/, "").replace(/\s+/g, " ").trim();
}

function escaparHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const captionPorCodigo = new Map(CAPTIONS.map((item) => [String(item.codigo_imovel), item.caption]));
const videos = fs.readdirSync(VIDEO_DIR)
  .filter((nome) => nome.endsWith(".mp4") && !/story-\d{4}/.test(nome) && !/-CAPT-/.test(nome));
const videoPorCodigo = new Map(videos.map((nome) => {
  const codigo = nome.replace(/^CF-/, "").replace(/-story-.*$/i, "");
  return [normalizar(codigo), nome];
}));

const itens = RELATORIO.itens.map((item) => {
  const caption = captionPorCodigo.get(String(item.codigo)) || "";
  const linhas = caption.split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean);
  const preco = linhas.find((linha) => /R\$|CONSULTE|VALOR/i.test(linha)) || "Consulte o anúncio";
  const titulo = linhas.find((linha) => !/^#|^📲|^🔗|^http/i.test(linha)) || `Imóvel CF-${item.codigo}`;
  const video = videoPorCodigo.get(normalizar(item.codigo));
  if (!video) throw new Error(`Vídeo não encontrado para CF-${item.codigo}`);
  const partes = video.replace(/\.mp4$/i, "").split("-story-");
  const detalhe = (partes[1] || "").replace(/-mixkit-/i, " · música Mixkit ");
  return {
    ...item,
    titulo,
    preco,
    video_url: `${RAW}/public/videos/${encodeURIComponent(video)}`,
    video_arquivo: video,
    video_detalhe: detalhe,
    whatsapp: `https://bit.ly/3aYmFrH`,
  };
});

if (itens.length !== RELATORIO.fila_ativa || itens.some((item) => !item.video_url)) {
  throw new Error(`Fila visual incompleta: ${itens.length} de ${RELATORIO.fila_ativa} imóveis ativos.`);
}

const dados = JSON.stringify(itens).replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#080808">
<title>Fila visual dos ${itens.length} imóveis ativos — Campos Figueira</title>
<style>
:root{--bg:#080808;--card:#121212;--line:#302711;--gold:#d8ab43;--gold2:#ffe29a;--text:#f6f2e8;--muted:#aaa397;--green:#25d366;--red:#ff766b}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 50% -10%,#302307 0,#0b0b0b 35%,var(--bg) 70%);color:var(--text);font-family:Inter,Segoe UI,Arial,sans-serif}
header{padding:42px 18px 22px;text-align:center;border-bottom:1px solid var(--line)}h1{margin:0;font-size:clamp(27px,5vw,48px);letter-spacing:-1px}.gold{color:var(--gold2)}.sub{max-width:850px;margin:12px auto 0;color:var(--muted);line-height:1.55}
.status{max-width:1180px;margin:20px auto;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:0 16px}.stat{background:#12100b;border:1px solid var(--line);border-radius:14px;padding:14px;text-align:center}.stat strong{display:block;color:var(--gold2);font-size:22px}.stat span{font-size:12px;color:var(--muted)}
.ok{max-width:1148px;margin:0 auto 18px;padding:13px 16px;border-radius:12px;background:#0d2116;border:1px solid #216a43;color:#bfffd8}.alert{color:#ffd0cb;background:#2a1110;border-color:#7c302a}
.bar{position:sticky;top:0;z-index:10;background:rgba(8,8,8,.94);backdrop-filter:blur(14px);border-block:1px solid #282014;padding:12px 16px}.controls{max-width:1150px;margin:auto;display:flex;gap:8px;flex-wrap:wrap}.controls input{flex:1;min-width:220px;background:#171717;border:1px solid #393225;border-radius:10px;color:white;padding:11px 13px}.controls button{border:1px solid #4a3c1d;background:#17130a;color:var(--gold2);border-radius:10px;padding:10px 13px;cursor:pointer}.controls button.active{background:var(--gold);color:#111;font-weight:800}
main{max-width:1180px;margin:22px auto;padding:0 16px 50px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.card{background:linear-gradient(150deg,#171717,#0f0f0f);border:1px solid #302818;border-radius:18px;overflow:hidden;box-shadow:0 10px 35px #0008}.visual{position:relative;aspect-ratio:4/5;background:#050505}.visual img,.visual video{width:100%;height:100%;object-fit:cover;display:block}.seq{position:absolute;top:10px;left:10px;background:#080808e8;border:1px solid var(--gold);color:var(--gold2);border-radius:999px;padding:7px 10px;font-weight:900}.tipo{position:absolute;top:10px;right:10px;background:#fff;color:#111;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:900;text-transform:uppercase}.tipo.locação{background:#a8d9ff}.body{padding:15px}.code{font-size:20px;font-weight:900;color:var(--gold2)}h2{font-size:16px;line-height:1.35;margin:6px 0 9px}.price{font-weight:800;color:#fff;margin-bottom:10px}.tags{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.tag{font-size:11px;border:1px solid #493c24;border-radius:999px;padding:5px 8px;color:#d8d0bf}.score{color:#ffdc7d}.conditions{font-size:12px;line-height:1.45;color:#c8c2b6;margin:10px 0}.videoInfo{font-size:11px;color:#9d9689;border-top:1px solid #29241a;padding-top:10px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.actions a,.actions button{border:0;border-radius:10px;padding:10px;text-decoration:none;text-align:center;font-weight:800;cursor:pointer}.play{background:var(--gold);color:#111}.wa{background:var(--green);color:#04170b}.empty{text-align:center;color:var(--muted);padding:60px}.foot{text-align:center;color:var(--muted);font-size:12px;padding:20px}.priority{box-shadow:0 0 0 1px #9e7628,0 12px 40px #b9891420}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}.status{grid-template-columns:repeat(2,1fr)}}@media(max-width:580px){.grid{grid-template-columns:1fr}.status{grid-template-columns:repeat(2,1fr)}header{padding-top:28px}}
</style>
</head>
<body>
<header><h1>Fila visual dos <span class="gold">${itens.length} imóveis ativos</span></h1><p class="sub">Sequência efetiva do robô, com arte, condições comerciais e o vídeo vertical aprovado para Story, Reel e YouTube Short. Os imóveis com entrada, parcelas ou veículo aparecem primeiro.</p></header>
<section class="status"><div class="stat"><strong>${itens.length}</strong><span>imóveis ativos</span></div><div class="stat"><strong>${RELATORIO.vendas}</strong><span>vendas na rotação</span></div><div class="stat"><strong>${RELATORIO.locacoes}</strong><span>locações semanais</span></div><div class="stat"><strong>${itens.length}/${itens.length}</strong><span>vídeos vinculados</span></div></section>
<div class="ok">✅ Correções publicadas no GitHub: antirrepetição de 30 horas, estado persistente, fotos específicas obrigatórias e erro visível quando imagem ou vídeo falhar.</div>
<div class="ok">🚫 Fora da fila: CF-001, CF-413, CF-417, CF-458, CF-527, CF-550 e CF-610.</div>
<div class="bar"><div class="controls"><input id="busca" placeholder="Buscar código, condição ou modelo..."><button class="active" data-filter="todos">Todos</button><button data-filter="prioridade">Prioridade comercial</button><button data-filter="venda">Vendas</button><button data-filter="locação">Locações</button></div></div>
<main><div id="grid" class="grid"></div><div id="empty" class="empty" hidden>Nenhum imóvel encontrado.</div></main>
<footer class="foot">Escritório Campos Figueira · Relatório gerado em 03/08/2026 · Vídeos com áudio incorporado e proporção 9:16</footer>
<script>const ITENS=${dados};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let filtro='todos';
function card(i){const priority=i.sequencia<=17;const cond=i.condicoes.length?i.condicoes.join(' · '):'Condição convencional';return '<article class="card '+(priority?'priority':'')+'" data-search="'+esc((i.codigo+' '+i.titulo+' '+cond+' '+i.video_detalhe).toLowerCase())+'"><div class="visual"><img loading="lazy" src="'+esc(i.url_feed)+'" alt="Arte CF-'+esc(i.codigo)+'"><span class="seq">#'+i.sequencia+'</span><span class="tipo '+esc(i.tipo)+'">'+esc(i.tipo)+'</span></div><div class="body"><div class="code">CF-'+esc(i.codigo)+'</div><h2>'+esc(i.titulo)+'</h2><div class="price">'+esc(i.preco)+'</div><div class="tags"><span class="tag score">Potencial '+esc(i.faixa)+'</span><span class="tag">'+i.fotos_especificas+' fotos</span><span class="tag">YouTube Short 9:16</span></div><div class="conditions">'+esc(cond)+'</div><div class="videoInfo">🎬 '+esc(i.video_detalhe)+'<br>🎵 Áudio aprovado incorporado</div><div class="actions"><button class="play" data-video="'+esc(i.video_url)+'" data-poster="'+esc(i.url_story)+'">▶ Ver vídeo</button><a class="wa" target="_blank" rel="noopener" href="'+esc(i.whatsapp)+'">WhatsApp</a></div></div></article>'}
function render(){const q=document.querySelector('#busca').value.toLowerCase().trim();const lista=ITENS.filter(i=>(filtro==='todos'||i.tipo===filtro||(filtro==='prioridade'&&i.sequencia<=17))&&(!q||(i.codigo+' '+i.titulo+' '+i.condicoes.join(' ')+' '+i.video_detalhe).toLowerCase().includes(q)));document.querySelector('#grid').innerHTML=lista.map(card).join('');document.querySelector('#empty').hidden=lista.length>0}
document.querySelector('#busca').addEventListener('input',render);document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');filtro=b.dataset.filter;render()});document.addEventListener('click',e=>{const b=e.target.closest('[data-video]');if(!b)return;const box=b.closest('.card').querySelector('.visual');box.innerHTML='<video controls autoplay playsinline preload="metadata" poster="'+b.dataset.poster+'" src="'+b.dataset.video+'"></video><span class="seq">'+box.querySelector('.seq').textContent+'</span>'});render();</script>
</body></html>`;

fs.writeFileSync(SAIDA, html, "utf8");
console.log(JSON.stringify({ arquivo: SAIDA, imoveis: itens.length, videos: videoPorCodigo.size }));
