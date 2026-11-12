"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const VIDEO_DIR = path.join(ROOT, "public", "videos-remotion-imoveis-v2-narrados");
const CAPTIONS_PATH = path.join(ROOT, "src", "content", "captions-imoveis.json");
const BASE_PATH = path.join(ROOT, "src", "content", "base-imoveis-site.json");
const ALIASES_PATH = path.join(ROOT, "src", "content", "aliases-imoveis.json");
const MANIFEST_PATH = path.join(ROOT, "src", "content", "videos-imoveis.json");

const YOUTUBE = "https://www.youtube.com/@Escrit%C3%B3rioCamposFigueira";
const TIKTOK = "https://www.tiktok.com/@henriquesfigueira";
const WHATSAPP = "551123785643";
const CRECI = "043649-J";
const RAW_BASE = "https://raw.githubusercontent.com/escritoriocamposfigueira-commits/dashboard/claude/campos-figueira-growth-qmjsux";

function normalizarCodigo(valor) {
  return String(valor || "")
    .toUpperCase()
    .replace(/-(VENDA|LOCACAO)$/i, "")
    .replace(/^CF\s*-?\s*/, "")
    .replace(/[^A-Z0-9]/g, "");
}

function formatarPreco(valor) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(valor));
}

function finalidadeLegenda(item, anuncios) {
  const codigo = String(item.codigo_imovel || "");
  if (/-LOCACAO$/i.test(codigo)) return "locacao";
  if (/-VENDA$/i.test(codigo)) return "venda";
  const canonico = normalizarCodigo(codigo);
  const opcoes = anuncios.filter((anuncio) => normalizarCodigo(anuncio.codigo) === canonico);
  if (opcoes.length === 1) return opcoes[0].finalidade;
  if (/\(LOCAÇÃO\)|PARA LOCAÇÃO|R\$\s*[\d.]+\/MÊS/i.test(item.caption || "")) return "locacao";
  return "venda";
}

function codigoCanonicoLegenda(item, aliases) {
  const original = String(item.codigo_imovel || "").replace(/-(VENDA|LOCACAO)$/i, "");
  return aliases[original] || original;
}

function encontrarLegenda(captions, aliases, anuncios, codigo, finalidade) {
  const alvo = normalizarCodigo(codigo);
  const candidatas = captions.filter((item) => {
    const canonico = codigoCanonicoLegenda(item, aliases);
    return normalizarCodigo(canonico) === alvo;
  });
  if (candidatas.length === 1) return candidatas[0];
  return candidatas.find((item) => finalidadeLegenda(item, anuncios) === finalidade) || null;
}

function referenciaPublica(item, finalidade) {
  const base = String(item.codigo_imovel || "").replace(/-(VENDA|LOCACAO)$/i, "");
  if (/^[0-9]+[A-Z]?$/.test(base)) return `CF-${base} ${finalidade.toUpperCase()}`;
  return base;
}

function criarLegenda618(anuncio) {
  return {
    codigo_imovel: "618",
    arquivo: "CF - 618.png",
    caption: `Espaço de verdade para a família crescer e aproveitar cada momento em casa.
Este sobrado reúne ambientes bem distribuídos e lazer para receber quem você ama.

🏡 Sobrado — Jardim Apolo, Mogi das Cruzes
💰 R$ 600.000

✅ 4 dormitórios, sendo 1 suíte
✅ 2 salas aconchegantes
✅ Cozinha totalmente azulejada
✅ 2 banheiros
✅ Área de serviço
✅ Garagem para aproximadamente 2 veículos
✅ Área de lazer com churrasqueira

Conforto para a rotina e espaço para os encontros especiais da família.

📸 Veja todas as fotos e os detalhes:
🔗 ${String(anuncio.url).replace(/ /g, "%20")}

👇 Manda "JARDIM APOLO 618" no WhatsApp:
📲 https://wa.me/${WHATSAPP}?text=Tenho%20interesse%20no%20JARDIM%20APOLO%20618

Conheça nossas redes sociais!
📃 escritoriocamposfigueira@gmail.com
📲 instagram.com/escritorio.figueira
📲 instagram.com/henriquefigueiraoficial
📮 facebook.com/Escritorio.figueira
✅ https://www.escritoriocamposfigueira.com.br
⏰ Seg a Sex · 10h às 18h
CRECI-PJ: ${CRECI}

#sobradoavenda #jardimapolo #mogidascruzes #imoveismogi #churrasqueira #imobiliariamogi`,
  };
}

function inserirAntesDoWhatsapp(texto, bloco) {
  const marcador = /\n👇[^\n]*WhatsApp[^\n]*:/i;
  if (marcador.test(texto)) return texto.replace(marcador, `\n${bloco}\n$&`);
  const linhaWhatsapp = /\n📲\s*https:\/\/wa\.me\//i;
  if (linhaWhatsapp.test(texto)) return texto.replace(linhaWhatsapp, `\n${bloco}\n$&`);
  return `${texto.trim()}\n\n${bloco}`;
}

function atualizarLegenda(item, anuncio) {
  let texto = String(item.caption || "").replace(/\r/g, "").trim();
  const precoFormatado = formatarPreco(anuncio.preco);
  const precoOficial = `R$ ${precoFormatado}${anuncio.finalidade === "locacao" ? "/mês" : ""}`;
  const precoRegex = new RegExp(`R\\$\\s*${precoFormatado.replace(/\./g, "\\.")}(?:,00)?`, "i");

  if (anuncio.preco > 0 && !precoRegex.test(texto)) {
    const linhaPrincipal = /^💰\s*R\$\s*[\d.]+(?:,\d{2})?(?:\/mês)?/m;
    if (linhaPrincipal.test(texto)) {
      texto = texto.replace(linhaPrincipal, `💰 ${precoOficial}`);
    } else {
      const primeiraQuebra = texto.indexOf("\n\n");
      texto = primeiraQuebra >= 0
        ? `${texto.slice(0, primeiraQuebra)}\n\n💰 ${precoOficial}${texto.slice(primeiraQuebra)}`
        : `💰 ${precoOficial}\n\n${texto}`;
    }
  }

  // Divergência histórica já confirmada: o cadastro vigente do CF-575 vale R$ 2 milhões.
  if (normalizarCodigo(anuncio.codigo) === "575") {
    texto = texto.replace(/R\$\s*1\.800\.000(?:,00)?/gi, "R$ 2.000.000");
  }

  const linkImovel = String(anuncio.url).replace(/ /g, "%20");
  const linhaLink = /^🔗\s*https?:\/\/www\.escritoriocamposfigueira\.com\.br\/imovel\/.*$/gim;
  if (linhaLink.test(texto)) {
    texto = texto.replace(linhaLink, `🔗 ${linkImovel}`);
  } else {
    texto = inserirAntesDoWhatsapp(texto, `📸 Veja todas as fotos e os detalhes:\n🔗 ${linkImovel}`);
  }

  const referencia = referenciaPublica(item, anuncio.finalidade);
  const linkWhatsapp = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Tenho interesse no ${referencia}`)}`;
  const linhaWa = /^📲\s*(?:https?:\/\/)?wa\.me\/\d+(?:\?text=[^\s]*)?.*$/gim;
  if (linhaWa.test(texto)) {
    texto = texto.replace(linhaWa, `📲 ${linkWhatsapp}`);
  } else {
    texto = inserirAntesDoWhatsapp(texto, `👇 Fale agora com a Campos Figueira:\n📲 ${linkWhatsapp}`);
  }

  texto = texto
    .replace(/^.*youtube\.com\/.*$/gim, "")
    .replace(/^.*tiktok\.com\/.*$/gim, "")
    .replace(/CRECI(?:-PJ)?\s*:\s*043649-J/gi, `CRECI-PJ: ${CRECI}`);

  const redes = `▶️ ${YOUTUBE}\n🎵 ${TIKTOK}`;
  if (/^✅\s*(?:https?:\/\/)?(?:www\.)?escritoriocamposfigueira\.com\.br\s*$/im.test(texto)) {
    texto = texto.replace(
      /^✅\s*(?:https?:\/\/)?(?:www\.)?escritoriocamposfigueira\.com\.br\s*$/im,
      `${redes}\n✅ https://www.escritoriocamposfigueira.com.br`,
    );
  } else if (/^⏰/m.test(texto)) {
    texto = texto.replace(/^⏰/m, `${redes}\n✅ https://www.escritoriocamposfigueira.com.br\n⏰`);
  } else {
    texto += `\n\n${redes}\n✅ https://www.escritoriocamposfigueira.com.br`;
  }

  if (!/CRECI-PJ:\s*043649-J/i.test(texto)) texto += `\nCRECI-PJ: ${CRECI}`;
  return texto.replace(/\n{3,}/g, "\n\n").trim();
}

function carregarVideos() {
  return fs.readdirSync(VIDEO_DIR)
    .filter((nome) => nome.toLowerCase().endsWith(".mp4"))
    .sort()
    .map((nome) => {
      const match = nome.match(/^CF-(.+)-(VENDA|LOCACAO)-NARRADO\.mp4$/i);
      if (!match) throw new Error(`Nome de vídeo fora do padrão: ${nome}`);
      return { nome, codigoNormalizado: normalizarCodigo(match[1]), finalidade: match[2].toLowerCase() };
    });
}

function preparar() {
  const videos = carregarVideos();
  const captions = JSON.parse(fs.readFileSync(CAPTIONS_PATH, "utf8"));
  const anuncios = JSON.parse(fs.readFileSync(BASE_PATH, "utf8")).anuncios;
  const aliases = JSON.parse(fs.readFileSync(ALIASES_PATH, "utf8"));
  const manifest = [];
  const erros = [];

  for (const video of videos) {
    const anuncio = anuncios.find((item) =>
      normalizarCodigo(item.codigo) === video.codigoNormalizado && item.finalidade === video.finalidade);
    if (!anuncio) {
      erros.push(`${video.nome}: anúncio oficial ausente`);
      continue;
    }
    let legenda = encontrarLegenda(captions, aliases, anuncios, anuncio.codigo, anuncio.finalidade);
    if (!legenda && normalizarCodigo(anuncio.codigo) === "618" && anuncio.finalidade === "venda") {
      legenda = criarLegenda618(anuncio);
      captions.push(legenda);
    }
    if (!legenda) {
      erros.push(`${video.nome}: legenda específica ausente`);
      continue;
    }
    legenda.caption = atualizarLegenda(legenda, anuncio);
    const arquivoVideo = `public/videos-remotion-imoveis-v2-narrados/${video.nome}`;
    manifest.push({
      codigo: anuncio.codigo,
      finalidade: anuncio.finalidade,
      arquivo_video: arquivoVideo,
      url_video: `${RAW_BASE}/${arquivoVideo.split("/").map(encodeURIComponent).join("/")}`,
    });
  }

  if (erros.length) throw new Error(erros.join("\n"));
  fs.writeFileSync(CAPTIONS_PATH, `${JSON.stringify(captions, null, 2)}\n`, "utf8");
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Preparados ${manifest.length} vídeos e respectivas legendas.`);
}

function auditar() {
  const captions = JSON.parse(fs.readFileSync(CAPTIONS_PATH, "utf8"));
  const anuncios = JSON.parse(fs.readFileSync(BASE_PATH, "utf8")).anuncios;
  const aliases = JSON.parse(fs.readFileSync(ALIASES_PATH, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const erros = [];
  if (manifest.length !== 82) erros.push(`manifesto tem ${manifest.length}, esperado 82`);

  for (const item of manifest) {
    const anuncio = anuncios.find((a) => normalizarCodigo(a.codigo) === normalizarCodigo(item.codigo) && a.finalidade === item.finalidade);
    const legenda = anuncio && encontrarLegenda(captions, aliases, anuncios, anuncio.codigo, anuncio.finalidade);
    const arquivo = path.join(ROOT, item.arquivo_video);
    if (!anuncio) erros.push(`${item.codigo}/${item.finalidade}: anúncio ausente`);
    if (!legenda) erros.push(`${item.codigo}/${item.finalidade}: legenda ausente`);
    if (!fs.existsSync(arquivo) || fs.statSync(arquivo).size < 1024 * 1024) erros.push(`${item.codigo}/${item.finalidade}: MP4 inválido`);
    if (!/^https:\/\//.test(item.url_video)) erros.push(`${item.codigo}/${item.finalidade}: URL pública inválida`);
    if (!legenda) continue;
    const texto = legenda.caption;
    const preco = formatarPreco(anuncio.preco);
    if (anuncio.preco > 0 && !new RegExp(`R\\$\\s*${preco.replace(/\./g, "\\.")}`).test(texto)) erros.push(`${item.codigo}/${item.finalidade}: preço oficial ausente`);
    if (!texto.includes("wa.me/551123785643?text=")) erros.push(`${item.codigo}/${item.finalidade}: WhatsApp inválido`);
    if (!texto.includes(String(anuncio.url).replace(/ /g, "%20"))) erros.push(`${item.codigo}/${item.finalidade}: link específico inválido`);
    if (!texto.includes("youtube.com/@Escrit%C3%B3rioCamposFigueira")) erros.push(`${item.codigo}/${item.finalidade}: YouTube ausente`);
    if (!texto.includes("tiktok.com/@henriquesfigueira")) erros.push(`${item.codigo}/${item.finalidade}: TikTok ausente`);
    if (!texto.includes(`CRECI-PJ: ${CRECI}`)) erros.push(`${item.codigo}/${item.finalidade}: CRECI ausente`);
  }
  if (manifest.some((item) => normalizarCodigo(item.codigo) === "537" || normalizarCodigo(item.codigo) === "FD1FEFC4")) {
    erros.push("CF-537 ou CF-FD1FEFC4 entrou indevidamente no manifesto");
  }
  if (erros.length) throw new Error(`Auditoria falhou (${erros.length}):\n${erros.join("\n")}`);
  console.log("Auditoria aprovada: 82/82 vídeos, legendas, links, preços e contatos válidos.");
}

if (require.main === module) {
  if (process.argv.includes("--check")) auditar();
  else {
    preparar();
    auditar();
  }
}

module.exports = { auditar, normalizarCodigo, preparar };
