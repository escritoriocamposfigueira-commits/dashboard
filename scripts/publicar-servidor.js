/**
 * publicar-servidor.js — Escritório Campos Figueira
 *
 * Roda no GitHub Actions (ubuntu-latest) 2x/dia:
 *   09:00 BRT (cron 0 12 * * *) e 18:00 BRT (cron 0 21 * * *)
 *
 * Publica em 4 canais por imóvel:
 *   FB Feed  (imagem 4:5 + copy UTF-8)
 *   FB Story (VÍDEO 12s Ken Burns + música royalty-free)
 *   IG Feed  (imagem 4:5 + copy UTF-8)
 *   IG Story (VÍDEO 12s Ken Burns + música royalty-free)
 *
 * Variáveis de ambiente obrigatórias:
 *   META_PAGE_TOKEN  — Page Access Token permanente (GitHub Secret)
 *   GITHUB_TOKEN     — injetado automaticamente pelo GitHub Actions
 */

"use strict";
const https  = require("https");
const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const { execSync, spawnSync } = require("child_process");

// ── Paths ─────────────────────────────────────────────────────────────────────
const RAIZ      = path.join(__dirname, "..");
const MANIFEST  = path.join(RAIZ, "src/content/imagens-urls.json");
const CAPTIONS  = path.join(RAIZ, "src/content/captions-imoveis.json");
const ESTADO    = path.join(RAIZ, "controle/estado-publicacao.json");
const TRILHAS   = path.join(RAIZ, "TRILHAS");
const VIDEOS    = path.join(RAIZ, "public/videos");
const TMP       = path.join(RAIZ, ".tmp-videos");

// ── Constantes Meta ───────────────────────────────────────────────────────────
const BASE_HOST = "graph.facebook.com";
const BASE_PATH = "/v22.0";
const PAGE_ID   = "512040582222121";
const IG_ID     = "17841461388445580";

// ── Repositório GitHub ────────────────────────────────────────────────────────
const GH_REPO   = process.env.GITHUB_REPOSITORY || "escritoriocamposfigueira-commits/dashboard";
const GH_BRANCH = process.env.GITHUB_REF_NAME   || "claude/campos-figueira-growth-qmjsux";

// ── Env (.env.local local ou variável de ambiente no Actions) ─────────────────
function carregarEnv() {
  const p = path.join(RAIZ, ".env.local");
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, "utf-8").split("\n").forEach((l) => {
    const m = l.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  });
}
carregarEnv();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ════════════════════════════════════════════════════════════════════════════
// HTTP HELPERS
// ════════════════════════════════════════════════════════════════════════════

function request(options, body) {
  return new Promise((resolve) => {
    const mod = options.hostname === "rupload.facebook.com" ? https : https;
    const req = mod.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: { raw } }); }
      });
    });
    req.on("error", (e) => resolve({ status: 0, data: { error: { message: e.message } } }));
    if (body) req.write(body);
    req.end();
  });
}

function apiPost(endpoint, bodyObj) {
  const buf = Buffer.from(JSON.stringify(bodyObj), "utf-8");
  return request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/${endpoint}`,
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Length": buf.length },
  }, buf).then(r => r.data);
}

function apiGet(endpoint) {
  return request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/${endpoint}`,
    method: "GET",
  }).then(r => r.data);
}

// ════════════════════════════════════════════════════════════════════════════
// GITHUB CONTENTS API — upload binário para hospedar vídeo
// ════════════════════════════════════════════════════════════════════════════

async function githubRequest(method, apiPath, ghToken, bodyObj) {
  const buf = bodyObj ? Buffer.from(JSON.stringify(bodyObj), "utf-8") : null;
  const headers = {
    "Authorization": `token ${ghToken}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "campos-figueira-bot/1.0",
  };
  if (buf) { headers["Content-Type"] = "application/json"; headers["Content-Length"] = buf.length; }
  return request({ hostname: "api.github.com", path: apiPath, method, headers }, buf).then(r => r.data);
}

async function subirVideoGitHub(videoPath, nomeArquivo) {
  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) { console.log("  [GH] GITHUB_TOKEN ausente — URL de fallback usada."); return null; }

  const [owner, repo] = GH_REPO.split("/");
  const filePath = `public/videos/${nomeArquivo}`;
  const content = fs.readFileSync(videoPath).toString("base64");
  const apiPath = `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(GH_BRANCH)}`;

  // Buscar SHA atual (necessário se arquivo já existir)
  const existing = await githubRequest("GET", `/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(GH_BRANCH)}`, ghToken);

  const body = {
    message: `vídeo story: ${nomeArquivo} [skip ci]`,
    content,
    branch: GH_BRANCH,
    ...(existing.sha ? { sha: existing.sha } : {}),
  };

  console.log(`  [GH] Uploading ${nomeArquivo} (${Math.round(fs.statSync(videoPath).size / 1024)}KB)...`);
  const result = await githubRequest("PUT", `/repos/${owner}/${repo}/contents/${filePath}`, ghToken, body);

  if (result.content && result.content.download_url) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${GH_BRANCH}/${filePath}`;
    console.log(`  [GH] ✅ URL: ${rawUrl}`);
    return rawUrl;
  }
  console.log("  [GH] ❌ Upload falhou:", JSON.stringify(result).slice(0, 200));
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// FFMPEG — gerar vídeo 12s com Ken Burns + trilha royalty-free
// ════════════════════════════════════════════════════════════════════════════

function encontrarFFmpeg() {
  // 1) Caminho real via which/where (mais confiável no servidor)
  try {
    const cmd = process.platform === "win32" ? "where ffmpeg" : "which ffmpeg";
    const achado = execSync(cmd, { timeout: 5000 }).toString().split(/\r?\n/)[0].trim();
    if (achado && fs.existsSync(achado)) return achado;
  } catch {}
  // 2) Candidatos conhecidos
  const candidatos = [
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "ffmpeg",
    "C:\\Users\\Henrique\\ffmpeg\\bin\\ffmpeg.exe",
    path.join(process.env.USERPROFILE || "", "ffmpeg", "bin", "ffmpeg.exe"),
  ];
  for (const c of candidatos) {
    try {
      if (spawnSync(c, ["-version"], { timeout: 8000 }).status === 0) return c;
    } catch {}
  }
  return null;
}

function detectarEmocao(caption = "") {
  const t = caption.toLowerCase();
  if (/urgência|oportunidade|não perd|última unidade|agora|corre|rápido/.test(t)) return "urgencia";
  if (/família|filho|criança|lazer|reunir|amor/.test(t))                          return "familiar";
  if (/conquista|patrimônio|vitória|realizou|sonho se tornou/.test(t))            return "conquista";
  if (/escritório|profissional|advocacia|comercial|negócio/.test(t))              return "confianca";
  return "sonho";
}

function selecionarTrilha(emocao) {
  const catalogoPath = path.join(TRILHAS, "catalogo.json");
  if (!fs.existsSync(catalogoPath)) return null;
  const { trilhas } = JSON.parse(fs.readFileSync(catalogoPath, "utf-8"));
  const filtrado = trilhas.filter((t) => t.emocao === emocao);
  const lista = filtrado.length > 0 ? filtrado : trilhas;
  if (lista.length === 0) return null;
  const idx = new Date().getDay() % lista.length;
  const trilhaPath = path.join(TRILHAS, lista[idx].nome);
  return fs.existsSync(trilhaPath) ? trilhaPath : null;
}

async function baixarImagem(url, destino) {
  return new Promise((resolve, reject) => {
    const arquivo = fs.createWriteStream(destino);
    const fazer = (u) => {
      https.get(u, { headers: { "User-Agent": "campos-figueira-bot/1.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          arquivo.close();
          return fazer(res.headers.location);
        }
        res.pipe(arquivo);
        arquivo.on("finish", () => { arquivo.close(); resolve(); });
      }).on("error", reject);
    };
    fazer(url);
  });
}

async function gerarVideoStory(ffmpeg, imagemUrl, nomeArquivo, emocao) {
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(VIDEOS, { recursive: true });

  const imgPath   = path.join(TMP, nomeArquivo.replace(".mp4", ".png"));
  const videoPath = path.join(VIDEOS, nomeArquivo);

  // Reusar se já gerado
  if (fs.existsSync(videoPath)) {
    console.log(`  [FFmpeg] ⏭️  Vídeo já existe: ${nomeArquivo}`);
    return videoPath;
  }

  console.log(`  [FFmpeg] Baixando imagem...`);
  await baixarImagem(imagemUrl, imgPath);

  const trilha = selecionarTrilha(emocao);
  const DURACAO = 12;
  const filtro = [
    `scale=1080:1920:force_original_aspect_ratio=decrease`,
    `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`,
    `zoompan=z='if(lte(zoom,1.0),1.0,zoom+0.0010)':d=${DURACAO * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=25`,
    `format=yuv420p`,
  ].join(",");

  let args;
  if (trilha) {
    console.log(`  [FFmpeg] Trilha: ${path.basename(trilha)} (${emocao})`);
    args = [
      "-loop", "1", "-i", imgPath,
      "-i", trilha,
      "-t", String(DURACAO),
      "-vf", filtro,
      "-c:v", "libx264", "-preset", "fast", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
      "-af", `afade=t=out:st=${DURACAO - 2}:d=2,volume=0.7`,
      "-shortest", "-movflags", "+faststart",
      "-y", videoPath,
    ];
  } else {
    console.log(`  [FFmpeg] Sem trilha disponível — gerando vídeo mudo.`);
    args = [
      "-loop", "1", "-i", imgPath,
      "-t", String(DURACAO),
      "-vf", filtro,
      "-c:v", "libx264", "-preset", "fast", "-crf", "23",
      "-movflags", "+faststart",
      "-y", videoPath,
    ];
  }

  console.log(`  [FFmpeg] Gerando vídeo ${DURACAO}s 1080×1920...`);
  const r = spawnSync(ffmpeg, args, { timeout: 120000 });
  if (r.status !== 0) {
    const err = r.stderr ? r.stderr.toString().slice(-400) : "erro desconhecido";
    throw new Error("FFmpeg falhou: " + err);
  }
  const kb = Math.round(fs.statSync(videoPath).size / 1024);
  console.log(`  [FFmpeg] ✅ ${nomeArquivo} (${kb}KB)`);
  return videoPath;
}

// ════════════════════════════════════════════════════════════════════════════
// META API — publicação
// ════════════════════════════════════════════════════════════════════════════

async function publicarFeedFacebook(token, urlFeed, caption) {
  const r = await apiPost(`${PAGE_ID}/photos`, { url: urlFeed, caption, access_token: token });
  if (r.error) throw new Error("FB Feed: " + r.error.message);
  return r.post_id || r.id;
}

async function publicarFeedInstagram(token, urlFeed, caption) {
  const cont = await apiPost(`${IG_ID}/media`, { image_url: urlFeed, caption, access_token: token });
  if (cont.error) throw new Error("IG Feed container: " + cont.error.message);
  for (let i = 0; i < 16; i++) {
    await sleep(2500);
    const st = await apiGet(`${cont.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("IG Feed container ERROR");
  }
  const pub = await apiPost(`${IG_ID}/media_publish`, { creation_id: cont.id, access_token: token });
  if (pub.error) throw new Error("IG Feed publish: " + pub.error.message);
  return pub.id;
}

// IG Carrossel: arte premium (slide 1) + fotos reais do imóvel (slides 2..10)
async function publicarCarrosselInstagram(token, urls, caption) {
  const childIds = [];
  for (const u of urls.slice(0, 10)) {
    const c = await apiPost(`${IG_ID}/media`, { image_url: u, is_carousel_item: true, access_token: token });
    if (c.error) { console.log("  [carrossel] foto ignorada:", (c.error.message || "").slice(0, 60)); continue; }
    let ok = false;
    for (let i = 0; i < 6; i++) { await sleep(1500); const st = await apiGet(`${c.id}?fields=status_code&access_token=${encodeURIComponent(token)}`); if (st.status_code === "FINISHED") { ok = true; break; } if (st.status_code === "ERROR") break; }
    if (ok) childIds.push(c.id);
  }
  if (childIds.length < 2) throw new Error("carrossel: menos de 2 fotos válidas");
  const cont = await apiPost(`${IG_ID}/media`, { media_type: "CAROUSEL", children: childIds.join(","), caption, access_token: token });
  if (cont.error) throw new Error("IG Carrossel container: " + cont.error.message);
  for (let i = 0; i < 20; i++) { await sleep(2500); const st = await apiGet(`${cont.id}?fields=status_code&access_token=${encodeURIComponent(token)}`); if (st.status_code === "FINISHED") break; if (st.status_code === "ERROR") throw new Error("IG Carrossel container ERROR"); }
  const pub = await apiPost(`${IG_ID}/media_publish`, { creation_id: cont.id, access_token: token });
  if (pub.error) throw new Error("IG Carrossel publish: " + pub.error.message);
  return pub.id;
}

// Verifica se uma URL já está acessível (para o IG conseguir buscar o vídeo)
function urlPronta(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => { res.resume(); resolve(res.statusCode >= 200 && res.statusCode < 400); }).on("error", () => resolve(false));
  });
}
async function aguardarUrl(url, tentativas = 10) {
  for (let i = 0; i < tentativas; i++) { if (await urlPronta(url)) return true; await sleep(3000); }
  return false;
}

// FB Story: upload binário via rupload.facebook.com (não precisa de URL pública)
async function publicarVideoStoryFacebook(token, videoPath) {
  const fileSize = fs.statSync(videoPath).size;

  const init = await apiPost(`${PAGE_ID}/video_stories`, {
    upload_phase: "start", file_size: fileSize, access_token: token,
  });
  if (init.error) throw new Error("FB Story init: " + init.error.message);
  const videoId = init.video_id;

  const videoData = fs.readFileSync(videoPath);
  const upload = await new Promise((resolve) => {
    const req = https.request({
      hostname: "rupload.facebook.com",
      path: `/video-upload/v22.0/${videoId}`,
      method: "POST",
      headers: {
        "Authorization": `OAuth ${token}`,
        "Content-Type": "video/mp4",
        "Content-Length": fileSize,
        "offset": "0",
        "file_size": String(fileSize),
      },
    }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ ok: res.statusCode < 300 }); } });
    });
    req.on("error", (e) => resolve({ error: { message: e.message } }));
    req.write(videoData);
    req.end();
  });
  if (upload.error) throw new Error("FB Story upload: " + upload.error.message);

  await sleep(2000);
  const finish = await apiPost(`${PAGE_ID}/video_stories`, {
    upload_phase: "finish", video_id: videoId, access_token: token,
  });
  if (finish.error) throw new Error("FB Story finish: " + finish.error.message);
  return finish.post_id || finish.id || videoId;
}

// IG Story: precisa de URL pública para video_url
async function publicarVideoStoryInstagram(token, videoUrl) {
  const cont = await apiPost(`${IG_ID}/media`, {
    video_url: videoUrl, media_type: "STORIES", access_token: token,
  });
  if (cont.error) throw new Error("IG Story container: " + cont.error.message);
  for (let i = 0; i < 24; i++) {
    await sleep(2500);
    const st = await apiGet(`${cont.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("IG Story container ERROR");
  }
  const pub = await apiPost(`${IG_ID}/media_publish`, { creation_id: cont.id, access_token: token });
  if (pub.error) throw new Error("IG Story publish: " + pub.error.message);
  return pub.id;
}

// IG Story: fallback para imagem se vídeo falhar
async function publicarStoryInstagramImagem(token, urlImagem) {
  const cont = await apiPost(`${IG_ID}/media`, {
    image_url: urlImagem, media_type: "STORIES", access_token: token,
  });
  if (cont.error) throw new Error("IG Story img container: " + cont.error.message);
  for (let i = 0; i < 12; i++) {
    await sleep(2500);
    const st = await apiGet(`${cont.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("IG Story img ERROR");
  }
  const pub = await apiPost(`${IG_ID}/media_publish`, { creation_id: cont.id, access_token: token });
  if (pub.error) throw new Error("IG Story img publish: " + pub.error.message);
  return pub.id + " (imagem)";
}

// ════════════════════════════════════════════════════════════════════════════
// ALERTAS — ntfy.sh
// ════════════════════════════════════════════════════════════════════════════

function enviarAlerta(titulo, mensagem, prioridade = 3) {
  try {
    const buf = Buffer.from(mensagem, "utf-8");
    const req = https.request({
      hostname: "ntfy.sh",
      path: "/escritorio-cf-alertas",
      method: "POST",
      headers: {
        "Title": Buffer.from(titulo).toString("latin1"),
        "Priority": String(prioridade),
        "Content-Length": buf.length,
      },
    });
    req.write(buf);
    req.end();
  } catch {}
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// ROTAÇÃO — 6 locações 1x/semana (seg–sex) misturadas com vendas
// ════════════════════════════════════════════════════════════════════════════
const LOCACAO_CODES = new Set(["584", "607", "609", "609B", "CASA INDAIA BERTIOGA", "CASA JARDIM ARMENIA"]);
let CAPTACAO = [];
try { CAPTACAO = JSON.parse(fs.readFileSync(path.join(RAIZ, "src/content/captacao.json"), "utf-8")); } catch {}
let FOTOS = {};
try { FOTOS = JSON.parse(fs.readFileSync(path.join(RAIZ, "src/content/fotos-imoveis.json"), "utf-8")); } catch {}

function semanaISO(d) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dia = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dia + 3);
  const primeiraQui = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const semana = 1 + Math.round(((dt - primeiraQui) / 86400000 - 3 + ((primeiraQui.getUTCDay() + 6) % 7)) / 7);
  return `${dt.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
}

// PURO: lê o estado e devolve o próximo código, sem alterar nada.
function escolherProximo(manifest, estado) {
  const ordem = manifest.ordem.map(String);
  const locacoes = ordem.filter((c) => LOCACAO_CODES.has(c));
  const vendas = ordem.filter((c) => !LOCACAO_CODES.has(c));
  if (locacoes.length === 0 || vendas.length === 0) {
    const i = (estado.indice || 0) % ordem.length;
    return { codigo: ordem[i], tipo: "seq", vendaIdx: null };
  }
  const brt = new Date(Date.now() - 3 * 3600 * 1000);
  const semana = semanaISO(brt);
  const pubSemana = (estado.publicados || [])
    .filter((p) => { try { return semanaISO(new Date(new Date(p.data).getTime() - 3 * 3600 * 1000)) === semana; } catch { return false; } })
    .map((p) => String(p.codigo));
  const locPendentes = locacoes.filter((c) => !pubSemana.includes(c));
  const dow = brt.getDay();
  const hora = brt.getHours();
  let slotsRestantes;
  if (dow === 0 || dow === 6) {
    slotsRestantes = 10;
  } else {
    const diasRest = 5 - dow;
    const slotsHoje = hora < 15 ? 2 : 1;
    slotsRestantes = diasRest * 2 + slotsHoje;
  }
  const forcarLoc = locPendentes.length > 0 && (locPendentes.length >= slotsRestantes || (pubSemana.length % 2 === 0));
  if (forcarLoc) return { codigo: locPendentes[0], tipo: "locacao", vendaIdx: null };
  // Slots não-locação: alterna venda e captação
  const naoLoc = estado.contadorNaoLoc || 0;
  if (CAPTACAO.length > 0 && naoLoc % 2 === 1) {
    const ci = (estado.indiceCapt || 0) % CAPTACAO.length;
    return { codigo: CAPTACAO[ci].id, tipo: "captacao", captIdx: ci };
  }
  const vi = (estado.indiceVenda || 0) % vendas.length;
  return { codigo: vendas[vi], tipo: "venda", vendaIdx: vi };
}

// Deriva o Page Access Token a partir do token fornecido (funciona com token de
// Usuário do Sistema, token de usuário OU token de página já pronto).
async function resolverPageToken(tokenInicial) {
  try {
    const r = await apiGet(`me/accounts?fields=id,name,access_token&limit=100&access_token=${encodeURIComponent(tokenInicial)}`);
    if (r && r.data && r.data.length) {
      const pg = r.data.find((p) => String(p.id) === PAGE_ID) || r.data[0];
      if (pg && pg.access_token) { console.log(`  🔑 Page token derivado via me/accounts (${pg.name}).`); return pg.access_token; }
    }
  } catch {}
  try {
    const r2 = await apiGet(`${PAGE_ID}?fields=access_token&access_token=${encodeURIComponent(tokenInicial)}`);
    if (r2 && r2.access_token) { console.log("  🔑 Page token derivado via node da página."); return r2.access_token; }
  } catch {}
  console.log("  ⚠️  Não deu pra derivar page token — usando o token original.");
  return tokenInicial;
}

async function main() {
  const tokenInicial = process.env.META_PAGE_TOKEN;
  if (!tokenInicial) { console.error("❌ META_PAGE_TOKEN não definido."); process.exit(1); }
  const token = await resolverPageToken(tokenInicial);

  // ── Carregar dados ──────────────────────────────────────────────────────
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf-8"));
  const captions = JSON.parse(fs.readFileSync(CAPTIONS, "utf-8"));
  const mapaCap  = {};
  captions.forEach((c) => { mapaCap[c.codigo_imovel] = c.caption; });

  let estado = { indice: 0, publicados: [], tentativas: 0 };
  if (fs.existsSync(ESTADO)) estado = JSON.parse(fs.readFileSync(ESTADO, "utf-8"));

  let plano;
  try {
    plano = escolherProximo(manifest, estado);
  } catch (e) {
    console.log("  ⚠️  Rotação falhou, usando modo sequencial:", e.message);
    const i = (estado.indice || 0) % manifest.ordem.length;
    plano = { codigo: String(manifest.ordem[i]), tipo: "seq", vendaIdx: null };
  }
  const codigo    = plano.codigo;
  console.log(`  Tipo: ${plano.tipo}`);
  let urlStory, urlFeed, caption;
  if (plano.tipo === "captacao") {
    const art = CAPTACAO[plano.captIdx];
    urlStory = art.url;
    urlFeed = art.url;
    caption = art.caption;
  } else {
    urlStory = manifest.urls[codigo];
    urlFeed = manifest.urls_feed?.[codigo] || manifest.urls_quadrada?.[codigo] || urlStory;
    caption = mapaCap[codigo] || `CF-${codigo} — Escritório Campos Figueira\n\n📲 WhatsApp: (11) 2378-5643`;
  }

  // LOOP INFINITO: nunca termina. Ao esgotar a lista, recomeça sozinho.
  // A lista cresce automaticamente: basta adicionar o imóvel em imagens-urls.json
  // (e a legenda em captions-imoveis.json) que ele entra no rodízio no mesmo instante.
  console.log(`\n▶ Publicando post #${(estado.publicados?.length || 0) + 1} (rodízio infinito de ${manifest.ordem.length} imóveis) — CF-${codigo}`);
  console.log(`  Feed URL : ${urlFeed}`);
  console.log(`  Story URL: ${urlStory}`);

  // ── FFmpeg ──────────────────────────────────────────────────────────────
  const ffmpeg = encontrarFFmpeg();
  const nomeVideo = `CF-${codigo}-story.mp4`;
  let videoPath = null;
  let videoUrl  = urlStory; // fallback = imagem se vídeo falhar

  if (ffmpeg) {
    try {
      const emocao = detectarEmocao(caption);
      videoPath = await gerarVideoStory(ffmpeg, urlStory, nomeVideo, emocao);

      // Hospedar no GitHub para que o IG possa acessar a URL
      const ghUrl = await subirVideoGitHub(videoPath, nomeVideo);
      const alvo = ghUrl || `https://raw.githubusercontent.com/${GH_REPO}/${GH_BRANCH}/public/videos/${nomeVideo}`;
      const pronta = await aguardarUrl(alvo, 12); // espera o CDN liberar o vídeo (até ~36s) p/ o IG conseguir buscar
      videoUrl = alvo;
      console.log(`  URL vídeo: ${videoUrl} ${pronta ? "(pronta ✅)" : "(sem confirmação)"}`);
    } catch (e) {
      console.log(`  ⚠️  Geração de vídeo falhou: ${e.message}. Usando imagem como fallback.`);
    }
  } else {
    console.log("  ⚠️  FFmpeg não encontrado. Stories publicados como imagem.");
  }

  // ── Publicar ─────────────────────────────────────────────────────────────
  const reg = { codigo, data: new Date().toISOString(), fb_feed: "—", fb_story: "—", ig_feed: "—", ig_story: "—" };

  try {
    reg.fb_feed = "✅ " + await publicarFeedFacebook(token, urlFeed, caption);
  } catch (e) { reg.fb_feed = "❌ " + e.message; }
  console.log("  FB Feed :", reg.fb_feed);

  try {
    if (videoPath) {
      reg.fb_story = "✅ " + await publicarVideoStoryFacebook(token, videoPath);
    } else {
      // Fallback imagem para FB story
      const foto = await apiPost(`${PAGE_ID}/photos`, { url: urlStory, published: false, access_token: token });
      if (foto.error) throw new Error(foto.error.message);
      const s = await apiPost(`${PAGE_ID}/photo_stories`, { photo_id: foto.id, access_token: token });
      if (s.error) throw new Error(s.error.message);
      reg.fb_story = "✅ " + (s.post_id || s.id || foto.id) + " (imagem)";
    }
  } catch (e) { reg.fb_story = "❌ " + e.message; }
  console.log("  FB Story:", reg.fb_story);

  try {
    const fotos = (plano.tipo !== "captacao" && FOTOS[String(codigo)]) ? FOTOS[String(codigo)] : [];
    if (fotos.length >= 1) {
      const slides = [urlFeed, ...fotos].slice(0, 10); // arte premium + fotos reais
      reg.ig_feed = `✅ (carrossel ${slides.length}) ` + await publicarCarrosselInstagram(token, slides, caption);
    } else {
      reg.ig_feed = "✅ " + await publicarFeedInstagram(token, urlFeed, caption);
    }
  } catch (e) {
    try { reg.ig_feed = "✅ " + await publicarFeedInstagram(token, urlFeed, caption); }
    catch (e2) { reg.ig_feed = "❌ " + e2.message; }
  }
  console.log("  IG Feed :", reg.ig_feed);

  try {
    if (videoPath && videoUrl !== urlStory) {
      reg.ig_story = "✅ " + await publicarVideoStoryInstagram(token, videoUrl);
    } else {
      reg.ig_story = "✅ " + await publicarStoryInstagramImagem(token, urlStory);
    }
  } catch (e) {
    // Tentar fallback para imagem
    try {
      reg.ig_story = "✅ " + await publicarStoryInstagramImagem(token, urlStory);
    } catch (e2) { reg.ig_story = "❌ " + e2.message; }
  }
  console.log("  IG Story:", reg.ig_story);

  // ── Avançar fila ──────────────────────────────────────────────────────────
  const algumOk = Object.values(reg).some((v) => typeof v === "string" && v.startsWith("✅"));
  estado.tentativas = estado.tentativas || 0;

  if (algumOk || estado.tentativas >= 2) {
    if (!algumOk) {
      reg.observacao = `pulado após ${estado.tentativas + 1} tentativas`;
      enviarAlerta(`❌ CF-${codigo} FALHOU`, `Todos os canais falharam (${estado.tentativas + 1}x). Verifique o token.`, 5);
    } else {
      const canaisOk = ["fb_feed","fb_story","ig_feed","ig_story"].filter((k) => reg[k].startsWith("✅")).join(", ");
      enviarAlerta(`✅ CF-${codigo} publicado`, `Publicado em: ${canaisOk}`);
    }
    estado.publicados.push(reg);
    if (plano.tipo === "venda" && plano.vendaIdx !== null) {
      const vendasTot = manifest.ordem.map(String).filter((c) => !LOCACAO_CODES.has(c)).length;
      estado.indiceVenda = (plano.vendaIdx + 1) % vendasTot;
    }
    if (plano.tipo === "captacao") {
      estado.indiceCapt = (plano.captIdx + 1) % (CAPTACAO.length || 1);
    }
    if (plano.tipo !== "locacao") {
      estado.contadorNaoLoc = (estado.contadorNaoLoc || 0) + 1;
    }
    estado.indice = (estado.indice || 0) + 1;
    estado.tentativas = 0;
  } else {
    estado.tentativas += 1;
    estado.ultimaFalha = reg;
    enviarAlerta(`⚠️ CF-${codigo} falhou (tentativa ${estado.tentativas}/3)`, JSON.stringify(reg).slice(0, 200), 4);
    console.log(`\n⚠️  Nenhum canal publicou. Tentativa ${estado.tentativas}/3.`);
  }

  // ── Salvar estado ─────────────────────────────────────────────────────────
  fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
  fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 2), "utf-8");

  let proximo = "(próxima execução)";
  try { proximo = escolherProximo(manifest, estado).codigo; } catch {}
  console.log(`\n📊 Estado salvo. Próximo previsto: CF-${proximo}`);
}

main().catch((e) => {
  console.error("❌ Erro fatal:", e.message);
  enviarAlerta("❌ ROBÔ PAROU", e.message, 5);
  process.exit(1);
});
