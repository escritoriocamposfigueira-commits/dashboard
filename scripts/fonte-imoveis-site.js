"use strict";

const XML_FEED_URL = "https://ggfjmqttrktsfcaymsvu.supabase.co/functions/v1/property-xml-feed";
const DOMINIO_FOTOS_ATUAL = "escritoriocamposfigueira.com.br/uploads/imoveis/";

function semAcentos(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarCodigo(codigo) {
  let valor = semAcentos(codigo)
    .trim()
    .toUpperCase()
    .replace(/^CF\s*-?\s*/, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
  if (!valor) return "";
  return `CF-${valor}`;
}

function chaveAlias(codigo) {
  return semAcentos(codigo).trim().toUpperCase().replace(/\s+/g, " ");
}

function separarChavePublicacao(chave, finalidadePadrao = "") {
  const texto = String(chave ?? "").trim();
  const variante = texto.match(/^(.*?)-(VENDA|LOCACAO)$/i);
  const base = variante ? variante[1] : texto;
  const finalidade = variante
    ? variante[2].toLowerCase()
    : normalizarFinalidade(finalidadePadrao);
  return {
    chave: texto,
    codigo: normalizarCodigo(base),
    finalidade,
  };
}

function normalizarFinalidade(valor) {
  const texto = semAcentos(valor).trim().toLowerCase();
  if (["venda", "for sale", "sale"].includes(texto)) return "venda";
  if (["locacao", "aluguel", "for rent", "rent"].includes(texto)) return "locacao";
  return "";
}

function resolverCodigoFonte(chave, aliases = {}) {
  const separada = separarChavePublicacao(chave);
  const alias = aliases[chaveAlias(separada.chave)]
    || aliases[chaveAlias(String(separada.chave).replace(/-(VENDA|LOCACAO)$/i, ""))];
  return alias ? normalizarCodigo(alias) : separada.codigo;
}

function decodificarXml(valor) {
  return String(valor ?? "")
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function conteudoTag(bloco, tag) {
  const achado = String(bloco).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return achado ? decodificarXml(achado[1]) : "";
}

function conteudosTag(bloco, tag) {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi");
  return [...String(bloco).matchAll(regex)].map((item) => decodificarXml(item[1]));
}

function numeroTag(bloco, tag) {
  const valor = conteudoTag(bloco, tag).replace(/[^0-9,.-]/g, "").replace(",", ".");
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function parseListingsXml(xml) {
  const listings = [];
  for (const achado of String(xml).matchAll(/<Listing>([\s\S]*?)<\/Listing>/gi)) {
    const bloco = achado[1];
    const listingId = conteudoTag(bloco, "ListingID");
    const finalidade = normalizarFinalidade(conteudoTag(bloco, "TransactionType"));
    const codigoId = listingId.replace(/-(venda|locacao)$/i, "");
    const codigo = normalizarCodigo(codigoId);
    if (!codigo || !finalidade) continue;
    const fotos = [...new Set(conteudosTag(conteudoTag(bloco, "Media"), "Item"))]
      .filter((url) => /^https:\/\//i.test(url));
    const preco = finalidade === "venda"
      ? numeroTag(bloco, "ListPrice")
      : numeroTag(bloco, "RentalPrice");
    listings.push({
      listing_id: listingId,
      codigo,
      finalidade,
      titulo: conteudoTag(bloco, "Title"),
      url: conteudoTag(bloco, "DetailViewUrl"),
      tipo: conteudoTag(bloco, "PropertyType"),
      descricao: conteudoTag(bloco, "Description"),
      preco,
      quartos: numeroTag(bloco, "Bedrooms"),
      banheiros: numeroTag(bloco, "Bathrooms"),
      vagas: numeroTag(bloco, "Garage"),
      area: numeroTag(bloco, "LivingArea"),
      bairro: conteudoTag(bloco, "Neighborhood"),
      cidade: conteudoTag(bloco, "City"),
      fotos,
    });
  }
  return listings;
}

function indexarCatalogo(listings) {
  const indice = new Map();
  for (const item of listings || []) {
    indice.set(`${item.codigo}|${item.finalidade}`, item);
  }
  return indice;
}

function obterImovel(catalogo, chave, finalidadePadrao, aliases = {}) {
  const indice = catalogo instanceof Map ? catalogo : indexarCatalogo(catalogo);
  const separada = separarChavePublicacao(chave, finalidadePadrao);
  const codigo = resolverCodigoFonte(chave, aliases);
  const finalidade = separada.finalidade || normalizarFinalidade(finalidadePadrao);
  if (finalidade) return indice.get(`${codigo}|${finalidade}`) || null;
  const encontrados = ["venda", "locacao"]
    .map((tipo) => indice.get(`${codigo}|${tipo}`))
    .filter(Boolean);
  return encontrados.length === 1 ? encontrados[0] : null;
}

function validarMetadadosImovel(imovel, minimoFotos = 6) {
  const erros = [];
  if (!imovel) return { ok: false, erros: ["imóvel não encontrado na fonte oficial"] };
  if (!(Number(imovel.preco) > 0)) erros.push("preço ausente ou zerado");
  if (!Array.isArray(imovel.fotos) || imovel.fotos.length < minimoFotos) {
    erros.push(`menos de ${minimoFotos} fotos reais`);
  }
  if (!imovel.url) erros.push("link específico ausente");
  return { ok: erros.length === 0, erros };
}

async function buscarCatalogo({ url = XML_FEED_URL, tentativas = 3, timeoutMs = 30_000 } = {}) {
  let ultimoErro;
  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    const controlador = new AbortController();
    const timer = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      const resposta = await fetch(url, {
        headers: { "User-Agent": "campos-figueira-bot/2.0" },
        signal: controlador.signal,
      });
      if (!resposta.ok) throw new Error(`fonte oficial respondeu HTTP ${resposta.status}`);
      const xml = await resposta.text();
      const listings = parseListingsXml(xml);
      if (!listings.length) throw new Error("fonte oficial não retornou imóveis");
      return { url, xml, listings, indice: indexarCatalogo(listings) };
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa < tentativas) await new Promise((resolve) => setTimeout(resolve, tentativa * 1_000));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`não foi possível consultar a fonte oficial: ${ultimoErro?.message || "erro desconhecido"}`);
}

async function verificarUrlImagem(url, timeoutMs = 20_000, tentativas = 3) {
  const executar = async (method) => {
    const controlador = new AbortController();
    const timer = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      const resposta = await fetch(url, {
        method,
        headers: {
          "User-Agent": "campos-figueira-validacao/2.0",
          ...(method === "GET" ? { Range: "bytes=0-1023" } : {}),
        },
        redirect: "follow",
        signal: controlador.signal,
      });
      const tipo = String(resposta.headers.get("content-type") || "").toLowerCase();
      return { ok: resposta.ok && tipo.startsWith("image/"), status: resposta.status, tipo };
    } finally {
      clearTimeout(timer);
    }
  };
  let ultimo = { ok: false, status: 0, erro: "falha desconhecida" };
  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    try {
      let resultado = await executar("HEAD");
      if ([403, 405].includes(resultado.status)) resultado = await executar("GET");
      ultimo = resultado;
      if (resultado.ok || (resultado.status < 500 && resultado.status !== 429)) return resultado;
    } catch (erro) {
      ultimo = { ok: false, status: 0, erro: erro.message };
    }
    if (tentativa < tentativas) {
      await new Promise((resolve) => setTimeout(resolve, tentativa * 500));
    }
  }
  return ultimo;
}

async function validarImovelComUrls(imovel, { minimoFotos = 6, maximoUrls = 6 } = {}) {
  const metadados = validarMetadadosImovel(imovel, minimoFotos);
  if (!metadados.ok) return metadados;
  const urls = imovel.fotos.slice(0, Math.max(minimoFotos, maximoUrls));
  const resultados = await Promise.all(
    urls.map(async (url) => ({ url, ...(await verificarUrlImagem(url)) })),
  );
  const falhas = resultados.filter((item) => !item.ok);
  return {
    ok: falhas.length === 0,
    erros: falhas.map((item) => `foto HTTP ${item.status || 0}: ${item.url}`),
    urls: resultados,
  };
}

module.exports = {
  DOMINIO_FOTOS_ATUAL,
  XML_FEED_URL,
  buscarCatalogo,
  chaveAlias,
  indexarCatalogo,
  normalizarCodigo,
  normalizarFinalidade,
  obterImovel,
  parseListingsXml,
  resolverCodigoFonte,
  separarChavePublicacao,
  validarImovelComUrls,
  validarMetadadosImovel,
  verificarUrlImagem,
};
