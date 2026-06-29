/**
 * publicar-servidor.js — Escritório Campos Figueira
 * Roda no SERVIDOR 24h (GitHub Actions). Publica o PRÓXIMO imóvel da fila em:
 *   • Facebook Feed (foto + copy)
 *   • Facebook Story
 *   • Instagram Story
 * As imagens 9:16 são o formato nativo de Stories.
 *
 * Estado salvo em controle/estado-publicacao.json (a Action faz commit de volta).
 * Cada execução publica 1 imóvel. 2 execuções/dia (cron) = 2 imóveis/dia.
 *
 * Variáveis de ambiente (GitHub Secrets):
 *   META_PAGE_TOKEN   (obrigatório)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE_HOST = "graph.facebook.com";
const BASE_PATH = "/v22.0";
let PAGE_ID = "512040582222121";
let IG_USER_ID = "17841461388445580";

const RAIZ = path.join(__dirname, "..");
const MANIFEST = path.join(RAIZ, "src/content/imagens-urls.json");
const CAPTIONS = path.join(RAIZ, "src/content/captions-imoveis.json");
const ESTADO = path.join(RAIZ, "controle/estado-publicacao.json");

// ── Requisições ───────────────────────────────────────────────────────────────
function apiGet(endpoint) {
  return new Promise((resolve) => {
    https.get({ hostname: BASE_HOST, path: `${BASE_PATH}/${endpoint}` }, (res) => {
      let raw = ""; res.on("data", (c) => (raw += c));
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ error: { message: raw } }); } });
    }).on("error", (e) => resolve({ error: { message: e.message } }));
  });
}
function apiPost(endpoint, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: BASE_HOST, path: `${BASE_PATH}/${endpoint}`, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, (res) => {
      let raw = ""; res.on("data", (c) => (raw += c));
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ error: { message: raw } }); } });
    });
    req.on("error", (e) => resolve({ error: { message: e.message } }));
    req.write(data); req.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Facebook Feed (foto + copy, publica já) ───────────────────────────────────
async function publicarFeedFacebook(token, url, caption) {
  const r = await apiPost(`${PAGE_ID}/photos`, { url, caption, access_token: token });
  if (r.error) throw new Error("FB Feed: " + r.error.message);
  return r.post_id || r.id;
}

// ── Facebook Story (2 passos) ─────────────────────────────────────────────────
async function publicarStoryFacebook(token, url) {
  const foto = await apiPost(`${PAGE_ID}/photos`, { url, published: false, access_token: token });
  if (foto.error) throw new Error("FB Story (foto): " + foto.error.message);
  const story = await apiPost(`${PAGE_ID}/photo_stories`, { photo_id: foto.id, access_token: token });
  if (story.error) throw new Error("FB Story (publish): " + story.error.message);
  return story.post_id || story.id || foto.id;
}

// ── Instagram Feed (usa a imagem 4:5, hospedada no GitHub) ────────────────────
async function publicarFeedInstagram(token, urlFeed, caption) {
  const cont = await apiPost(`${IG_USER_ID}/media`, { image_url: urlFeed, caption, access_token: token });
  if (cont.error) throw new Error("IG Feed (container): " + cont.error.message);
  for (let i = 0; i < 12; i++) {
    await sleep(2500);
    const st = await apiGet(`${cont.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("IG Feed: container deu ERROR");
  }
  const pub = await apiPost(`${IG_USER_ID}/media_publish`, { creation_id: cont.id, access_token: token });
  if (pub.error) throw new Error("IG Feed (publish): " + pub.error.message);
  return pub.id;
}

// ── Instagram Story (container → poll → publish) ──────────────────────────────
async function publicarStoryInstagram(token, url) {
  const cont = await apiPost(`${IG_USER_ID}/media`, {
    image_url: url, media_type: "STORIES", access_token: token,
  });
  if (cont.error) throw new Error("IG Story (container): " + cont.error.message);

  // Aguardar o container ficar pronto (FINISHED)
  for (let i = 0; i < 12; i++) {
    await sleep(2500);
    const st = await apiGet(`${cont.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("IG Story: container deu ERROR");
  }
  const pub = await apiPost(`${IG_USER_ID}/media_publish`, { creation_id: cont.id, access_token: token });
  if (pub.error) throw new Error("IG Story (publish): " + pub.error.message);
  return pub.id;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const tokenInicial = process.env.META_PAGE_TOKEN;
  if (!tokenInicial) { console.error("❌ META_PAGE_TOKEN não definido (GitHub Secret)."); process.exit(1); }

  // Resolver token e ID da Página
  let token = tokenInicial;
  const accounts = await apiGet(`me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(tokenInicial)}`);
  if (accounts.data && accounts.data.length > 0) {
    const ecf = accounts.data.find((p) => /campos|figueira|escrit/i.test(p.name)) || accounts.data[0];
    PAGE_ID = ecf.id; token = ecf.access_token;
    if (ecf.instagram_business_account && ecf.instagram_business_account.id)
      IG_USER_ID = ecf.instagram_business_account.id;
    console.log(`Página: ${ecf.name} (${ecf.id}) · IG: ${IG_USER_ID}`);
  }

  // Carregar dados
  if (!fs.existsSync(MANIFEST)) {
    console.error("❌ src/content/imagens-urls.json não encontrado. Rode PREPARAR-SERVIDOR.js no PC primeiro.");
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf-8"));
  const captions = JSON.parse(fs.readFileSync(CAPTIONS, "utf-8"));
  const mapaCap = {};
  captions.forEach((c) => { mapaCap[c.codigo_imovel] = c.caption; });

  let estado = { indice: 0, publicados: [] };
  if (fs.existsSync(ESTADO)) estado = JSON.parse(fs.readFileSync(ESTADO, "utf-8"));

  if (estado.indice >= manifest.ordem.length) {
    console.log(`✅ Todos os ${manifest.ordem.length} imóveis já foram publicados. Nada a fazer.`);
    return;
  }

  const codigo = manifest.ordem[estado.indice];
  // Story = imagem 9:16 (manifest.urls) · Feed = imagem 4:5 (manifest.urls_feed)
  const urlStory = manifest.urls[codigo];
  const urlFeed = (manifest.urls_feed && manifest.urls_feed[codigo])
    || (manifest.urls_quadrada && manifest.urls_quadrada[codigo])
    || urlStory; // fallback se ainda não houver 4:5
  const caption = mapaCap[codigo] || `Imóvel ${codigo} — Escritório Campos Figueira`;
  console.log(`\n▶ Publicando #${estado.indice + 1}/${manifest.ordem.length} — código ${codigo}`);

  const registro = { codigo, data: new Date().toISOString(), fb_feed: "—", fb_story: "—", ig_feed: "—", ig_story: "—" };

  try { registro.fb_feed = "✅ " + await publicarFeedFacebook(token, urlFeed, caption); }
  catch (e) { registro.fb_feed = "❌ " + e.message; }
  console.log("  FB Feed :", registro.fb_feed);

  try { registro.fb_story = "✅ " + await publicarStoryFacebook(token, urlStory); }
  catch (e) { registro.fb_story = "❌ " + e.message; }
  console.log("  FB Story:", registro.fb_story);

  try { registro.ig_feed = "✅ " + await publicarFeedInstagram(token, urlFeed, caption); }
  catch (e) { registro.ig_feed = "❌ " + e.message; }
  console.log("  IG Feed :", registro.ig_feed);

  try { registro.ig_story = "✅ " + await publicarStoryInstagram(token, urlStory); }
  catch (e) { registro.ig_story = "❌ " + e.message; }
  console.log("  IG Story:", registro.ig_story);

  // Avançar a fila com segurança:
  // - se ALGUM canal publicou → avança (não republica = sem duplicar)
  // - se TUDO falhou → repete na próxima execução, até 3 tentativas (não trava a fila)
  const algumOk = [registro.fb_feed, registro.fb_story, registro.ig_feed, registro.ig_story]
    .some((s) => s.startsWith("✅"));
  estado.tentativas = estado.tentativas || 0;

  if (algumOk || estado.tentativas >= 2) {
    if (!algumOk) {
      registro.observacao = `pulado após ${estado.tentativas + 1} tentativas sem sucesso`;
      console.log(`\n⚠️  Tudo falhou ${estado.tentativas + 1}x — pulando para não travar a fila. SUPERVISÃO: revisar código ${codigo}.`);
    }
    estado.publicados.push(registro);
    estado.indice += 1;
    estado.tentativas = 0;
  } else {
    estado.tentativas += 1;
    estado.ultimaFalha = registro;
    console.log(`\n⚠️  Nenhum canal publicou. Tentativa ${estado.tentativas}/3 — vai repetir o código ${codigo} na próxima execução.`);
  }

  if (!fs.existsSync(path.dirname(ESTADO))) fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
  fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 2), "utf-8");
  console.log(`Estado salvo. Próximo índice: ${estado.indice}/${manifest.ordem.length}`);
}

main().catch((e) => { console.error("❌ Erro:", e.message); process.exit(1); });
