/**
 * PREPARAR-SERVIDOR.js — Escritório Campos Figueira
 * Roda no seu PC. Copia as imagens dos anúncios para dentro do projeto
 * e gera src/content/imagens-urls.json com links públicos do GitHub.
 *
 * Estrutura esperada da pasta de origem:
 *   <pasta>\proporção 9.16   → imagens 9:16 (STORIES)  → public/anuncios
 *   <pasta>\PROPORÇÃO 4.5     → imagens 4:5  (FEED)     → public/anuncios-feed
 * (se não houver subpastas, lê a pasta direto como 9:16 — compatível com o antigo)
 *
 * USO (na pasta do projeto):
 *   node PREPARAR-SERVIDOR.js
 *
 * Opções:
 *   --pasta "D:\\caminho"   pasta de origem (padrão: pasta de anúncios)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  carregarCodigosInativos,
  codigoInativo,
  filtrarCodigosAtivos,
} = require("./scripts/imoveis-inativos");

const PASTA_PADRAO = "D:\\01 - ESCRITÓRIO IMOBILIÁRIO\\04- REDE SOCIAL\\IMAGENS ANUNCIOS";
const args = process.argv.slice(2);
function argVal(nome, padrao) { const i = args.indexOf(nome); return i >= 0 && args[i + 1] ? args[i + 1] : padrao; }
const PASTA = argVal("--pasta", PASTA_PADRAO);

const OWNER = "escritoriocamposfigueira-commits";
const REPO = "dashboard";
const BRANCH = "claude/campos-figueira-growth-qmjsux";
const RAW = (sub) => `https://raw.githubusercontent.com/${OWNER}/${REPO}/refs/heads/${BRANCH}/public/${sub}/`;
const RAW_STORY = RAW("anuncios");        // 9:16
const RAW_FEED = RAW("anuncios-feed");    // 4:5

const DEST_STORY = path.join(__dirname, "public", "anuncios");
const DEST_FEED = path.join(__dirname, "public", "anuncios-feed");
const SAIDA = path.join(__dirname, "src/content/imagens-urls.json");
const CAPTIONS = path.join(__dirname, "src/content/captions-imoveis.json");

function normalizar(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}
function extrairCodigo(nome) {
  const b = nome.replace(/\.(png|jpe?g)$/i, "");
  return b.replace(/^CF/i, "").replace(/^[\s\-]+/, "").trim();
}
function listarImagens(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(png|jpe?g)$/i.test(e.name))
    .map((e) => e.name).sort();
}

async function main() {
  const codigosInativos = carregarCodigosInativos();
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   PREPARAR SERVIDOR — 4:5 (feed) + 9:16 (story)           ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  if (!fs.existsSync(PASTA)) {
    console.error(`❌ Pasta de origem não encontrada: ${PASTA}`);
    process.exit(1);
  }
  fs.mkdirSync(DEST_STORY, { recursive: true });
  fs.mkdirSync(DEST_FEED, { recursive: true });

  // localizar subpastas (Windows é case-insensitive, então path.join resolve)
  const dir916 = fs.existsSync(path.join(PASTA, "proporção 9.16")) ? path.join(PASTA, "proporção 9.16") : PASTA;
  const dir45 = path.join(PASTA, "PROPORÇÃO 4.5");
  const tem45 = fs.existsSync(dir45);

  console.log("Origem 9:16 (story):", dir916);
  console.log("Origem 4:5  (feed) :", tem45 ? dir45 : "(não encontrada — feed usará 9:16 como fallback)");
  console.log("");

  const captions = JSON.parse(fs.readFileSync(CAPTIONS, "utf-8"));
  const temCopy = {};
  captions.forEach((c) => { temCopy[normalizar(c.codigo_imovel)] = c.codigo_imovel; });

  // manifesto incremental
  let manifest = { ordem: [], urls: {}, urls_feed: {} };
  if (fs.existsSync(SAIDA)) {
    const m = JSON.parse(fs.readFileSync(SAIDA, "utf-8"));
    manifest.ordem = m.ordem || [];
    manifest.urls = m.urls || {};
    manifest.urls_feed = m.urls_feed || {};
    console.log(`Manifesto existente: ${manifest.ordem.length} imóveis na fila (mantidos).\n`);
  }
  manifest.ordem = filtrarCodigosAtivos(manifest.ordem, codigosInativos);
  for (const codigo of Object.keys(manifest.urls)) {
    if (codigoInativo(codigo, codigosInativos)) delete manifest.urls[codigo];
  }
  for (const codigo of Object.keys(manifest.urls_feed)) {
    if (codigoInativo(codigo, codigosInativos)) delete manifest.urls_feed[codigo];
  }

  // ── 9:16 (story) — define a ordem da fila ──
  let novos916 = 0;
  for (const arq of listarImagens(dir916)) {
    const cod = temCopy[normalizar(extrairCodigo(arq))];
    if (!cod || codigoInativo(cod, codigosInativos)) continue;
    fs.copyFileSync(path.join(dir916, arq), path.join(DEST_STORY, arq));
    const url = RAW_STORY + encodeURIComponent(arq);
    if (!manifest.urls[cod]) { manifest.ordem.push(cod); novos916++; }
    manifest.urls[cod] = url;
  }

  // ── 4:5 (feed) ──
  let nov45 = 0;
  if (tem45) {
    for (const arq of listarImagens(dir45)) {
      const cod = temCopy[normalizar(extrairCodigo(arq))];
      if (!cod || codigoInativo(cod, codigosInativos)) continue;
      fs.copyFileSync(path.join(dir45, arq), path.join(DEST_FEED, arq));
      if (!manifest.urls_feed[cod]) nov45++;
      manifest.urls_feed[cod] = RAW_FEED + encodeURIComponent(arq);
    }
  }

  manifest.gerado_em = new Date().toISOString();
  fs.writeFileSync(SAIDA, JSON.stringify(manifest, null, 2), "utf-8");

  // diagnóstico: imóveis sem versão de feed
  const semFeed = manifest.ordem.filter((c) => !manifest.urls_feed[c]);
  console.log(`✅ Story (9:16): ${Object.keys(manifest.urls).length} no total (${novos916} novos)`);
  console.log(`✅ Feed  (4:5) : ${Object.keys(manifest.urls_feed).length} no total (${nov45} novos)`);
  if (semFeed.length) console.log(`⚠️  ${semFeed.length} sem imagem 4:5 (feed usará a 9:16): ${semFeed.join(", ")}`);

  console.log("\nEnviando para o GitHub...");
  try {
    const op = { cwd: __dirname, stdio: "inherit" };
    execSync("git add public/anuncios public/anuncios-feed src/content/imagens-urls.json", op);
    try { execSync('git commit -m "imagens 4:5 (feed) + 9:16 (story) + manifesto"', op); }
    catch { console.log("(nada novo para commitar)"); }
    execSync(`git push origin ${BRANCH}`, op);
    console.log("\n🎉 Enviado! O servidor já vai usar 4:5 no feed e 9:16 nos stories.\n");
  } catch (e) {
    console.log("\n⚠️  Envie manualmente:");
    console.log("   git add public/anuncios public/anuncios-feed src/content/imagens-urls.json");
    console.log('   git commit -m "imagens 4:5 + 9:16"');
    console.log(`   git push origin ${BRANCH}\n`);
  }
}

main().catch((e) => { console.error("❌ Erro:", e.message); process.exit(1); });
