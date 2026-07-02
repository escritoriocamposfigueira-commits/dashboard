/**
 * publicar-story-video.js — Publica um story em VÍDEO no Instagram e Facebook
 *
 * Uso:
 *   node scripts/publicar-story-video.js <codigo-imovel> [--gerar]
 *
 * --gerar: gera o vídeo antes de publicar (requer gerar-video-story.js + FFmpeg)
 *
 * Sem --gerar: usa o vídeo já existente em public/videos/CF-XXX-story.mp4
 * e assume que ele já está no GitHub com URL pública.
 *
 * URL pública no GitHub:
 *   https://raw.githubusercontent.com/escritoriocamposfigueira-commits/dashboard/
 *   claude/campos-figueira-growth-qmjsux/public/videos/CF-XXX-story.mp4
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const RAIZ = path.join(__dirname, "..");

// Carrega .env.local
function carregarEnv() {
  const p = path.join(RAIZ, ".env.local");
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, "utf-8").split("\n").forEach((l) => {
    const m = l.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  });
}
carregarEnv();

const BASE_HOST = "graph.facebook.com";
const BASE_PATH = "/v22.0";
const PAGE_ID = "512040582222121";
const IG_USER_ID = "17841461388445580";

// Branch onde os vídeos ficam após o push
const GITHUB_BRANCH = "claude/campos-figueira-growth-qmjsux";
const GITHUB_REPO = "escritoriocamposfigueira-commits/dashboard";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function apiPost(endpoint, body) {
  return new Promise((resolve) => {
    const data = Buffer.from(JSON.stringify(body), "utf-8");
    const req = https.request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/${endpoint}`,
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Length": data.length },
    }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ error: { message: raw } }); } });
    });
    req.on("error", (e) => resolve({ error: { message: e.message } }));
    req.write(data);
    req.end();
  });
}

function apiGet(endpoint) {
  return new Promise((resolve) => {
    https.get({ hostname: BASE_HOST, path: `${BASE_PATH}/${endpoint}` }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ error: { message: raw } }); } });
    }).on("error", (e) => resolve({ error: { message: e.message } }));
  });
}

// ── Instagram Story (vídeo) ───────────────────────────────────────────────────
async function publicarVideoStoryInstagram(token, videoUrl) {
  console.log("  [IG Story] Criando container de vídeo...");
  const cont = await apiPost(`${IG_USER_ID}/media`, {
    video_url: videoUrl,
    media_type: "STORIES",
    access_token: token,
  });
  if (cont.error) throw new Error("IG Story container: " + cont.error.message);
  console.log(`  [IG Story] Container criado: ${cont.id} — aguardando processamento...`);

  // Aguardar até FINISHED (máx 60s)
  for (let i = 0; i < 24; i++) {
    await sleep(2500);
    const st = await apiGet(`${cont.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`);
    process.stdout.write(`  [IG Story] Status: ${st.status_code} (${i + 1}/24)\r`);
    if (st.status_code === "FINISHED") { process.stdout.write("\n"); break; }
    if (st.status_code === "ERROR") throw new Error("IG Story container ERROR: " + JSON.stringify(st));
  }

  const pub = await apiPost(`${IG_USER_ID}/media_publish`, { creation_id: cont.id, access_token: token });
  if (pub.error) throw new Error("IG Story publish: " + pub.error.message);
  return pub.id;
}

// ── Facebook Story (vídeo — protocolo rupload.facebook.com) ──────────────────
async function publicarVideoStoryFacebook(token, videoLocalPath) {
  console.log("  [FB Story] Iniciando upload de vídeo...");
  const fileSize = fs.statSync(videoLocalPath).size;

  // Passo 1: Inicializar — GET video_id e start_offset
  const init = await apiPost(`${PAGE_ID}/video_stories`, {
    upload_phase: "start",
    file_size: fileSize,
    access_token: token,
  });
  if (init.error) throw new Error("FB Story init: " + init.error.message);
  const videoId = init.video_id;
  console.log(`  [FB Story] video_id: ${videoId} (${Math.round(fileSize / 1024)}KB)`);

  // Passo 2: Enviar binário para rupload.facebook.com
  const videoData = fs.readFileSync(videoLocalPath);
  const uploadResult = await new Promise((resolve) => {
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
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ success: raw.includes("success") || res.statusCode === 200, raw }); }
      });
    });
    req.on("error", (e) => resolve({ error: { message: e.message } }));
    req.write(videoData);
    req.end();
  });
  if (uploadResult.error) throw new Error("FB Story upload binário: " + uploadResult.error.message);
  console.log(`  [FB Story] Binário enviado OK.`);

  // Passo 3: Finalizar e publicar como Story
  await new Promise((r) => setTimeout(r, 2000));
  const finish = await apiPost(`${PAGE_ID}/video_stories`, {
    upload_phase: "finish",
    video_id: videoId,
    access_token: token,
  });
  if (finish.error) throw new Error("FB Story finish: " + finish.error.message);
  return finish.post_id || finish.id || videoId;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const codigo = args[0];
  const gerar = args.includes("--gerar");

  if (!codigo) {
    console.log("Uso: node scripts/publicar-story-video.js <codigo> [--gerar]");
    process.exit(0);
  }

  const token = process.env.META_PAGE_TOKEN;
  if (!token) { console.error("❌ META_PAGE_TOKEN não definido."); process.exit(1); }

  const videoLocal = path.join(RAIZ, "public/videos", `CF-${codigo}-story.mp4`);

  // Gerar vídeo se solicitado ou se não existir
  if (gerar || !fs.existsSync(videoLocal)) {
    console.log(`\n🎬 Gerando vídeo para CF-${codigo}...`);
    execSync(`node "${path.join(__dirname, "gerar-video-story.js")}" ${codigo}`, {
      stdio: "inherit",
      env: { ...process.env, PATH: `C:\\Users\\Henrique\\ffmpeg\\bin;${process.env.PATH}` },
    });

    // Commitar e fazer push para ter URL pública
    console.log(`\n📤 Fazendo push do vídeo para GitHub...`);
    execSync(`git add "${videoLocal}"`, { cwd: RAIZ });
    execSync(`git commit -m "Vídeo story CF-${codigo} gerado automaticamente"`, { cwd: RAIZ });
    execSync(`git push origin ${GITHUB_BRANCH}`, { cwd: RAIZ });
  }

  const nomeArquivo = `CF-${codigo}-story.mp4`;
  const videoUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/refs/heads/${GITHUB_BRANCH}/public/videos/${nomeArquivo}`;
  console.log(`\n▶ Publicando story em vídeo — CF-${codigo}`);
  console.log(`  URL: ${videoUrl}`);
  console.log(`  Tamanho local: ${Math.round(fs.statSync(videoLocal).size / 1024)}KB\n`);

  let igStoryId = null;
  let fbStoryId = null;

  // Instagram Story (vídeo)
  try {
    igStoryId = await publicarVideoStoryInstagram(token, videoUrl);
    console.log(`\n  ✅ IG Story vídeo: ${igStoryId}`);
  } catch (e) {
    console.log(`\n  ❌ IG Story: ${e.message}`);
  }

  // Facebook Story (vídeo — passa caminho local para upload multipart)
  try {
    fbStoryId = await publicarVideoStoryFacebook(token, videoLocal);
    console.log(`  ✅ FB Story vídeo: ${fbStoryId}`);
  } catch (e) {
    console.log(`  ❌ FB Story: ${e.message}`);
  }

  console.log("\n🎬 Teste concluído!");
  if (igStoryId || fbStoryId) {
    console.log("✅ Story em vídeo com música publicado com sucesso.");
    console.log("   Verifique no Instagram/Facebook que o vídeo aparece com o zoom suave e a trilha.");
  } else {
    console.log("❌ Nenhum canal publicou. Verifique os erros acima.");
  }
}

main().catch((e) => { console.error("❌ Erro fatal:", e.message); process.exit(1); });
