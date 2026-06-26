/**
 * PREPARAR-SERVIDOR.js — Escritório Campos Figueira
 * Roda no seu PC (ou via Claude local). Copia as imagens dos anúncios
 * para dentro do projeto (public/anuncios) e gera src/content/imagens-urls.json
 * com links públicos do próprio GitHub (raw) — SEM depender de catbox.
 *
 * Depois disso o servidor 24h (GitHub Actions) publica tudo sozinho.
 *
 * USO (na pasta do projeto):
 *   node PREPARAR-SERVIDOR.js
 *
 * Opções:
 *   --pasta "D:\\caminho"   pasta de origem das imagens (padrão: pasta de anúncios)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PASTA_PADRAO = "D:\\01 - ESCRITÓRIO IMOBILIÁRIO\\04- REDE SOCIAL\\IMAGENS ANUNCIOS";
const args = process.argv.slice(2);
function argVal(nome, padrao) { const i = args.indexOf(nome); return i >= 0 && args[i + 1] ? args[i + 1] : padrao; }
const PASTA = argVal("--pasta", PASTA_PADRAO);

const OWNER = "escritoriocamposfigueira-commits";
const REPO = "dashboard";
const BRANCH = "claude/campos-figueira-growth-qmjsux";
const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/refs/heads/${BRANCH}/public/anuncios/`;

const DEST_IMAGENS = path.join(__dirname, "public", "anuncios");
const SAIDA = path.join(__dirname, "src/content/imagens-urls.json");
const CAPTIONS = path.join(__dirname, "src/content/captions-imoveis.json");

function normalizar(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}
function extrairCodigo(nome) {
  const b = nome.replace(/\.(png|jpe?g)$/i, "");
  return b.replace(/^CF/i, "").replace(/^[\s\-]+/, "").trim();
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   PREPARAR SERVIDOR — imagens via GitHub (sem catbox)     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  if (!fs.existsSync(PASTA)) {
    console.error(`❌ Pasta de origem não encontrada: ${PASTA}`);
    console.error(`   Use: node PREPARAR-SERVIDOR.js --pasta "D:\\seu\\caminho"`);
    process.exit(1);
  }
  if (!fs.existsSync(DEST_IMAGENS)) fs.mkdirSync(DEST_IMAGENS, { recursive: true });

  const captions = JSON.parse(fs.readFileSync(CAPTIONS, "utf-8"));
  const temCopy = {};
  captions.forEach((c) => { temCopy[normalizar(c.codigo_imovel)] = c.codigo_imovel; });

  // Manifesto incremental (mantém a ordem da fila já em andamento)
  let manifest = { ordem: [], urls: {} };
  if (fs.existsSync(SAIDA)) {
    const m = JSON.parse(fs.readFileSync(SAIDA, "utf-8"));
    manifest.ordem = m.ordem || [];
    manifest.urls = m.urls || {};
    console.log(`Manifesto existente: ${manifest.ordem.length} imóveis já na fila (mantidos).\n`);
  }

  const arquivos = fs.readdirSync(PASTA).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
  console.log(`${arquivos.length} imagens na origem. Copiando para o projeto...\n`);

  let novos = 0, jaTinha = 0, semCopy = 0;
  for (const arq of arquivos) {
    const cod = extrairCodigo(arq);
    const codCanonico = temCopy[normalizar(cod)];
    if (!codCanonico) { console.log(`  ⚠️  ${arq} — sem copy ainda, pulado`); semCopy++; continue; }

    // copia a imagem para public/anuncios (sempre atualiza o arquivo)
    fs.copyFileSync(path.join(PASTA, arq), path.join(DEST_IMAGENS, arq));
    const url = RAW_BASE + encodeURIComponent(arq);

    if (manifest.urls[codCanonico]) { jaTinha++; manifest.urls[codCanonico] = url; continue; }
    manifest.urls[codCanonico] = url;
    manifest.ordem.push(codCanonico); // novos vão para o FIM da fila
    novos++;
    console.log(`  ✅ ${codCanonico.padEnd(22)} ${arq}`);
  }

  manifest.gerado_em = new Date().toISOString();
  fs.writeFileSync(SAIDA, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\n✅ ${novos} novas · ${jaTinha} já existiam · ${manifest.ordem.length} no total`);
  if (semCopy) console.log(`⚠️  ${semCopy} sem copy (me peça a copy delas).`);

  // Enviar para o GitHub
  console.log("\nEnviando imagens e manifesto para o GitHub...");
  try {
    const op = { cwd: __dirname, stdio: "inherit" };
    execSync("git add public/anuncios src/content/imagens-urls.json", op);
    try { execSync('git commit -m "imagens + manifesto (servidor 24h)"', op); }
    catch { console.log("(nada novo para commitar)"); }
    execSync(`git push origin ${BRANCH}`, op);
    console.log("\n🎉 Tudo enviado! O servidor 24h já vai usar essas imagens.\n");
  } catch (e) {
    console.log("\n⚠️  Não consegui enviar automático. Rode na mão:");
    console.log("   git add public/anuncios src/content/imagens-urls.json");
    console.log('   git commit -m "imagens + manifesto"');
    console.log(`   git push origin ${BRANCH}\n`);
  }
}

main().catch((e) => { console.error("❌ Erro:", e.message); process.exit(1); });
