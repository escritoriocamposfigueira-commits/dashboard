/**
 * publicar-servidor.js — Escritório Campos Figueira
 *
 * Roda no GitHub Actions (ubuntu-latest) em uma grade semanal:
 *   venda diária, locação diária, 1 locação extra, 2 captações e recuperação.
 *
 * Publica em 4 canais por imóvel:
 *   FB Feed  (imagem 4:5 + copy UTF-8)
 *   FB Story (VÍDEO 15s com montagem profissional + trilha aprovada)
 *   IG Feed  (imagem 4:5 + copy UTF-8)
 *   IG Story (VÍDEO 15s com montagem profissional + trilha aprovada)
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
const {
  registrarUsoTrilha,
  selecionarTrilha,
} = require("./biblioteca-trilhas");
const {
  DURACAO_PADRAO,
  gerarVideoStoryProfissional,
  registrarUsoModelo,
  selecionarModeloStory,
} = require("./video-story-profissional");

// ── Paths ─────────────────────────────────────────────────────────────────────
const RAIZ      = path.join(__dirname, "..");
const MANIFEST  = path.join(RAIZ, "src/content/imagens-urls.json");
const CAPTIONS  = path.join(RAIZ, "src/content/captions-imoveis.json");
const ESTADO    = path.join(RAIZ, "controle/estado-publicacao.json");
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
// FFMPEG — gerar vídeo 15s com montagem profissional + trilha aprovada
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

function dataBrasiliaISO(data = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
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

async function gerarVideoStory(
  ffmpeg,
  imagemUrl,
  nomeArquivo,
  emocao,
  trilhaSelecionada,
  modeloSelecionado,
) {
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

  const trilha = trilhaSelecionada?.caminho || null;
  const modeloId = modeloSelecionado?.id || "topo-cinematografico";
  if (trilha) {
    console.log(`  [FFmpeg] Trilha: ${trilhaSelecionada.id} · ${path.basename(trilha)} (${emocao})`);
  } else {
    console.log(`  [FFmpeg] Sem trilha disponível — gerando vídeo mudo.`);
  }
  console.log(`  [FFmpeg] Modelo: ${modeloId}`);
  console.log(`  [FFmpeg] Gerando vídeo ${DURACAO_PADRAO}s 1080×1920...`);
  gerarVideoStoryProfissional({
    ffmpeg,
    imagemPath: imgPath,
    audioPath: trilha,
    outputPath: videoPath,
    modeloId,
  });
  const kb = Math.round(fs.statSync(videoPath).size / 1024);
  console.log(`  [FFmpeg] ✅ ${nomeArquivo} (${kb}KB)`);
  return videoPath;
}

// ════════════════════════════════════════════════════════════════════════════
// META API — publicação
// ════════════════════════════════════════════════════════════════════════════

// Erros transitórios da Meta: vale a pena repetir (não são falha de token/permissão)
function ehErroTransitorio(msg = "") {
  return /reduce the amount of data|temporar|try again|rate limit|limit reached|please try|unknown error|timeout|timed out|#1\b|#2\b|#4\b|#17\b|#341\b|#368\b/i.test(msg);
}

// Repete uma publicação só quando o erro é transitório, com espera crescente.
async function comRetry(fn, label, vezes = 3) {
  let ultimoErro;
  for (let i = 0; i < vezes; i++) {
    try { return await fn(); }
    catch (e) {
      ultimoErro = e;
      if (i < vezes - 1 && ehErroTransitorio(e.message)) {
        const espera = 4000 * (i + 1);
        console.log(`  ↻ ${label}: erro transitório ("${(e.message || "").slice(0, 60)}"). Retry ${i + 1}/${vezes - 1} em ${espera / 1000}s...`);
        await sleep(espera);
        continue;
      }
      throw e;
    }
  }
  throw ultimoErro;
}

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

// FB Reel: mesmo vídeo 9:16 vira Reel permanente no feed do Facebook (alcança quem não curte a página)
async function publicarReelFacebook(token, videoPath, caption) {
  const fileSize = fs.statSync(videoPath).size;

  const init = await apiPost(`${PAGE_ID}/video_reels`, {
    upload_phase: "start", access_token: token,
  });
  if (init.error) throw new Error("FB Reel init: " + init.error.message);
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
  if (upload.error) throw new Error("FB Reel upload: " + upload.error.message);

  // Aguardar o processamento do vídeo antes de publicar (Reel exige "ready")
  for (let i = 0; i < 24; i++) {
    await sleep(3000);
    const st = await apiGet(`${videoId}?fields=status&access_token=${encodeURIComponent(token)}`);
    const fase = (st.status && (st.status.video_status || st.status.processing_phase?.status)) || "";
    if (/ready|complete|finished/i.test(fase)) break;
    if (/error/i.test(fase)) throw new Error("FB Reel processamento ERROR");
  }

  const finish = await apiPost(`${PAGE_ID}/video_reels`, {
    upload_phase: "finish", video_id: videoId, video_state: "PUBLISHED",
    description: caption, access_token: token,
  });
  if (finish.error) throw new Error("FB Reel finish: " + finish.error.message);
  return finish.post_id || finish.id || videoId;
}

// IG Story: precisa de URL pública para video_url
// IG Reel: mesmo vídeo 9:16, vai pro FEED (permanente) e alcança quem não segue
async function publicarReelInstagram(token, videoUrl, caption) {
  const cont = await apiPost(`${IG_ID}/media`, {
    media_type: "REELS", video_url: videoUrl, caption, share_to_feed: true, access_token: token,
  });
  if (cont.error) throw new Error("IG Reel container: " + cont.error.message);
  for (let i = 0; i < 40; i++) { // Reel processa mais devagar (até ~2min)
    await sleep(3000);
    const st = await apiGet(`${cont.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("IG Reel container ERROR");
  }
  const pub = await apiPost(`${IG_ID}/media_publish`, { creation_id: cont.id, access_token: token });
  if (pub.error) throw new Error("IG Reel publish: " + pub.error.message);
  return pub.id;
}

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
// YOUTUBE SHORTS — opcional (só roda se as chaves existirem no Secret)
// Precisa: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (Google Cloud OAuth)
// ════════════════════════════════════════════════════════════════════════════

function temChavesYouTube() {
  return !!(process.env.YT_CLIENT_ID && process.env.YT_CLIENT_SECRET && process.env.YT_REFRESH_TOKEN);
}

// Troca o refresh_token permanente por um access_token de curta duração
async function youtubeAccessToken() {
  const body = [
    `client_id=${encodeURIComponent(process.env.YT_CLIENT_ID)}`,
    `client_secret=${encodeURIComponent(process.env.YT_CLIENT_SECRET)}`,
    `refresh_token=${encodeURIComponent(process.env.YT_REFRESH_TOKEN)}`,
    `grant_type=refresh_token`,
  ].join("&");
  const buf = Buffer.from(body, "utf-8");
  const r = await request({
    hostname: "oauth2.googleapis.com",
    path: "/token",
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": buf.length },
  }, buf);
  if (r.data && r.data.access_token) return r.data.access_token;
  throw new Error("YouTube OAuth: " + JSON.stringify(r.data).slice(0, 140));
}

async function publicarYouTubeShort(videoPath, caption) {
  const accessToken = await youtubeAccessToken();
  const primeira = (caption || "").split("\n").find((l) => l.trim()) || "Escritório Campos Figueira";
  const titulo = `${primeira.slice(0, 88).trim()} #Shorts`.slice(0, 100);
  const descricao = `${caption}\n\n#Shorts #imoveis #mogidascruzes #camposfigueira`;
  const meta = JSON.stringify({
    snippet: { title: titulo, description: descricao, categoryId: "22" },
    status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
  });

  const boundary = "cfbound" + Date.now();
  const video = fs.readFileSync(videoPath);
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`, "utf-8");
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8");
  const bodyBuf = Buffer.concat([head, video, tail]);

  const r = await request({
    hostname: "www.googleapis.com",
    path: "/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": bodyBuf.length,
    },
  }, bodyBuf);
  if (r.data && r.data.id) return r.data.id;
  throw new Error("YouTube upload: " + JSON.stringify(r.data).slice(0, 160));
}

// ════════════════════════════════════════════════════════════════════════════
// TIKTOK — opcional (só roda se a chave existir no Secret)
// Caminho PERMANENTE (recomendado): TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET +
//   TIKTOK_REFRESH_TOKEN → o robô troca por um access_token novo a cada post
//   (access_token estático dura só ~24h; o refresh dura ~1 ano).
// Caminho simples (dura ~24h): TIKTOK_TOKEN. TIKTOK_PRIVACY é opcional.
// App sem auditoria da TikTok só permite privacidade "SELF_ONLY" (privado).
// ════════════════════════════════════════════════════════════════════════════

function temChaveTikTok() {
  return process.env.TIKTOK_ENABLED === "true" && !!(process.env.TIKTOK_TOKEN ||
    (process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REFRESH_TOKEN));
}

// Prefere o refresh_token (permanente); cai pro token estático se for o único disponível.
async function tiktokAccessToken() {
  if (process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REFRESH_TOKEN) {
    const body = [
      `client_key=${encodeURIComponent(process.env.TIKTOK_CLIENT_KEY)}`,
      `client_secret=${encodeURIComponent(process.env.TIKTOK_CLIENT_SECRET)}`,
      `grant_type=refresh_token`,
      `refresh_token=${encodeURIComponent(process.env.TIKTOK_REFRESH_TOKEN)}`,
    ].join("&");
    const buf = Buffer.from(body, "utf-8");
    const r = await request({
      hostname: "open.tiktokapis.com",
      path: "/v2/oauth/token/",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": buf.length },
    }, buf);
    if (r.data && r.data.access_token) return r.data.access_token;
    throw new Error("TikTok OAuth: " + JSON.stringify(r.data).slice(0, 140));
  }
  return process.env.TIKTOK_TOKEN;
}

async function publicarTikTok(videoPath, caption) {
  const token = await tiktokAccessToken();
  // Default SELF_ONLY: app não-auditado só posta privado. Após a auditoria,
  // definir o Secret TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE para virar público.
  const privacidade = process.env.TIKTOK_PRIVACY || "SELF_ONLY";
  const size = fs.statSync(videoPath).size;
  const titulo = (caption || "").replace(/\s+/g, " ").slice(0, 150);

  // 1) Iniciar upload por FILE_UPLOAD (não exige domínio verificado)
  const initBody = Buffer.from(JSON.stringify({
    post_info: { title: titulo, privacy_level: privacidade, disable_comment: false },
    source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: size, total_chunk_count: 1 },
  }), "utf-8");
  const init = await request({
    hostname: "open.tiktokapis.com",
    path: "/v2/post/publish/video/init/",
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8", "Content-Length": initBody.length },
  }, initBody);
  const d = init.data && init.data.data;
  if (!d || !d.upload_url) throw new Error("TikTok init: " + JSON.stringify(init.data).slice(0, 160));

  // 2) Enviar os bytes do vídeo para a URL de upload
  const video = fs.readFileSync(videoPath);
  const u = new URL(d.upload_url);
  const up = await request({
    hostname: u.hostname,
    path: u.pathname + u.search,
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": size,
      "Content-Range": `bytes 0-${size - 1}/${size}`,
    },
  }, video);
  if (up.status && up.status >= 400) throw new Error("TikTok upload bytes: HTTP " + up.status);

  // 3) A TikTok processa e publica sozinha; devolvemos o publish_id
  return d.publish_id || "enviado";
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
// ROTAÇÃO — vendas diárias, todas as locações 1x/semana e 2 captações/semana
// ════════════════════════════════════════════════════════════════════════════
const LOCACAO_CODES = new Set(["584", "607", "609", "609B", "619", "620", "CASA INDAIA BERTIOGA", "CASA JARDIM ARMENIA"]);
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

function tipoAgendado() {
  const tipoManual = String(process.env.PUBLICACAO_TIPO || "").toLowerCase();
  if (["venda", "locacao", "captacao", "recuperar_locacao", "auto"].includes(tipoManual)) return tipoManual;

  const agenda = String(process.env.GITHUB_SCHEDULE || "");
  if (agenda === "0 12 * * *") return "venda";
  if (agenda === "0 18 * * *" || agenda === "0 21 * * 1") return "locacao";
  if (agenda === "10 21 * * 3,6") return "captacao";
  if (agenda === "30 22 * * *") return "recuperar_locacao";
  return "auto";
}

// PURO: lê o estado e devolve o próximo código, sem alterar nada.
function escolherProximo(manifest, estado, tipoForcado = "auto") {
  const ordem = manifest.ordem.map(String);
  const locacoes = ordem.filter((c) => LOCACAO_CODES.has(c));
  const vendas = ordem.filter((c) => !LOCACAO_CODES.has(c));
  const brt = new Date(Date.now() - 3 * 3600 * 1000);
  const semana = semanaISO(brt);
  const pubSemana = (estado.publicados || [])
    .filter((p) => { try { return semanaISO(new Date(new Date(p.data).getTime() - 3 * 3600 * 1000)) === semana; } catch { return false; } })
    .map((p) => String(p.codigo));
  const locPendentes = locacoes.filter((c) => !pubSemana.includes(c));

  if (tipoForcado === "recuperar_locacao") {
    const retry = estado.retryLocacao;
    if (retry && retry.semana === semana && retry.codigo) {
      return { codigo: String(retry.codigo), tipo: "locacao", vendaIdx: null, recuperacao: true };
    }
    if (brt.getDay() === 0 && locPendentes.length > 0) {
      return { codigo: locPendentes[0], tipo: "locacao", vendaIdx: null, recuperacao: true };
    }
    return { codigo: null, tipo: "noop", motivo: "nenhum canal de locação pendente para recuperar" };
  }
  if (tipoForcado === "venda") {
    if (vendas.length === 0) return { codigo: null, tipo: "noop", motivo: "nenhuma venda cadastrada" };
    const vi = (estado.indiceVenda || 0) % vendas.length;
    return { codigo: vendas[vi], tipo: "venda", vendaIdx: vi };
  }
  if (tipoForcado === "locacao") {
    if (locPendentes.length === 0) {
      return { codigo: null, tipo: "noop", motivo: `todas as ${locacoes.length} locações já foram publicadas na semana ${semana}` };
    }
    return { codigo: locPendentes[0], tipo: "locacao", vendaIdx: null };
  }
  if (tipoForcado === "captacao") {
    if (CAPTACAO.length === 0) return { codigo: null, tipo: "noop", motivo: "nenhuma captação cadastrada" };
    const ci = (estado.indiceCapt || 0) % CAPTACAO.length;
    return { codigo: CAPTACAO[ci].id, tipo: "captacao", captIdx: ci };
  }

  if (locacoes.length === 0 || vendas.length === 0) {
    const i = (estado.indice || 0) % ordem.length;
    return { codigo: ordem[i], tipo: "seq", vendaIdx: null };
  }
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
  const tipoForcado = tipoAgendado();
  try {
    plano = escolherProximo(manifest, estado, tipoForcado);
  } catch (e) {
    console.log("  ⚠️  Rotação falhou, usando modo sequencial:", e.message);
    const i = (estado.indice || 0) % manifest.ordem.length;
    plano = { codigo: String(manifest.ordem[i]), tipo: "seq", vendaIdx: null };
  }
  console.log(`  Regra agendada: ${tipoForcado}`);
  if (plano.tipo === "noop") {
    console.log(`  ✅ Nenhuma publicação necessária neste horário: ${plano.motivo}.`);
    return;
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
  const dataPublicacao = dataBrasiliaISO();
  let videoPath = null;
  let videoUrl  = urlStory; // fallback = imagem se vídeo falhar
  let trilhaSelecionada = null;
  let modeloSelecionado = null;

  if (ffmpeg) {
    try {
      const emocao = detectarEmocao(caption);
      const chavePublicacao = `${dataPublicacao}|${plano.tipo}|CF-${codigo}`;
      trilhaSelecionada = selecionarTrilha({
        emocao,
        codigo: `CF-${codigo}`,
        chavePublicacao,
      });
      modeloSelecionado = selecionarModeloStory({
        codigo: `CF-${codigo}`,
        chavePublicacao,
      });
      const tipoArquivo = String(plano.tipo).replace(/[^a-z0-9-]/gi, "-");
      const nomeVideo = `CF-${codigo}-story-${dataPublicacao}-${tipoArquivo}-${modeloSelecionado.id}-${trilhaSelecionada.id}.mp4`;
      videoPath = await gerarVideoStory(
        ffmpeg,
        urlStory,
        nomeVideo,
        emocao,
        trilhaSelecionada,
        modeloSelecionado,
      );
      registrarUsoTrilha(trilhaSelecionada, { codigo: `CF-${codigo}`, emocao });
      registrarUsoModelo(modeloSelecionado, { codigo: `CF-${codigo}` });

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
  const reg = {
    codigo,
    data: new Date().toISOString(),
    trilha: trilhaSelecionada?.id || "—",
    modelo_video: modeloSelecionado?.id || "—",
    fb_feed: "—",
    fb_story: "—",
    fb_reel: "—",
    ig_feed: "—",
    ig_story: "—",
    ig_reel: "—",
    youtube: "—",
    tiktok: "—",
  };
  const semanaAtual = semanaISO(new Date(Date.now() - 3 * 3600 * 1000));
  const retryAnterior = plano.tipo === "locacao"
    && estado.retryLocacao?.codigo === codigo
    && estado.retryLocacao?.semana === semanaAtual
      ? estado.retryLocacao.reg
      : null;
  const manterCanalConcluido = (canal) => {
    const valor = retryAnterior?.[canal];
    if (typeof valor === "string" && valor.startsWith("✅")) {
      reg[canal] = valor;
      console.log(`  ${canal}: já concluído na tentativa anterior; não será duplicado.`);
      return true;
    }
    return false;
  };

  if (!manterCanalConcluido("fb_feed")) {
    try {
      reg.fb_feed = "✅ " + await comRetry(() => publicarFeedFacebook(token, urlFeed, caption), "FB Feed");
    } catch (e) { reg.fb_feed = "❌ " + e.message; }
  }
  console.log("  FB Feed :", reg.fb_feed);

  if (!manterCanalConcluido("fb_story")) {
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
  }
  console.log("  FB Story:", reg.fb_story);

  // FB Reel (feed permanente + alcança quem não curte a página) — só quando há vídeo
  if (!manterCanalConcluido("fb_reel")) {
    try {
      if (videoPath) {
        reg.fb_reel = "✅ " + await publicarReelFacebook(token, videoPath, caption);
      } else {
        reg.fb_reel = "— (sem vídeo)";
      }
    } catch (e) { reg.fb_reel = "❌ " + e.message; }
  }
  console.log("  FB Reel :", reg.fb_reel);

  if (!manterCanalConcluido("ig_feed")) {
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
  }
  console.log("  IG Feed :", reg.ig_feed);

  if (!manterCanalConcluido("ig_story")) {
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
  }
  console.log("  IG Story:", reg.ig_story);

  // IG Reel (feed permanente + alcança quem não segue) — só quando há vídeo público
  if (!manterCanalConcluido("ig_reel")) {
    try {
      if (videoPath && videoUrl !== urlStory) {
        reg.ig_reel = "✅ " + await publicarReelInstagram(token, videoUrl, caption);
      } else {
        reg.ig_reel = "— (sem vídeo)";
      }
    } catch (e) { reg.ig_reel = "❌ " + e.message; }
  }
  console.log("  IG Reel :", reg.ig_reel);

  // YouTube Short (opcional — só quando há chaves + vídeo). Inativo até colar o Secret.
  if (!manterCanalConcluido("youtube")) {
    try {
      if (temChavesYouTube() && videoPath) {
        reg.youtube = "✅ " + await publicarYouTubeShort(videoPath, caption);
      } else {
        reg.youtube = temChavesYouTube() ? "— (sem vídeo)" : "— (sem chave YT)";
      }
    } catch (e) { reg.youtube = "❌ " + e.message; }
  }
  console.log("  YouTube :", reg.youtube);

  // TikTok (opcional — só quando há chave + vídeo). Inativo até colar o Secret.
  if (!manterCanalConcluido("tiktok")) {
    try {
      if (process.env.TIKTOK_ENABLED !== "true") {
        reg.tiktok = "— (TikTok pausado)";
      } else if (temChaveTikTok() && videoPath) {
        reg.tiktok = "✅ " + await publicarTikTok(videoPath, caption);
      } else {
        reg.tiktok = temChaveTikTok() ? "— (sem vídeo)" : "— (sem chave TikTok)";
      }
    } catch (e) { reg.tiktok = "❌ " + e.message; }
  }
  console.log("  TikTok  :", reg.tiktok);

  // ── Avançar fila ──────────────────────────────────────────────────────────
  const algumOk = Object.values(reg).some((v) => typeof v === "string" && v.startsWith("✅"));
  const canaisObrigatorios = ["fb_feed", "fb_story", "ig_feed", "ig_story"];
  const locacaoCompleta = canaisObrigatorios.every((canal) => reg[canal].startsWith("✅"));
  const publicacaoCompleta = plano.tipo === "locacao" ? locacaoCompleta : algumOk;
  const tentativasLocacao = retryAnterior ? (estado.retryLocacao?.tentativas || 0) : 0;
  const atingiuLimite = plano.tipo === "locacao" ? tentativasLocacao >= 2 : (estado.tentativas || 0) >= 2;
  estado.tentativas = estado.tentativas || 0;

  if (publicacaoCompleta || atingiuLimite) {
    if (!publicacaoCompleta) {
      const totalTentativas = plano.tipo === "locacao" ? tentativasLocacao + 1 : estado.tentativas + 1;
      const canaisPendentes = plano.tipo === "locacao"
        ? canaisObrigatorios.filter((canal) => !reg[canal].startsWith("✅")).join(", ")
        : "todos os canais";
      reg.observacao = `pulado após ${totalTentativas} tentativas; pendentes: ${canaisPendentes}`;
      enviarAlerta(`❌ CF-${codigo} FALHOU`, `Canais pendentes após ${totalTentativas} tentativas: ${canaisPendentes}.`, 5);
    } else {
      const canaisOk = ["fb_feed","fb_story","fb_reel","ig_feed","ig_story","ig_reel","youtube","tiktok"].filter((k) => reg[k].startsWith("✅")).join(", ");
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
    delete estado.ultimaFalha;
    if (plano.tipo === "locacao") delete estado.retryLocacao;
  } else {
    if (plano.tipo === "locacao") {
      const canaisPendentes = canaisObrigatorios.filter((canal) => !reg[canal].startsWith("✅"));
      estado.retryLocacao = {
        codigo,
        semana: semanaAtual,
        tentativas: tentativasLocacao + 1,
        reg,
      };
      enviarAlerta(`⚠️ CF-${codigo}: recuperar locação`, `Tentativa ${tentativasLocacao + 1}/3. Pendentes: ${canaisPendentes.join(", ")}`, 4);
      console.log(`\n⚠️  Locação incompleta. Tentativa ${tentativasLocacao + 1}/3; pendentes: ${canaisPendentes.join(", ")}.`);
    } else {
      estado.tentativas += 1;
      estado.ultimaFalha = reg;
      enviarAlerta(`⚠️ CF-${codigo} falhou (tentativa ${estado.tentativas}/3)`, JSON.stringify(reg).slice(0, 200), 4);
      console.log(`\n⚠️  Nenhum canal publicou. Tentativa ${estado.tentativas}/3.`);
    }
  }

  // ── Salvar estado ─────────────────────────────────────────────────────────
  fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
  fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 2), "utf-8");

  let proximo = "(próxima execução)";
  try { proximo = escolherProximo(manifest, estado, "auto").codigo; } catch {}
  console.log(`\n📊 Estado salvo. Próximo previsto: CF-${proximo}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error("❌ Erro fatal:", e.message);
    enviarAlerta("❌ ROBÔ PAROU", e.message, 5);
    process.exit(1);
  });
}

module.exports = { semanaISO, tipoAgendado, escolherProximo };
