/**
 * EXECUTAR-AGORA.js — Escritório Campos Figueira
 * Agenda TODOS os imóveis (com IMAGEM + copy persuasiva) no Facebook Página.
 * Sobe as imagens para o catbox (deixa o Instagram pronto).
 * Gera a página de 1 clique para compartilhar nos Grupos do Facebook.
 *
 * O Facebook publica sozinho na hora marcada — o PC pode ficar DESLIGADO.
 *
 * USO (na pasta do projeto):
 *   node EXECUTAR-AGORA.js               ← DRY-RUN: mostra tudo, não publica nada
 *   node EXECUTAR-AGORA.js --confirmar   ← AGENDA DE VERDADE no Facebook
 *
 * Opções:
 *   --pasta "D:\\caminho\\imagens"   pasta das imagens (padrão: pasta de anúncios)
 *   --inicio 2026-06-27             data do primeiro post (padrão: amanhã)
 *   --por-dia 2                     quantos posts por dia (padrão: 2)
 *
 * O token é lido do .env.local (META_PAGE_TOKEN).
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE_HOST = "graph.facebook.com";
const BASE_PATH = "/v22.0";
let PAGE_ID = "512040582222121";
const IG_USER_ID = "17841461388445580";
const HORARIOS = ["09:00", "18:00"];

const PASTA_PADRAO = "D:\\01 - ESCRITÓRIO IMOBILIÁRIO\\04- REDE SOCIAL\\IMAGENS ANUNCIOS";

// ── Argumentos ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const CONFIRMAR = args.includes("--confirmar");
function argVal(nome, padrao) {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
}
const PASTA = argVal("--pasta", PASTA_PADRAO);
const POR_DIA = parseInt(argVal("--por-dia", "2"), 10);

function amanha() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
const DATA_INICIO = argVal("--inicio", amanha());

// ── Carregar .env.local ───────────────────────────────────────────────────────
function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(__dirname, name);
    if (fs.existsSync(p)) {
      fs.readFileSync(p, "utf-8").split("\n").forEach((line) => {
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

// ── Normalizar texto (remove acento, maiúsculas, espaços extras) ───────────────
function normalizar(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}

// ── Extrair código do imóvel a partir do nome do arquivo ───────────────────────
function extrairCodigo(nomeArquivo) {
  let base = nomeArquivo.replace(/\.(png|jpe?g)$/i, "");
  base = base.replace(/^CF/i, "").replace(/^[\s\-]+/, "").trim();
  return base;
}

// ── GET JSON ──────────────────────────────────────────────────────────────────
function apiGet(endpoint) {
  return new Promise((resolve) => {
    https.get({ hostname: BASE_HOST, path: `${BASE_PATH}/${endpoint}` }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ error: { message: raw } }); } });
    }).on("error", (e) => resolve({ error: { message: e.message } }));
  });
}

// ── Upload multipart (imagem + campos) para qualquer host ──────────────────────
function uploadMultipart(hostname, caminhoApi, campos, nomeCampoArquivo, arquivoPath) {
  return new Promise((resolve, reject) => {
    const boundary = "----CFBoundary" + Date.now() + Math.random().toString(16).slice(2);
    const fileBuf = fs.readFileSync(arquivoPath);
    const fileName = path.basename(arquivoPath);
    const ext = path.extname(arquivoPath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : "image/jpeg";

    const partes = [];
    for (const [k, v] of Object.entries(campos)) {
      partes.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
    }
    partes.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${nomeCampoArquivo}"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`
    ));
    partes.push(fileBuf);
    partes.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(partes);

    const req = https.request({
      hostname, path: caminhoApi, method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": body.length },
    }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => resolve(raw));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Agendar FOTO no Facebook (publica sozinho, PC desligado) ───────────────────
async function agendarFotoFacebook(token, caption, dataHora, imgPath) {
  const ts = Math.floor(new Date(dataHora).getTime() / 1000);
  const raw = await uploadMultipart(
    BASE_HOST, `${BASE_PATH}/${PAGE_ID}/photos`,
    { caption, published: "false", scheduled_publish_time: String(ts), access_token: token },
    "source", imgPath
  );
  let res; try { res = JSON.parse(raw); } catch { res = { error: { message: raw } }; }
  if (res.error) throw new Error(res.error.message);
  return res.post_id || res.id;
}

// ── Subir imagem ao catbox (URL pública para o Instagram) ──────────────────────
async function subirCatbox(imgPath) {
  const raw = await uploadMultipart(
    "catbox.moe", "/user/api.php",
    { reqtype: "fileupload" },
    "fileToUpload", imgPath
  );
  if (raw && raw.startsWith("https://")) return raw.trim();
  throw new Error("catbox falhou: " + raw.slice(0, 80));
}

// ── Distribuir datas ──────────────────────────────────────────────────────────
function distribuirDatas(lista) {
  return lista.map((item, i) => {
    const diaOffset = Math.floor(i / POR_DIA);
    const hora = HORARIOS[i % POR_DIA] || HORARIOS[0];
    const d = new Date(DATA_INICIO + "T12:00:00-03:00");
    d.setDate(d.getDate() + diaOffset);
    return { ...item, data: d.toISOString().slice(0, 10), hora };
  });
}

// ── Página de 1 clique para Grupos do Facebook ─────────────────────────────────
function gerarPaginaGrupos(itens) {
  const grupos = [
    { nome: "Venda e Locação MDC", url: "https://www.facebook.com/groups/618454204921867" },
    { nome: "Venda Locação Mogi das Cruzes", url: "https://www.facebook.com/groups/vendalocacaomogidascruzes" },
    { nome: "Negócios Mogi das Cruzes", url: "https://www.facebook.com/groups/negociosmogidascruzes" },
  ];
  const cards = itens.map((it, idx) => {
    const imgSrc = it.catboxUrl || ("file:///" + it.imgPath.replace(/\\/g, "/"));
    const botoesGrupos = grupos.map((g) =>
      `<a class="grp" href="${g.url}" target="_blank">📮 ${g.nome}</a>`
    ).join("");
    return `
    <div class="card">
      <div class="num">${idx + 1} / ${itens.length} — ${it.codigo}</div>
      <img src="${imgSrc}" alt="${it.codigo}" loading="lazy"/>
      <textarea id="t${idx}" readonly>${it.caption.replace(/</g, "&lt;")}</textarea>
      <div class="acts">
        <button onclick="copiar(${idx})">📋 Copiar legenda</button>
        ${botoesGrupos}
      </div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Compartilhar nos Grupos — Escritório Campos Figueira</title>
<style>
  body{font-family:system-ui,Arial,sans-serif;background:#f0f2f5;margin:0;padding:20px;color:#1c1e21}
  h1{font-size:20px}
  .info{background:#fff;border-radius:10px;padding:16px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
  .card{background:#fff;border-radius:10px;padding:16px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
  .num{font-weight:700;color:#1877f2;margin-bottom:8px}
  img{max-width:320px;width:100%;border-radius:8px;display:block;margin-bottom:10px}
  textarea{width:100%;height:140px;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box}
  .acts{margin-top:10px;display:flex;flex-wrap:wrap;gap:8px}
  button,.grp{cursor:pointer;border:none;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block}
  button{background:#42b72a;color:#fff}
  .grp{background:#1877f2;color:#fff}
</style></head><body>
<div class="info">
  <h1>📤 Compartilhar nos Grupos do Facebook</h1>
  <p>A Meta não permite postar em grupos automaticamente. Aqui é em <b>3 cliques</b>:</p>
  <p><b>1.</b> Clique <b>📋 Copiar legenda</b> &nbsp; <b>2.</b> Clique no <b>grupo</b> &nbsp; <b>3.</b> Cole (Ctrl+V) a legenda e a imagem no grupo.</p>
  <p>Total: <b>${itens.length} imóveis</b>.</p>
</div>
${cards}
<script>
function copiar(i){
  const t=document.getElementById('t'+i);
  navigator.clipboard.writeText(t.value).then(()=>{
    const b=event.target; const o=b.textContent; b.textContent='✅ Copiado!';
    setTimeout(()=>b.textContent=o,1500);
  });
}
</script>
</body></html>`;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv();
  const token = process.env.META_PAGE_TOKEN;

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log(`║   AGENDADOR — Escritório Campos Figueira                   ║`);
  console.log(`║   ${CONFIRMAR ? "⚠️  MODO REAL — vai agendar no Facebook" : "🔍 DRY-RUN — só simula, não publica nada"}       ║`);
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  if (!token) {
    console.error("❌ META_PAGE_TOKEN não encontrado no .env.local"); process.exit(1);
  }

  // 1. Verificar token + pegar token da Página
  console.log("1. Verificando token...");
  const me = await apiGet(`me?fields=id,name&access_token=${encodeURIComponent(token)}`);
  if (me.error) { console.error(`❌ Token inválido: ${me.error.message}`); process.exit(1); }
  console.log(`   Conta: ${me.name} (ID: ${me.id})`);

  let pageToken = token;
  const accounts = await apiGet(`me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(token)}`);
  if (accounts.data && accounts.data.length > 0) {
    const ecf = accounts.data.find((p) => /campos|figueira|escrit/i.test(p.name)) || accounts.data[0];
    PAGE_ID = ecf.id; pageToken = ecf.access_token;
    console.log(`   ✅ Página: ${ecf.name} (ID: ${ecf.id}) — token da página obtido`);
  } else if (me.id) {
    PAGE_ID = me.id;
    console.log(`   ✅ Token de Página direto — ID: ${PAGE_ID}`);
  }

  // 2. Ler imagens da pasta
  console.log(`\n2. Lendo imagens da pasta:\n   ${PASTA}`);
  if (!fs.existsSync(PASTA)) {
    console.error(`\n❌ Pasta não encontrada: ${PASTA}`);
    console.error(`   Use: node EXECUTAR-AGORA.js --pasta "D:\\seu\\caminho"`);
    process.exit(1);
  }
  const arquivos = fs.readdirSync(PASTA).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
  console.log(`   ${arquivos.length} imagens encontradas`);

  // 3. Casar imagem ↔ caption
  const captions = JSON.parse(fs.readFileSync(path.join(__dirname, "src/content/captions-imoveis.json"), "utf-8"));
  const mapaCaption = {};
  captions.forEach((c) => { mapaCaption[normalizar(c.codigo_imovel)] = c.caption; });

  const itens = [];
  const semCaption = [];
  for (const arq of arquivos) {
    const codigo = extrairCodigo(arq);
    const caption = mapaCaption[normalizar(codigo)];
    if (caption) {
      itens.push({ codigo, arquivo: arq, imgPath: path.join(PASTA, arq), caption });
    } else {
      semCaption.push(arq);
    }
  }
  console.log(`   ${itens.length} imagens com copy pronta`);
  if (semCaption.length) console.log(`   ⚠️  ${semCaption.length} sem copy: ${semCaption.join(", ")}`);

  if (itens.length === 0) { console.error("❌ Nenhuma imagem casou com as captions."); process.exit(1); }

  // 4. Distribuir datas
  const agendados = distribuirDatas(itens);
  const ultimo = agendados[agendados.length - 1];
  console.log(`\n3. Agenda: ${agendados.length} posts · ${POR_DIA}/dia · ${HORARIOS.join(" e ")}`);
  console.log(`   Primeiro: ${agendados[0].data} ${agendados[0].hora}  →  Último: ${ultimo.data} ${ultimo.hora}`);

  if (!CONFIRMAR) {
    console.log("\n🔍 DRY-RUN — prévia dos 5 primeiros:\n");
    agendados.slice(0, 5).forEach((p) => {
      console.log(`   [${p.codigo}] ${p.data} ${p.hora} · ${p.arquivo}`);
      console.log(`        "${p.caption.split("\n")[0].slice(0, 70)}..."`);
    });
    console.log(`\n   ... e mais ${agendados.length - 5} imóveis.`);
    console.log("\n✅ Está tudo certo? Então rode AGORA para agendar de verdade:");
    console.log("   node EXECUTAR-AGORA.js --confirmar\n");
    return;
  }

  // 5. AGENDAR DE VERDADE
  console.log("\n4. Agendando no Facebook (com imagem) + subindo p/ Instagram...\n");
  const resultados = [];
  let fbOk = 0, fbErro = 0, catOk = 0;

  for (const p of agendados) {
    const dataHora = `${p.data}T${p.hora}:00-03:00`;
    const r = { codigo: p.codigo, arquivo: p.arquivo, data: p.data, hora: p.hora, fb: "—", catbox: "—" };

    // Facebook (imagem + copy, agendado)
    try {
      const fbId = await agendarFotoFacebook(pageToken, p.caption, dataHora, p.imgPath);
      r.fb = `✅ ${fbId}`; fbOk++;
    } catch (e) {
      r.fb = `❌ ${e.message.slice(0, 50)}`; fbErro++;
    }

    // Catbox (deixa Instagram pronto) — não-fatal
    try {
      p.catboxUrl = await subirCatbox(p.imgPath);
      r.catbox = p.catboxUrl; catOk++;
    } catch (e) {
      r.catbox = `⚠️ ${e.message.slice(0, 40)}`;
    }

    console.log(`   [${p.codigo}] ${p.data} ${p.hora} · FB: ${r.fb.slice(0, 32)}`);
    resultados.push(r);
    await new Promise((res) => setTimeout(res, 400));
  }

  // 6. Gerar página de grupos
  const htmlGrupos = gerarPaginaGrupos(agendados);
  const htmlPath = path.join(__dirname, "GRUPOS-COMPARTILHAR.html");
  fs.writeFileSync(htmlPath, htmlGrupos, "utf-8");

  // 7. Salvar log
  const logDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
  fs.writeFileSync(path.join(logDir, `agendamento-${Date.now()}.json`),
    JSON.stringify({ data: new Date().toISOString(), resultados }, null, 2), "utf-8");

  // 8. Resumo
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                      RESULTADO FINAL                       ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(`║  📘 Facebook agendados (c/ imagem) : ${String(fbOk).padEnd(22)}║`);
  console.log(`║  📸 Imagens prontas p/ Instagram   : ${String(catOk).padEnd(22)}║`);
  console.log(`║  ❌ Erros                          : ${String(fbErro).padEnd(22)}║`);
  console.log("╚════════════════════════════════════════════════════════════╝");

  if (fbOk > 0) {
    console.log(`\n🎉 ${fbOk} imóveis agendados no Facebook COM imagem e copy persuasiva!`);
    console.log("   ➜ O Facebook publica sozinho na hora marcada. PODE DESLIGAR O PC. ✅");
    console.log("   Ver agendados: facebook.com → sua Página → Ferramentas de Publicação → Agendados");
  }
  console.log(`\n📤 Grupos: abra o arquivo GRUPOS-COMPARTILHAR.html (clique 2x) e compartilhe em 3 cliques.`);
  if (fbErro > 0) console.log(`\n⚠️  ${fbErro} com erro — veja o log em logs/.`);
  console.log("");
}

main().catch((e) => { console.error("\n❌ Erro inesperado:", e.message); process.exit(1); });
