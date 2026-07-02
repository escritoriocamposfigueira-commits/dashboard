/**
 * publicar-agora.js — Publica o próximo imóvel da fila AGORA (sem esperar o cron)
 *
 * Uso: node scripts/publicar-agora.js
 * Requer: META_PAGE_TOKEN em .env.local ou variável de ambiente
 *
 * Útil para recuperar a fila após pausa ou testar uma publicação.
 */

// Carrega .env.local no Windows sem dotenv
const fs = require("fs");
const path = require("path");
const https = require("https");

const RAIZ = path.join(__dirname, "..");

// Carrega .env.local manualmente (sem dependências externas)
function carregarEnv() {
  const envPath = path.join(RAIZ, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const linhas = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const linha of linhas) {
    const match = linha.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const chave = match[1].trim();
      const valor = match[2].trim();
      if (!process.env[chave]) process.env[chave] = valor;
    }
  }
}
carregarEnv();

const BASE_HOST = "graph.facebook.com";
const BASE_PATH = "/v22.0";
let PAGE_ID = "512040582222121";
let IG_USER_ID = "17841461388445580";

const MANIFEST = path.join(RAIZ, "src/content/imagens-urls.json");
const CAPTIONS = path.join(RAIZ, "src/content/captions-imoveis.json");
const ESTADO = path.join(RAIZ, "controle/estado-publicacao.json");

// Alertar.js para notificações (se disponível)
let alertar;
try { alertar = require("./alertar"); } catch { alertar = null; }

// ── HTTP helper (UTF-8 nativo do Node.js) ────────────────────────────────────
function apiGet(endpoint) {
  return new Promise((resolve) => {
    https.get({ hostname: BASE_HOST, path: `${BASE_PATH}/${endpoint}` }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ error: { message: raw } }); } });
    }).on("error", (e) => resolve({ error: { message: e.message } }));
  });
}

function apiPost(endpoint, body) {
  return new Promise((resolve) => {
    // Buffer.from garante UTF-8 correto para caracteres especiais (acentos, emojis)
    const data = Buffer.from(JSON.stringify(body), "utf-8");
    const req = https.request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/${endpoint}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": data.length,
      },
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Facebook Feed ────────────────────────────────────────────────────────────
async function publicarFeedFacebook(token, url, caption) {
  const r = await apiPost(`${PAGE_ID}/photos`, { url, caption, access_token: token });
  if (r.error) throw new Error("FB Feed: " + r.error.message);
  return r.post_id || r.id;
}

// ── Facebook Story ───────────────────────────────────────────────────────────
async function publicarStoryFacebook(token, url) {
  const foto = await apiPost(`${PAGE_ID}/photos`, { url, published: false, access_token: token });
  if (foto.error) throw new Error("FB Story (foto): " + foto.error.message);
  const story = await apiPost(`${PAGE_ID}/photo_stories`, { photo_id: foto.id, access_token: token });
  if (story.error) throw new Error("FB Story (publish): " + story.error.message);
  return story.post_id || story.id || foto.id;
}

// ── Instagram Feed ────────────────────────────────────────────────────────────
async function publicarFeedInstagram(token, urlFeed, caption) {
  const cont = await apiPost(`${IG_USER_ID}/media`, { image_url: urlFeed, caption, access_token: token });
  if (cont.error) throw new Error("IG Feed (container): " + cont.error.message);
  for (let i = 0; i < 12; i++) {
    await sleep(2500);
    const st = await apiGet(`${cont.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("IG Feed: container ERROR");
  }
  const pub = await apiPost(`${IG_USER_ID}/media_publish`, { creation_id: cont.id, access_token: token });
  if (pub.error) throw new Error("IG Feed (publish): " + pub.error.message);
  return pub.id;
}

// ── Instagram Story ───────────────────────────────────────────────────────────
async function publicarStoryInstagram(token, url) {
  const cont = await apiPost(`${IG_USER_ID}/media`, { image_url: url, media_type: "STORIES", access_token: token });
  if (cont.error) throw new Error("IG Story (container): " + cont.error.message);
  for (let i = 0; i < 12; i++) {
    await sleep(2500);
    const st = await apiGet(`${cont.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("IG Story: container ERROR");
  }
  const pub = await apiPost(`${IG_USER_ID}/media_publish`, { creation_id: cont.id, access_token: token });
  if (pub.error) throw new Error("IG Story (publish): " + pub.error.message);
  return pub.id;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const tokenInicial = process.env.META_PAGE_TOKEN;
  if (!tokenInicial) {
    console.error("❌ META_PAGE_TOKEN não definido. Adicione em .env.local ou defina a variável.");
    process.exit(1);
  }

  // Resolver IDs da página e Instagram via accounts
  let token = tokenInicial;
  const accounts = await apiGet(`me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(tokenInicial)}`);
  if (accounts.data && accounts.data.length > 0) {
    const ecf = accounts.data.find((p) => /campos|figueira|escrit/i.test(p.name)) || accounts.data[0];
    PAGE_ID = ecf.id;
    token = ecf.access_token;
    if (ecf.instagram_business_account?.id) IG_USER_ID = ecf.instagram_business_account.id;
    console.log(`✅ Página: ${ecf.name} (${ecf.id}) · IG: ${IG_USER_ID}`);
  } else {
    // Token já é page token — funciona diretamente
    console.log(`✅ Page Token direto · Página: ${PAGE_ID} · IG: ${IG_USER_ID}`);
  }

  if (!fs.existsSync(MANIFEST)) {
    console.error("❌ imagens-urls.json não encontrado.");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf-8"));
  const captions = JSON.parse(fs.readFileSync(CAPTIONS, "utf-8"));
  const mapaCap = {};
  captions.forEach((c) => { mapaCap[c.codigo_imovel] = c.caption; });

  let estado = { indice: 0, publicados: [], tentativas: 0 };
  if (fs.existsSync(ESTADO)) estado = JSON.parse(fs.readFileSync(ESTADO, "utf-8"));

  if (estado.indice >= manifest.ordem.length) {
    console.log(`✅ Todos os ${manifest.ordem.length} imóveis já foram publicados!`);
    return;
  }

  const codigo = manifest.ordem[estado.indice];
  const urlStory = manifest.urls[codigo];
  const urlFeed = manifest.urls_feed?.[codigo] || manifest.urls_quadrada?.[codigo] || urlStory;
  const caption = mapaCap[codigo] || `Imóvel ${codigo} — Escritório Campos Figueira\n\n📲 WhatsApp: (11) 2378-5643\nCRECI: 043649-J`;

  console.log(`\n▶ Publicando #${estado.indice + 1}/${manifest.ordem.length} — CF-${codigo}`);
  console.log(`  Feed URL: ${urlFeed}`);
  console.log(`  Story URL: ${urlStory}`);

  const reg = { codigo, data: new Date().toISOString(), fb_feed: "—", fb_story: "—", ig_feed: "—", ig_story: "—" };

  // Facebook Feed
  try {
    reg.fb_feed = "✅ " + await publicarFeedFacebook(token, urlFeed, caption);
  } catch (e) { reg.fb_feed = "❌ " + e.message; }
  console.log("  FB Feed :", reg.fb_feed);

  // Facebook Story
  try {
    reg.fb_story = "✅ " + await publicarStoryFacebook(token, urlStory);
  } catch (e) { reg.fb_story = "❌ " + e.message; }
  console.log("  FB Story:", reg.fb_story);

  // Instagram Feed
  try {
    reg.ig_feed = "✅ " + await publicarFeedInstagram(token, urlFeed, caption);
  } catch (e) { reg.ig_feed = "❌ " + e.message; }
  console.log("  IG Feed :", reg.ig_feed);

  // Instagram Story
  try {
    reg.ig_story = "✅ " + await publicarStoryInstagram(token, urlStory);
  } catch (e) { reg.ig_story = "❌ " + e.message; }
  console.log("  IG Story:", reg.ig_story);

  const algumOk = [reg.fb_feed, reg.fb_story, reg.ig_feed, reg.ig_story].some((s) => s.startsWith("✅"));
  estado.tentativas = estado.tentativas || 0;

  if (algumOk || estado.tentativas >= 2) {
    if (!algumOk) {
      reg.observacao = `pulado após ${estado.tentativas + 1} tentativas`;
      console.log(`\n⚠️  Tudo falhou ${estado.tentativas + 1}x — pulando CF-${codigo}.`);
      alertar?.alertarFalha(codigo, ["FB Feed", "FB Story", "IG Feed", "IG Story"], "Todos os canais falharam");
    }
    estado.publicados.push(reg);
    estado.indice += 1;
    estado.tentativas = 0;
  } else {
    estado.tentativas += 1;
    estado.ultimaFalha = reg;
    console.log(`\n⚠️  Nenhum canal publicou. Tentativa ${estado.tentativas}/3 — tente novamente.`);
    alertar?.alertarFalha(codigo, ["FB Feed", "FB Story", "IG Feed", "IG Story"], "Tentativa " + estado.tentativas);
  }

  fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
  fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 2), "utf-8");

  console.log(`\n📊 Estado salvo. Próximo: #${estado.indice + 1} — CF-${manifest.ordem[estado.indice] || "(fim)"}`);

  if (algumOk) {
    const canaisOk = ["fb_feed", "fb_story", "ig_feed", "ig_story"]
      .filter((k) => reg[k].startsWith("✅"))
      .map((k) => k.replace("_", " ").toUpperCase());
    alertar?.confirmarPublicacao(codigo, canaisOk);
  }
}

main().catch((e) => { console.error("❌ Erro fatal:", e.message); process.exit(1); });
