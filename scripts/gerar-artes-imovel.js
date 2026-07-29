/**
 * Gera as duas artes oficiais de um imóvel:
 *   - Feed:  1080 x 1350 (4:5)
 *   - Story: 1080 x 1920 (9:16, conteúdo essencial na zona segura)
 *
 * USO:
 *   npm run arte:imovel -- --config modelos/novo-imovel.exemplo.json
 *   npm run arte:imovel -- --config dados/CF-999.json --registrar
 *
 * Sem --registrar, as artes vão para arte-gerada/<codigo>/.
 * Com --registrar, as artes e os arquivos de conteúdo entram na fila do robô.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { codigoInativo } = require("./imoveis-inativos");

// O librsvg/fontconfig usado pelo Sharp precisa de uma pasta de cache gravável.
const cacheFontes = path.join(os.tmpdir(), "campos-figueira-fontconfig");
fs.mkdirSync(cacheFontes, { recursive: true });
process.env.XDG_CACHE_HOME = process.env.XDG_CACHE_HOME || cacheFontes;
if (process.platform === "win32") {
  const cacheWin = path.join(cacheFontes, "cache");
  const configWin = path.join(cacheFontes, "fonts.conf");
  fs.mkdirSync(cacheWin, { recursive: true });
  const caminhoXml = (valor) => valor.replace(/\\/g, "/").replace(/&/g, "&amp;");
  fs.writeFileSync(configWin, [
    '<?xml version="1.0"?>',
    "<!DOCTYPE fontconfig SYSTEM \"fonts.dtd\">",
    `<fontconfig><dir>C:/Windows/Fonts</dir><cachedir>${caminhoXml(cacheWin)}</cachedir></fontconfig>`,
  ].join("\n"), "utf8");
  process.env.FONTCONFIG_FILE = configWin;
}

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("❌ O gerador precisa do módulo sharp. Rode: npm install");
  process.exit(1);
}

const ROOT = path.resolve(__dirname, "..");
const MANIFESTO = path.join(ROOT, "src", "content", "imagens-urls.json");
const CAPTIONS = path.join(ROOT, "src", "content", "captions-imoveis.json");
const FOTOS = path.join(ROOT, "src", "content", "fotos-imoveis.json");
const DEST_FEED = path.join(ROOT, "public", "anuncios-feed");
const DEST_STORY = path.join(ROOT, "public", "anuncios");
const OWNER = "escritoriocamposfigueira-commits";
const REPO = "dashboard";
const BRANCH = "claude/campos-figueira-growth-qmjsux";
const SITE = "www.escritoriocamposfigueira.com.br";
const WHATSAPP = "551123785643";
const CRECI = "043649-J";

const args = process.argv.slice(2);
function tem(nome) {
  return args.includes(nome);
}
function valorArg(nome, padrao = "") {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
}

function xml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function limparCodigo(valor) {
  return String(valor ?? "").replace(/^CF[\s-]*/i, "").trim();
}

function nomeSeguro(valor) {
  return valor.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim();
}

function linhas(texto, limite, maximo) {
  const palavras = String(texto || "").trim().split(/\s+/).filter(Boolean);
  const saida = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (tentativa.length <= limite || !atual) {
      atual = tentativa;
    } else {
      saida.push(atual);
      atual = palavra;
    }
  }
  if (atual) saida.push(atual);
  if (saida.length > maximo) {
    const final = saida.slice(0, maximo);
    final[maximo - 1] = `${final[maximo - 1].replace(/[.,;:!?-]*$/, "")}…`;
    return final;
  }
  return saida;
}

function tspans(texto, x, y, tamanhoLinha, limite, maximo, classe = "") {
  return linhas(texto, limite, maximo)
    .map((linha, i) => `<tspan x="${x}" y="${y + i * tamanhoLinha}" class="${classe}">${xml(linha)}</tspan>`)
    .join("");
}

function tamanhoTexto(texto, largura, maximo, minimo) {
  const caracteres = Math.max(1, String(texto).length);
  return Math.max(minimo, Math.min(maximo, Math.floor(largura / (caracteres * 0.62))));
}

function marcadorLocal(x, y) {
  return `<path d="M${x} ${y - 18}c-11 0-20 9-20 20 0 15 20 36 20 36s20-21 20-36c0-11-9-20-20-20zm0 12a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" fill="#efbd43"/>`;
}

function lerJson(arquivo) {
  return JSON.parse(fs.readFileSync(arquivo, "utf8"));
}

function gravarJsonAtomico(arquivo, dados) {
  const temporario = `${arquivo}.tmp-${process.pid}`;
  fs.writeFileSync(temporario, `${JSON.stringify(dados, null, 2)}\n`, "utf8");
  try {
    fs.renameSync(temporario, arquivo);
  } catch (erro) {
    try { fs.unlinkSync(temporario); } catch {}
    throw erro;
  }
}

function validarConfig(config) {
  const obrigatorios = ["codigo", "finalidade", "tipo", "bairro", "cidade", "valor", "fotos"];
  const ausentes = obrigatorios.filter((campo) => {
    if (campo === "fotos") return !Array.isArray(config.fotos) || config.fotos.length === 0;
    return !String(config[campo] ?? "").trim();
  });
  if (ausentes.length) {
    throw new Error(`Campos obrigatórios ausentes: ${ausentes.join(", ")}`);
  }
  const codigo = limparCodigo(config.codigo);
  if (!codigo) throw new Error("O código do imóvel é inválido.");
  if (config.fotos.length > 10) throw new Error("Use no máximo 10 fotos por imóvel.");
  return {
    ...config,
    codigo,
    finalidade: String(config.finalidade).toUpperCase(),
    detalhes: Array.isArray(config.detalhes) ? config.detalhes.slice(0, 4).map(String) : [],
    chamada: String(config.chamada || "Seu novo endereço começa aqui"),
  };
}

async function carregarFoto(origem, pastaConfig) {
  const valor = String(origem);
  if (/^https?:\/\//i.test(valor)) {
    const resposta = await fetch(valor, { signal: AbortSignal.timeout(20000) });
    if (!resposta.ok) throw new Error(`Não foi possível baixar a foto (${resposta.status}): ${valor}`);
    const tamanho = Number(resposta.headers.get("content-length") || 0);
    if (tamanho > 20 * 1024 * 1024) throw new Error(`Foto maior que 20 MB: ${valor}`);
    const buffer = Buffer.from(await resposta.arrayBuffer());
    if (buffer.length > 20 * 1024 * 1024) throw new Error(`Foto maior que 20 MB: ${valor}`);
    return buffer;
  }
  const absoluto = path.isAbsolute(valor) ? valor : path.resolve(pastaConfig, valor);
  if (!fs.existsSync(absoluto)) throw new Error(`Foto local não encontrada: ${absoluto}`);
  const stat = fs.statSync(absoluto);
  if (!stat.isFile()) throw new Error(`O caminho não é um arquivo: ${absoluto}`);
  if (stat.size > 20 * 1024 * 1024) throw new Error(`Foto maior que 20 MB: ${absoluto}`);
  return fs.readFileSync(absoluto);
}

async function fotoArredondada(buffer, largura, altura, raio = 28) {
  const mascara = Buffer.from(
    `<svg width="${largura}" height="${altura}"><rect width="${largura}" height="${altura}" rx="${raio}" fill="#fff"/></svg>`
  );
  return sharp(buffer)
    .rotate()
    .resize(largura, altura, { fit: "cover", position: "attention" })
    .composite([{ input: mascara, blend: "dest-in" }])
    .png()
    .toBuffer();
}

function marcaSvg(x, y, escala = 1) {
  return `
    <g transform="translate(${x} ${y}) scale(${escala})">
      <path d="M0 42 L42 5 L84 42 M15 32 V76 H69 V32" fill="none" stroke="#efbd43" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="103" y="30" class="marcaPeq">ESCRITÓRIO</text>
      <text x="100" y="73" class="marca">CAMPOS FIGUEIRA</text>
    </g>`;
}

function estilosSvg() {
  return `
    <defs>
      <linearGradient id="ouro" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff7cf"/>
        <stop offset=".42" stop-color="#f5c955"/>
        <stop offset="1" stop-color="#a56a0a"/>
      </linearGradient>
      <linearGradient id="escuro" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#050505" stop-opacity=".04"/>
        <stop offset=".62" stop-color="#050505" stop-opacity=".18"/>
        <stop offset="1" stop-color="#050505" stop-opacity=".96"/>
      </linearGradient>
      <filter id="sombra"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000" flood-opacity=".85"/></filter>
      <filter id="brilho"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#e5a927" flood-opacity=".85"/></filter>
      <style>
        text { font-family: Arial, Helvetica, sans-serif; fill: #fff; }
        .marca { font-size: 32px; font-weight: 800; letter-spacing: 1px; fill: url(#ouro); }
        .marcaPeq { font-size: 14px; font-weight: 700; letter-spacing: 7px; }
        .codigo { font-size: 44px; font-weight: 900; fill: url(#ouro); }
        .rotulo { font-size: 20px; font-weight: 800; letter-spacing: 2px; }
        .titulo { font-size: 57px; font-weight: 900; filter: url(#sombra); }
        .local { font-size: 30px; font-weight: 700; }
        .preco { font-size: 61px; font-weight: 900; fill: url(#ouro); filter: url(#brilho); }
        .detalhe { font-size: 24px; font-weight: 700; }
        .rodape { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
      </style>
    </defs>`;
}

function overlayFeed(c) {
  const titulo = `${c.tipo} em ${c.bairro}`;
  const detalhes = c.detalhes.length ? c.detalhes : ["Consulte os detalhes", "Agende sua visita"];
  const chips = detalhes.slice(0, 4);
  const chipW = chips.length <= 2 ? 494 : 242;
  const chipsSvg = chips.map((item, i) => {
    const coluna = chips.length <= 2 ? i : i % 2;
    const linha = chips.length <= 2 ? 0 : Math.floor(i / 2);
    const x = 32 + coluna * (chipW + 10);
    const y = 1065 + linha * 70;
    const fonte = tamanhoTexto(item, chipW - 42, 24, 16);
    return `<g><rect x="${x}" y="${y}" width="${chipW}" height="58" rx="20" fill="#111" stroke="#c99120" stroke-width="2"/><text x="${x + chipW / 2}" y="${y + 38}" text-anchor="middle" font-size="${fonte}" font-weight="700">${xml(item)}</text></g>`;
  }).join("");
  const fonteCodigo = tamanhoTexto(`CF-${c.codigo}`, 220, 44, 17);

  return Buffer.from(`
  <svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
    ${estilosSvg()}
    <rect width="1080" height="1350" fill="none"/>
    <rect x="0" y="0" width="1080" height="145" fill="#050505"/>
    ${marcaSvg(32, 28, 1)}
    <rect x="780" y="28" width="268" height="91" rx="24" fill="#090909" stroke="#e7b33d" stroke-width="3" filter="url(#brilho)"/>
    <text x="914" y="84" text-anchor="middle" font-size="${fonteCodigo}" font-weight="900" fill="url(#ouro)">CF-${xml(c.codigo)}</text>
    <rect x="32" y="156" width="1016" height="584" rx="30" fill="none" stroke="#d9a328" stroke-width="4"/>
    <rect x="48" y="671" width="220" height="54" rx="17" fill="#090909" stroke="#e7b33d" stroke-width="3"/>
    <text x="158" y="707" text-anchor="middle" class="rotulo">${xml(c.finalidade)}</text>
    <rect x="0" y="740" width="1080" height="610" fill="#050505"/>
    <line x1="32" y1="764" x2="1048" y2="764" stroke="#e2ab31" stroke-width="3"/>
    <text x="32" y="826" class="titulo">${tspans(titulo, 32, 826, 62, 30, 2, "titulo")}</text>
    ${marcadorLocal(52, 922)}
    <text x="84" y="943" class="local">${xml(c.bairro)} · ${xml(c.cidade)}</text>
    <text x="32" y="1020" class="preco">${xml(c.valor)}</text>
    ${chipsSvg}
    <line x1="32" y1="1245" x2="1048" y2="1245" stroke="#805914" stroke-width="2"/>
    <text x="32" y="1294" class="rodape">${xml(SITE)}</text>
    <text x="1048" y="1294" text-anchor="end" class="rodape">CRECI ${CRECI}</text>
    <text x="540" y="1330" text-anchor="middle" font-size="18" fill="#cda74d">WhatsApp (11) 2378-5643</text>
  </svg>`);
}

function overlayStory(c) {
  const titulo = `${c.tipo} em ${c.bairro}`;
  const detalhes = (c.detalhes.length ? c.detalhes : ["Agende sua visita"]).slice(0, 2);
  const fonteCodigo = tamanhoTexto(`CF-${c.codigo}`, 226, 44, 18);
  const detalhesSvg = detalhes.map((item, i) => `
    <rect x="64" y="${1290 + i * 67}" width="952" height="52" rx="18" fill="#0a0a0a" fill-opacity=".9" stroke="#d9a328" stroke-width="2"/>
    <text x="540" y="${1325 + i * 67}" text-anchor="middle" font-size="${tamanhoTexto(item, 860, 24, 18)}" font-weight="700">${xml(item)}</text>`).join("");

  return Buffer.from(`
  <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    ${estilosSvg()}
    <rect width="1080" height="1920" fill="url(#escuro)"/>
    <rect x="32" y="24" width="1016" height="916" rx="34" fill="none" stroke="#d9a328" stroke-width="4"/>
    <g filter="url(#sombra)">${marcaSvg(64, 278, 1.05)}</g>
    <rect x="742" y="276" width="274" height="94" rx="24" fill="#080808" fill-opacity=".92" stroke="#e7b33d" stroke-width="3" filter="url(#brilho)"/>
    <text x="879" y="334" text-anchor="middle" font-size="${fonteCodigo}" font-weight="900" fill="url(#ouro)">CF-${xml(c.codigo)}</text>
    <rect x="64" y="865" width="244" height="58" rx="18" fill="#090909" stroke="#e7b33d" stroke-width="3"/>
    <text x="186" y="903" text-anchor="middle" class="rotulo">${xml(c.finalidade)}</text>
    <rect x="32" y="972" width="1016" height="532" rx="34" fill="#050505" stroke="#d9a328" stroke-width="3"/>
    <text x="64" y="1048" class="titulo">${tspans(titulo, 64, 1048, 66, 27, 2, "titulo")}</text>
    ${marcadorLocal(84, 1170)}
    <text x="116" y="1191" class="local">${xml(c.bairro)} · ${xml(c.cidade)}</text>
    <text x="64" y="1260" class="preco">${xml(c.valor)}</text>
    ${detalhesSvg}
    <text x="540" y="1473" text-anchor="middle" font-size="20" fill="#d8b564">CRECI ${CRECI} · ${xml(SITE)}</text>
  </svg>`);
}

async function gerarArte(config, formato, fotos, destino) {
  const feed = formato === "feed";
  const largura = 1080;
  const altura = feed ? 1350 : 1920;
  const fundo = sharp({
    create: { width: largura, height: altura, channels: 4, background: "#050505" },
  });

  const composicoes = [];
  if (feed) {
    if (fotos.length >= 3) {
      composicoes.push(
        { input: await fotoArredondada(fotos[0], 670, 560), left: 32, top: 170 },
        { input: await fotoArredondada(fotos[1], 330, 270), left: 718, top: 170 },
        { input: await fotoArredondada(fotos[2], 330, 270), left: 718, top: 460 }
      );
    } else {
      composicoes.push({ input: await fotoArredondada(fotos[0], 1016, 560), left: 32, top: 170 });
    }
    composicoes.push({ input: overlayFeed(config), left: 0, top: 0 });
  } else {
    composicoes.push({
      input: await sharp(fotos[0]).rotate().resize(1080, 980, { fit: "cover", position: "attention" }).png().toBuffer(),
      left: 0,
      top: 0,
    });
    composicoes.push({ input: overlayStory(config), left: 0, top: 0 });
  }

  await fundo.composite(composicoes).png({ compressionLevel: 9 }).toFile(destino);
  const meta = await sharp(destino).metadata();
  if (meta.width !== largura || meta.height !== altura || meta.format !== "png") {
    throw new Error(`Arte inválida em ${destino}: ${meta.width}x${meta.height} ${meta.format}`);
  }
}

function montarLegenda(c) {
  if (String(c.caption || "").trim()) return String(c.caption).trim();
  const detalhes = c.detalhes.map((item) => `✅ ${item}`).join("\n");
  const interesse = encodeURIComponent(`Tenho interesse no imóvel CF-${c.codigo}`);
  return `${c.chamada}\n\n🏡 ${c.tipo} — ${c.bairro}, ${c.cidade}\n💰 ${c.valor}\n\n${detalhes}\n\n👇 Fale agora com nossa equipe:\n📲 https://wa.me/${WHATSAPP}?text=${interesse}\n\n✅ ${SITE}\nCRECI: ${CRECI}\n\n#mogidascruzes #imoveismogi #imobiliariamogi #casaavenda #apartamentomogi`;
}

function registrar(config, feedGerado, storyGerado, substituir) {
  const codigo = config.codigo;
  if (codigoInativo(codigo)) {
    throw new Error(`O imóvel CF-${codigo} está inativo e não pode voltar à fila.`);
  }
  const arquivo = `CF - ${nomeSeguro(codigo)}.png`;
  const manifest = lerJson(MANIFESTO);
  const captions = lerJson(CAPTIONS);
  const fotosJson = lerJson(FOTOS);
  const indiceCaption = captions.findIndex((item) => String(item.codigo_imovel) === codigo);
  const jaExiste = (manifest.ordem || []).includes(codigo) || indiceCaption >= 0;
  if (jaExiste && !substituir) {
    throw new Error(`O imóvel ${codigo} já está cadastrado. Use --substituir para atualizar conscientemente.`);
  }

  fs.mkdirSync(DEST_FEED, { recursive: true });
  fs.mkdirSync(DEST_STORY, { recursive: true });
  fs.copyFileSync(feedGerado, path.join(DEST_FEED, arquivo));
  fs.copyFileSync(storyGerado, path.join(DEST_STORY, arquivo));

  const base = `https://raw.githubusercontent.com/${OWNER}/${REPO}/refs/heads/${BRANCH}/public`;
  manifest.ordem = Array.isArray(manifest.ordem) ? manifest.ordem : [];
  manifest.urls = manifest.urls || {};
  manifest.urls_feed = manifest.urls_feed || {};
  if (!manifest.ordem.includes(codigo)) manifest.ordem.push(codigo);
  manifest.urls[codigo] = `${base}/anuncios/${encodeURIComponent(arquivo)}`;
  manifest.urls_feed[codigo] = `${base}/anuncios-feed/${encodeURIComponent(arquivo)}`;
  manifest.gerado_em = new Date().toISOString();

  const itemCaption = { codigo_imovel: codigo, arquivo, caption: montarLegenda(config) };
  if (indiceCaption >= 0) captions[indiceCaption] = itemCaption;
  else captions.push(itemCaption);

  const fotosPublicas = config.fotos.filter((foto) => /^https?:\/\//i.test(String(foto)));
  if (fotosPublicas.length) fotosJson[codigo] = fotosPublicas;

  gravarJsonAtomico(MANIFESTO, manifest);
  gravarJsonAtomico(CAPTIONS, captions);
  if (fotosPublicas.length) gravarJsonAtomico(FOTOS, fotosJson);
  return arquivo;
}

async function main() {
  const configArg = valorArg("--config");
  if (!configArg || tem("--ajuda") || tem("-h")) {
    console.log(`
GERADOR DE ARTES — CAMPOS FIGUEIRA

Uso:
  npm run arte:imovel -- --config caminho/do/imovel.json
  npm run arte:imovel -- --config caminho/do/imovel.json --registrar

Opções:
  --registrar     gera as artes oficiais e cadastra o imóvel na fila
  --substituir    permite atualizar um código já cadastrado
  --saida PASTA   destino da prévia (sem --registrar)
`);
    if (!configArg) return;
  }

  const arquivoConfig = path.resolve(process.cwd(), configArg);
  if (!fs.existsSync(arquivoConfig)) throw new Error(`Configuração não encontrada: ${arquivoConfig}`);
  const config = validarConfig(lerJson(arquivoConfig));
  const pastaConfig = path.dirname(arquivoConfig);
  const fotos = await Promise.all(config.fotos.slice(0, 3).map((foto) => carregarFoto(foto, pastaConfig)));

  const pastaSaida = tem("--registrar")
    ? path.join(ROOT, ".tmp-artes", `${nomeSeguro(config.codigo)}-${Date.now()}`)
    : path.resolve(process.cwd(), valorArg("--saida", path.join("arte-gerada", nomeSeguro(config.codigo))));
  fs.mkdirSync(pastaSaida, { recursive: true });
  const feed = path.join(pastaSaida, `CF - ${nomeSeguro(config.codigo)} - FEED.png`);
  const story = path.join(pastaSaida, `CF - ${nomeSeguro(config.codigo)} - STORY.png`);

  console.log(`\n🎨 Gerando CF-${config.codigo}...`);
  await gerarArte(config, "feed", fotos, feed);
  await gerarArte(config, "story", fotos, story);
  console.log(`✅ Feed:  1080x1350 — ${feed}`);
  console.log(`✅ Story: 1080x1920 — ${story}`);

  if (tem("--registrar")) {
    const arquivo = registrar(config, feed, story, tem("--substituir"));
    fs.rmSync(pastaSaida, { recursive: true, force: true });
    console.log(`✅ ${arquivo} cadastrado no fim da fila.`);
    console.log("Próximo passo: revise as artes e faça commit/push dos arquivos gerados.\n");
  } else {
    console.log("ℹ️  Esta é uma prévia. Use --registrar depois de aprovar o resultado.\n");
  }
}

if (require.main === module) {
  main().catch((erro) => {
    console.error(`\n❌ ${erro.message}\n`);
    process.exit(1);
  });
}

module.exports = { gerarArte, montarLegenda, validarConfig };
