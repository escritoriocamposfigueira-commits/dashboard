/**
 * PREPARAR-SERVIDOR.js — Escritório Campos Figueira
 * Roda UMA VEZ no seu PC. Sobe as 76 imagens para um host público (catbox)
 * e gera src/content/imagens-urls.json — o manifesto que o servidor 24h usa.
 *
 * Depois disso o GitHub Actions publica tudo sozinho, com o PC desligado.
 *
 * USO (na pasta do projeto):
 *   node PREPARAR-SERVIDOR.js
 *
 * Opções:
 *   --pasta "D:\\caminho"   pasta das imagens (padrão: pasta de anúncios)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const PASTA_PADRAO = "D:\\01 - ESCRITÓRIO IMOBILIÁRIO\\04- REDE SOCIAL\\IMAGENS ANUNCIOS";
const args = process.argv.slice(2);
function argVal(nome, padrao) { const i = args.indexOf(nome); return i >= 0 && args[i + 1] ? args[i + 1] : padrao; }
const PASTA = argVal("--pasta", PASTA_PADRAO);

const SAIDA = path.join(__dirname, "src/content/imagens-urls.json");
const CAPTIONS = path.join(__dirname, "src/content/captions-imoveis.json");

function normalizar(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}
function extrairCodigo(nome) {
  let b = nome.replace(/\.(png|jpe?g)$/i, "");
  return b.replace(/^CF/i, "").replace(/^[\s\-]+/, "").trim();
}

function subirCatbox(arquivoPath) {
  return new Promise((resolve, reject) => {
    const boundary = "----CF" + Date.now() + Math.random().toString(16).slice(2);
    const fileBuf = fs.readFileSync(arquivoPath);
    const fileName = path.basename(arquivoPath);
    const ext = path.extname(arquivoPath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : "image/jpeg";
    const partes = [
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`),
      fileBuf,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ];
    const body = Buffer.concat(partes);
    const req = https.request({
      hostname: "catbox.moe", path: "/user/api.php", method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": body.length },
    }, (res) => {
      let raw = ""; res.on("data", (c) => (raw += c));
      res.on("end", () => (raw.startsWith("https://") ? resolve(raw.trim()) : reject(new Error(raw.slice(0, 80)))));
    });
    req.on("error", reject);
    req.write(body); req.end();
  });
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   PREPARAR SERVIDOR — subindo imagens p/ host público     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  if (!fs.existsSync(PASTA)) {
    console.error(`❌ Pasta não encontrada: ${PASTA}`);
    console.error(`   Use: node PREPARAR-SERVIDOR.js --pasta "D:\\seu\\caminho"`);
    process.exit(1);
  }

  const captions = JSON.parse(fs.readFileSync(CAPTIONS, "utf-8"));
  const temCopy = {};
  captions.forEach((c) => { temCopy[normalizar(c.codigo_imovel)] = c.codigo_imovel; });

  // Carregar manifesto existente — modo INCREMENTAL (não bagunça a fila)
  let manifest = { ordem: [], urls: {} };
  if (fs.existsSync(SAIDA)) {
    manifest = JSON.parse(fs.readFileSync(SAIDA, "utf-8"));
    manifest.ordem = manifest.ordem || [];
    manifest.urls = manifest.urls || {};
    console.log(`Manifesto existente: ${manifest.ordem.length} imóveis já hospedados (serão mantidos na mesma ordem).\n`);
  }

  const arquivos = fs.readdirSync(PASTA).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
  console.log(`${arquivos.length} imagens na pasta. Subindo apenas as novas...\n`);

  let novos = 0, semCopy = 0, jaTinha = 0;

  for (const arq of arquivos) {
    const cod = extrairCodigo(arq);
    const codCanonico = temCopy[normalizar(cod)];
    if (!codCanonico) { console.log(`  ⚠️  ${arq} — sem copy ainda, pulado`); semCopy++; continue; }
    if (manifest.urls[codCanonico]) { jaTinha++; continue; } // já hospedado, mantém
    try {
      const url = await subirCatbox(path.join(PASTA, arq));
      manifest.urls[codCanonico] = url;
      manifest.ordem.push(codCanonico); // novos vão para o FIM da fila
      novos++;
      console.log(`  ✅ NOVO ${codCanonico.padEnd(20)} ${url}`);
    } catch (e) {
      console.log(`  ❌ ${arq} — ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  manifest.gerado_em = new Date().toISOString();
  fs.writeFileSync(SAIDA, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\n✅ ${novos} imagens NOVAS hospedadas · ${jaTinha} já existiam · ${manifest.ordem.length} no total`);
  if (semCopy) console.log(`⚠️  ${semCopy} imagens sem copy (me peça a copy delas).`);

  // Subir o manifesto para o GitHub automaticamente
  console.log("\nEnviando manifesto para o GitHub...");
  try {
    const { execSync } = require("child_process");
    const op = { cwd: __dirname, stdio: "inherit" };
    execSync("git add src/content/imagens-urls.json", op);
    try { execSync('git commit -m "manifesto de imagens (servidor 24h)"', op); }
    catch { console.log("(nada novo para commitar)"); }
    execSync("git push origin claude/campos-figueira-growth-qmjsux", op);
    console.log("\n🎉 Manifesto enviado! O servidor 24h já vai usar essas imagens.\n");
  } catch (e) {
    console.log("\n⚠️  Não consegui enviar automático. Rode na mão:");
    console.log("   git add src/content/imagens-urls.json");
    console.log('   git commit -m "manifesto de imagens"');
    console.log("   git push origin claude/campos-figueira-growth-qmjsux\n");
  }
}

main().catch((e) => { console.error("❌ Erro:", e.message); process.exit(1); });
