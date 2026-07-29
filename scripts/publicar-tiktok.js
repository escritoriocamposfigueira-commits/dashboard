/**
 * publicar-tiktok.js — Escritório Campos Figueira
 * Módulo INDEPENDENTE (não altera o publicar-servidor.js — evita conflito com o Codex).
 * Publica no TikTok via Content Posting API v2 (Direct Post):
 *   • VÍDEO  (reaproveita public/videos/CF-<cod>-story.mp4 → URL raw do GitHub)
 *   • CARROSSEL de fotos (reaproveita as imagens 4:5 já salvas → urls_feed)
 *
 * Secrets necessários (GitHub Actions ou .env.local):
 *   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN
 *   TIKTOK_PRIVACY (opcional: PUBLIC_TO_EVERYONE | SELF_ONLY | MUTUAL_FOLLOW_FRIENDS)
 *
 * ⚠️ PULL_FROM_URL exige o domínio verificado no painel do app do TikTok
 *    (verifique "raw.githubusercontent.com" em URL properties). Sem isso, a Meta/TikTok
 *    recusa a URL. Enquanto o app não passar pela auditoria, use privacy SELF_ONLY.
 *
 * COMO PLUGAR no publicar-servidor.js (o Codex faz isso, 2 linhas):
 *   const tiktok = require("./publicar-tiktok");
 *   registro.tiktok = "✅ " + await tiktok.postarVideoTikTok(videoUrl, caption);
 *   // ou, para carrossel:
 *   registro.tiktok = "✅ " + await tiktok.postarCarrosselTikTok(urlsFeedDoImovel, caption);
 */

"use strict";
const https = require("https");

const OAUTH_HOST = "open.tiktokapis.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function httpJson(host, path, method, headers, bodyObj) {
  return new Promise((resolve) => {
    const buf = bodyObj ? Buffer.from(JSON.stringify(bodyObj), "utf-8") : null;
    const h = { ...headers };
    if (buf) { h["Content-Type"] = "application/json; charset=utf-8"; h["Content-Length"] = buf.length; }
    const req = https.request({ hostname: host, path, method, headers: h }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: { raw } }); }
      });
    });
    req.on("error", (e) => resolve({ status: 0, data: { error: { message: e.message } } }));
    if (buf) req.write(buf);
    req.end();
  });
}

// Renova o access_token (o do TikTok expira a cada 24h) usando o refresh_token.
async function obterAccessToken() {
  const key = process.env.TIKTOK_CLIENT_KEY;
  const secret = process.env.TIKTOK_CLIENT_SECRET;
  const refresh = process.env.TIKTOK_REFRESH_TOKEN;
  if (!key || !secret || !refresh) throw new Error("Secrets do TikTok ausentes (TIKTOK_CLIENT_KEY/SECRET/REFRESH_TOKEN).");

  const body = `client_key=${encodeURIComponent(key)}&client_secret=${encodeURIComponent(secret)}` +
    `&grant_type=refresh_token&refresh_token=${encodeURIComponent(refresh)}`;
  const buf = Buffer.from(body, "utf-8");
  const r = await new Promise((resolve) => {
    const req = https.request({
      hostname: OAUTH_HOST, path: "/v2/oauth/token/", method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": buf.length },
    }, (res) => {
      const chunks = []; res.on("data", (c) => chunks.push(c));
      res.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve({}); } });
    });
    req.on("error", () => resolve({}));
    req.write(buf); req.end();
  });
  if (!r.access_token) throw new Error("TikTok OAuth falhou: " + JSON.stringify(r).slice(0, 160));
  return r.access_token;
}

const PRIVACY = () => process.env.TIKTOK_PRIVACY || "PUBLIC_TO_EVERYONE";

// Aguarda o processamento do post (status) — opcional, apenas loga.
async function aguardarStatus(token, publishId) {
  for (let i = 0; i < 10; i++) {
    await sleep(3000);
    const r = await httpJson(OAUTH_HOST, "/v2/post/publish/status/fetch/", "POST",
      { "Authorization": `Bearer ${token}` }, { publish_id: publishId });
    const st = r.data && r.data.data && r.data.data.status;
    if (st === "PUBLISH_COMPLETE") return true;
    if (st === "FAILED") throw new Error("TikTok status FAILED: " + JSON.stringify(r.data));
  }
  return true; // segue mesmo se ainda processando
}

/** Publica um VÍDEO no TikTok (Direct Post) a partir de uma URL pública (raw do GitHub). */
async function postarVideoTikTok(videoUrl, caption) {
  const token = await obterAccessToken();
  const r = await httpJson(OAUTH_HOST, "/v2/post/publish/video/init/", "POST",
    { "Authorization": `Bearer ${token}` },
    {
      post_info: {
        title: (caption || "").slice(0, 2200),
        privacy_level: PRIVACY(),
        disable_comment: false, disable_duet: false, disable_stitch: false,
      },
      source_info: { source: "PULL_FROM_URL", video_url: videoUrl },
    });
  const pid = r.data && r.data.data && r.data.data.publish_id;
  if (!pid) throw new Error("TikTok vídeo init falhou: " + JSON.stringify(r.data).slice(0, 200));
  await aguardarStatus(token, pid);
  return pid;
}

/** Publica um CARROSSEL de fotos no TikTok (Direct Post) a partir de URLs públicas. */
async function postarCarrosselTikTok(imageUrls, caption, coverIndex = 0) {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) throw new Error("TikTok carrossel: sem imagens.");
  const token = await obterAccessToken();
  const r = await httpJson(OAUTH_HOST, "/v2/post/publish/content/init/", "POST",
    { "Authorization": `Bearer ${token}` },
    {
      media_type: "PHOTO",
      post_mode: "DIRECT_POST",
      post_info: {
        title: (caption || "").split("\n")[0].slice(0, 90),
        description: (caption || "").slice(0, 2200),
        privacy_level: PRIVACY(),
        disable_comment: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: coverIndex,
        photo_images: imageUrls.slice(0, 35), // TikTok aceita até 35 fotos
      },
    });
  const pid = r.data && r.data.data && r.data.data.publish_id;
  if (!pid) throw new Error("TikTok carrossel init falhou: " + JSON.stringify(r.data).slice(0, 200));
  await aguardarStatus(token, pid);
  return pid;
}

module.exports = { postarVideoTikTok, postarCarrosselTikTok, obterAccessToken };

// Teste manual: node scripts/publicar-tiktok.js <video_url_ou_imagem>
if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) { console.log("Uso: node scripts/publicar-tiktok.js <URL do vídeo (mp4) OU URL de imagem>"); process.exit(0); }
  (async () => {
    try {
      if (/\.mp4$/i.test(arg)) console.log("publish_id:", await postarVideoTikTok(arg, "Teste CF"));
      else console.log("publish_id:", await postarCarrosselTikTok([arg], "Teste CF carrossel"));
    } catch (e) { console.error("Erro:", e.message); process.exit(1); }
  })();
}
