/**
 * publicar-youtube.js — Escritório Campos Figueira
 * Módulo INDEPENDENTE (não altera o publicar-servidor.js — evita conflito com o Codex).
 * Publica um SHORT no YouTube via Data API v3 (videos.insert, upload resumable).
 * Vídeo vertical 9:16 < 60s vira Short automaticamente.
 * Reaproveita o mesmo vídeo do robô: public/videos/CF-<cod>-story.mp4.
 *
 * Secrets necessários (GitHub Actions ou .env.local):
 *   YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
 *
 * Cota: cada upload custa 1.600 unidades (limite diário padrão 10.000 → ~6/dia).
 *
 * COMO PLUGAR no publicar-servidor.js (o Codex faz, 2 linhas):
 *   const youtube = require("./publicar-youtube");
 *   registro.yt_short = "✅ " + await youtube.postarShortYouTube(videoPathLocal, titulo, descricao, ["imoveis","mogidascruzes"]);
 */

"use strict";
const https = require("https");
const fs = require("fs");
const { URL } = require("url");

// Renova o access_token via refresh_token (OAuth do Google).
async function obterAccessToken() {
  const id = process.env.YT_CLIENT_ID;
  const secret = process.env.YT_CLIENT_SECRET;
  const refresh = process.env.YT_REFRESH_TOKEN;
  if (!id || !secret || !refresh) throw new Error("Secrets do YouTube ausentes (YT_CLIENT_ID/SECRET/REFRESH_TOKEN).");

  const body = `client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}` +
    `&refresh_token=${encodeURIComponent(refresh)}&grant_type=refresh_token`;
  const buf = Buffer.from(body, "utf-8");
  const r = await new Promise((resolve) => {
    const req = https.request({
      hostname: "oauth2.googleapis.com", path: "/token", method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": buf.length },
    }, (res) => {
      const chunks = []; res.on("data", (c) => chunks.push(c));
      res.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve({}); } });
    });
    req.on("error", () => resolve({}));
    req.write(buf); req.end();
  });
  if (!r.access_token) throw new Error("YouTube OAuth falhou: " + JSON.stringify(r).slice(0, 160));
  return r.access_token;
}

/**
 * Publica um Short. `videoPath` é um arquivo LOCAL (ex: public/videos/CF-429-story.mp4).
 * Retorna o videoId publicado.
 */
async function postarShortYouTube(videoPath, titulo, descricao, tags = []) {
  if (!fs.existsSync(videoPath)) throw new Error("Vídeo não encontrado: " + videoPath);
  const token = await obterAccessToken();
  const tamanho = fs.statSync(videoPath).size;

  const metadata = {
    snippet: {
      title: (titulo || "Imóvel — Escritório Campos Figueira").slice(0, 100),
      description: (descricao || "") + "\n\n#Shorts " + tags.map((t) => "#" + t).join(" "),
      tags: ["imoveis", "mogidascruzes", "imovel", ...tags].slice(0, 15),
      categoryId: "22", // People & Blogs
    },
    status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
  };
  const metaBuf = Buffer.from(JSON.stringify(metadata), "utf-8");

  // Passo 1: iniciar sessão resumable → pega a URL de upload no header Location.
  const uploadUrl = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "www.googleapis.com",
      path: "/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": metaBuf.length,
        "X-Upload-Content-Type": "video/*",
        "X-Upload-Content-Length": tamanho,
      },
    }, (res) => {
      if (res.statusCode === 200 && res.headers.location) resolve(res.headers.location);
      else { let raw = ""; res.on("data", (c) => (raw += c)); res.on("end", () => reject(new Error("YT init falhou: " + res.statusCode + " " + raw.slice(0, 200)))); }
    });
    req.on("error", reject);
    req.write(metaBuf); req.end();
  });

  // Passo 2: enviar os bytes do vídeo (PUT) para a URL de upload.
  const u = new URL(uploadUrl);
  const videoData = fs.readFileSync(videoPath);
  const result = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: "PUT",
      headers: { "Content-Type": "video/*", "Content-Length": videoData.length },
    }, (res) => {
      let raw = ""; res.on("data", (c) => (raw += c));
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ raw, status: res.statusCode }); } });
    });
    req.on("error", reject);
    req.write(videoData); req.end();
  });

  if (result.id) return result.id;
  throw new Error("YT upload falhou: " + JSON.stringify(result).slice(0, 200));
}

module.exports = { postarShortYouTube, obterAccessToken };

// Teste manual: node scripts/publicar-youtube.js public/videos/CF-429-story.mp4 "Título"
if (require.main === module) {
  const [, , videoPath, titulo] = process.argv;
  if (!videoPath) { console.log("Uso: node scripts/publicar-youtube.js <caminho .mp4> [titulo]"); process.exit(0); }
  postarShortYouTube(videoPath, titulo || "Teste CF", "Descrição de teste", ["casapropria"])
    .then((id) => console.log("videoId:", id))
    .catch((e) => { console.error("Erro:", e.message); process.exit(1); });
}
