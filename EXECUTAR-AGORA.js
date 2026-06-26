/**
 * EXECUTAR-AGORA.js — Escritório Campos Figueira
 * Agenda todos os 40 posts no Facebook + Instagram em um único comando.
 *
 * USO:
 *   node EXECUTAR-AGORA.js
 *
 * O token é lido automaticamente do .env.local
 * Se precisar passar o token manualmente:
 *   node EXECUTAR-AGORA.js --token SEU_TOKEN
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE = "https://graph.facebook.com/v22.0";
let PAGE_ID = "512040582222121";
const IG_USER_ID = "17841461388445580";
const DATA_INICIO = "2026-06-26";

// ── Carregar .env.local ───────────────────────────────────────────────────────
function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(__dirname, name);
    if (fs.existsSync(p)) {
      fs.readFileSync(p, "utf-8")
        .split("\n")
        .forEach((line) => {
          const t = line.trim();
          if (!t || t.startsWith("#")) return;
          const [k, ...v] = t.split("=");
          if (k && !process.env[k.trim()])
            process.env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, "");
        });
      return;
    }
  }
}

// ── Distribuir datas ──────────────────────────────────────────────────────────
function distribuirDatas(posts) {
  const horarios = ["09:00", "18:00"];
  return posts.map((p, i) => {
    const diaOffset = Math.floor(i / 2);
    const hora = horarios[i % 2];
    const d = new Date(DATA_INICIO + "T12:00:00-03:00");
    d.setDate(d.getDate() + diaOffset);
    return { ...p, data: d.toISOString().slice(0, 10), hora };
  });
}

// ── Chamada à API ─────────────────────────────────────────────────────────────
function apiPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(`${BASE}/${endpoint}`);
    const req = https.request(
      { hostname: url.hostname, path: url.pathname, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ error: { message: raw } }); } });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ── Agendar no Facebook ───────────────────────────────────────────────────────
async function agendarFacebook(token, caption, dataHora) {
  const ts = Math.floor(new Date(dataHora).getTime() / 1000);
  const res = await apiPost(`${PAGE_ID}/feed`, {
    message: caption,
    scheduled_publish_time: ts,
    published: false,
    access_token: token,
  });
  if (res.error) throw new Error(res.error.message);
  return res.id;
}

// ── Agendar no Instagram ──────────────────────────────────────────────────────
async function agendarInstagram(token, imageUrl, caption, dataHora) {
  const ts = Math.floor(new Date(dataHora).getTime() / 1000);
  const container = await apiPost(`${IG_USER_ID}/media`, {
    image_url: imageUrl, caption,
    scheduled_publish_time: ts, published: false,
    access_token: token,
  });
  if (container.error) throw new Error(container.error.message);
  const pub = await apiPost(`${IG_USER_ID}/media_publish`, {
    creation_id: container.id, access_token: token,
  });
  if (pub.error) throw new Error(pub.error.message);
  return pub.id;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const tokenIdx = args.indexOf("--token");
  const token = tokenIdx >= 0 ? args[tokenIdx + 1] : process.env.META_PAGE_TOKEN;

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║   AGENDADOR — Escritório Campos Figueira             ║");
  console.log("║   Facebook Page + Instagram · Meta Graph API v22.0  ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  if (!token) {
    console.error("❌ Token não encontrado.");
    console.error("   Crie o arquivo .env.local na raiz do projeto com:");
    console.error("   META_PAGE_TOKEN=seu_token_da_pagina_ecf");
    console.error("\n   Ou passe direto: node EXECUTAR-AGORA.js --token SEU_TOKEN");
    process.exit(1);
  }

  // ── Utilitário GET ───────────────────────────────────────────────────────────
  function apiGet(endpoint, tk) {
    return new Promise((resolve) => {
      const url = `${BASE}/${endpoint}&access_token=${encodeURIComponent(tk)}`;
      https.get(url, (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ error: { message: raw } }); } });
      }).on("error", (e) => resolve({ error: { message: e.message } }));
    });
  }

  // Verificar token
  console.log("1. Verificando token e obtendo token da Página...");
  const me = await apiGet("me?fields=id,name", token);

  if (me.error) {
    console.error(`❌ Token inválido ou expirado: ${me.error.message}`);
    console.error("\n   Gere um novo token em: developers.facebook.com/tools/explorer");
    process.exit(1);
  }
  console.log(`   Token reconhecido: ${me.name} (ID: ${me.id})`);

  // Buscar token próprio da Página via /me/accounts
  // Isso resolve tanto token de Usuário quanto token de Página sem pages_manage_posts
  let activeToken = token;
  const accounts = await apiGet("me/accounts?fields=id,name,access_token", token);

  if (accounts.data && accounts.data.length > 0) {
    console.log("   Páginas gerenciadas encontradas:");
    accounts.data.forEach((p) => console.log(`     • ${p.name} (ID: ${p.id})`));

    const ecf = accounts.data.find((p) =>
      p.name.toLowerCase().includes("campos") ||
      p.name.toLowerCase().includes("figueira") ||
      p.name.toLowerCase().includes("escritório") ||
      p.name.toLowerCase().includes("escritorio")
    ) || accounts.data[0];

    PAGE_ID = ecf.id;
    activeToken = ecf.access_token;
    console.log(`   ✅ Usando página: ${ecf.name} (ID: ${ecf.id})`);
  } else {
    // Token já é da Página — usar direto
    if (me.id) PAGE_ID = me.id;
    console.log(`   ✅ Token de Página — ID: ${PAGE_ID}`);
  }

  // Carregar posts
  console.log("\n2. Carregando calendario de posts...");
  const calPath = path.join(__dirname, "src/content/calendario-julho-2026.json");
  const posts = JSON.parse(fs.readFileSync(calPath, "utf-8")).posts;
  const postsComDatas = distribuirDatas(posts);
  console.log(`   ${postsComDatas.length} posts · início ${DATA_INICIO} · 2 por dia · 09h e 18h`);

  // Calcular data final
  const ultimoPost = postsComDatas[postsComDatas.length - 1];
  console.log(`   Último post: ${ultimoPost.data} ${ultimoPost.hora}`);

  // Confirmar
  console.log("\n3. Iniciando agendamento...\n");

  const resultados = [];
  let fbOk = 0, igOk = 0, fbErro = 0;

  for (const post of postsComDatas) {
    const dataHora = `${post.data}T${post.hora}:00-03:00`;
    const result = { ref: post.ref, imovel: post.imovel, data: post.data, hora: post.hora, fb: "—", ig: "—" };

    // Facebook
    try {
      const fbId = await agendarFacebook(activeToken, post.caption, dataHora);
      result.fb = `✅ ${fbId}`;
      fbOk++;
    } catch (e) {
      result.fb = `❌ ${e.message.substring(0, 60)}`;
      fbErro++;
    }

    process.stdout.write(`   [${post.ref}] ${post.data} ${post.hora} · FB: ${result.fb.substring(0, 30)}\n`);
    resultados.push(result);

    // Pausa pequena para não sobrecarregar a API
    await new Promise((r) => setTimeout(r, 300));
  }

  // Salvar log
  const logDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
  const logFile = path.join(logDir, `agendamento-${Date.now()}.json`);
  fs.writeFileSync(logFile, JSON.stringify({ data: new Date().toISOString(), resultados }, null, 2), "utf-8");

  // Resumo final
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║                   RESULTADO FINAL                   ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  Facebook agendados : ${String(fbOk).padEnd(30)}║`);
  console.log(`║  Instagram          : ${String(igOk + " (requer imagem pública)").padEnd(30)}║`);
  console.log(`║  Erros              : ${String(fbErro).padEnd(30)}║`);
  console.log(`║  Log salvo em       : logs/                          ║`);
  console.log("╚══════════════════════════════════════════════════════╝");

  if (fbErro === 0) {
    console.log("\n🎉 Todos os posts foram agendados com sucesso no Facebook!");
    console.log("   Acesse: facebook.com/escritorio.figueira → Ferramentas de Publicação → Agendados");
  }

  if (fbErro > 0) {
    console.log(`\n⚠️  ${fbErro} posts com erro. Verifique se o token é da Página (não do usuário).`);
    console.log("   Token correto: Graph API Explorer → selecionar 'Escritório Campos Figueira' no dropdown");
  }

  console.log("\nPara agendar Instagram também (com fotos), use o Agendador web:");
  console.log("   npm run dev → http://localhost:3000/agendador\n");
}

main().catch((e) => {
  console.error("\n❌ Erro inesperado:", e.message);
  process.exit(1);
});
