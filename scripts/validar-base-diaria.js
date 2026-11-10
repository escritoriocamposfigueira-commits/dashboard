"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buscarCatalogo,
  chaveAlias,
  normalizarCodigo,
  obterImovel,
  resolverCodigoFonte,
  separarChavePublicacao,
  validarImovelComUrls,
  validarMetadadosImovel,
  verificarUrlImagem,
} = require("./fonte-imoveis-site");
const { filtrarCodigosAtivos } = require("./imoveis-inativos");

const RAIZ = path.resolve(__dirname, "..");
const MANIFESTO = path.join(RAIZ, "src", "content", "imagens-urls.json");
const ALIASES = path.join(RAIZ, "src", "content", "aliases-imoveis.json");
const SAIDA = path.join(RAIZ, "controle", "validacao-base-diaria.json");

function lerJson(arquivo) {
  return JSON.parse(fs.readFileSync(arquivo, "utf8"));
}

function normalizarAliases(aliases) {
  return Object.fromEntries(
    Object.entries(aliases || {}).map(([alias, codigo]) => [chaveAlias(alias), normalizarCodigo(codigo)]),
  );
}

function finalidadeDaChave(indice, chave, aliases, fallback = "") {
  const explicita = separarChavePublicacao(chave, fallback).finalidade;
  if (explicita) return explicita;
  const codigo = resolverCodigoFonte(chave, aliases);
  const venda = indice.has(`${codigo}|venda`);
  const locacao = indice.has(`${codigo}|locacao`);
  if (venda && !locacao) return "venda";
  if (locacao && !venda) return "locacao";
  return "";
}

async function validarItem({ chave, manifest, indice, aliases, checarUrls = true }) {
  const finalidade = finalidadeDaChave(indice, chave, aliases);
  const imovel = obterImovel(indice, chave, finalidade, aliases);
  const metadados = validarMetadadosImovel(imovel, 6);
  const erros = [...metadados.erros];
  const arteFeed = manifest.urls_feed?.[chave];
  const arteStory = manifest.urls?.[chave];
  if (!arteFeed) erros.push("arte 4:5 ausente no manifesto");
  if (!arteStory) erros.push("arte 9:16 ausente no manifesto");

  if (checarUrls && metadados.ok) {
    const validacaoFotos = await validarImovelComUrls(imovel, { minimoFotos: 6, maximoUrls: 6 });
    erros.push(...validacaoFotos.erros);
  }
  if (checarUrls) {
    for (const [rotulo, url] of [["arte 4:5", arteFeed], ["arte 9:16", arteStory]]) {
      if (!url) continue;
      const resultado = await verificarUrlImagem(url);
      if (!resultado.ok) erros.push(`${rotulo} respondeu HTTP ${resultado.status || 0}`);
    }
  }

  return {
    chave,
    codigo: resolverCodigoFonte(chave, aliases),
    finalidade: finalidade || "indefinida",
    titulo: imovel?.titulo || null,
    preco: imovel?.preco || 0,
    fotos: imovel?.fotos?.length || 0,
    url: imovel?.url || null,
    situacao: erros.length ? "bloqueado" : "aprovado",
    erros,
  };
}

async function mapearComLimite(itens, limite, fn) {
  const resultados = new Array(itens.length);
  let cursor = 0;
  async function trabalhador() {
    while (cursor < itens.length) {
      const indice = cursor;
      cursor += 1;
      resultados[indice] = await fn(itens[indice], indice);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

function resumoMarkdown(relatorio) {
  const bloqueados = relatorio.itens.filter((item) => item.situacao === "bloqueado");
  return [
    "## Validação diária da base de imóveis",
    "",
    `- Fonte oficial: ${relatorio.fonte}`,
    `- Fila ativa conferida: ${relatorio.itens.length}`,
    `- Aprovados: ${relatorio.aprovados}`,
    `- Bloqueados: ${bloqueados.length}`,
    "",
    ...(bloqueados.length
      ? ["| Código | Finalidade | Motivo |", "|---|---|---|", ...bloqueados.map((item) => `| ${item.chave} | ${item.finalidade} | ${item.erros.join("; ")} |`)]
      : ["Todos os imóveis ativos foram aprovados."]),
    "",
  ].join("\n");
}

async function main() {
  const semRede = process.argv.includes("--sem-rede");
  const manifest = lerJson(MANIFESTO);
  const aliases = normalizarAliases(lerJson(ALIASES));
  const fonte = await buscarCatalogo();
  const ordem = filtrarCodigosAtivos(manifest.ordem).map(String);
  const itens = await mapearComLimite(ordem, semRede ? 1 : 8, (chave) => validarItem({
    chave,
    manifest,
    indice: fonte.indice,
    aliases,
    checarUrls: !semRede,
  }));
  const relatorio = {
    gerado_em: new Date().toISOString(),
    fonte: fonte.url,
    anuncios_fonte: fonte.listings.length,
    imoveis_fonte: new Set(fonte.listings.map((item) => item.codigo)).size,
    aprovados: itens.filter((item) => item.situacao === "aprovado").length,
    bloqueados: itens.filter((item) => item.situacao === "bloqueado").length,
    itens,
  };
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, `${JSON.stringify(relatorio, null, 2)}\n`, "utf8");
  const markdown = resumoMarkdown(relatorio);
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
}

if (require.main === module) {
  main().catch((erro) => {
    console.error(`Falha fatal ao validar a fonte oficial: ${erro.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  finalidadeDaChave,
  mapearComLimite,
  resumoMarkdown,
  validarItem,
};
