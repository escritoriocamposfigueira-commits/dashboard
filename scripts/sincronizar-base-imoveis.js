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
} = require("./fonte-imoveis-site");

const RAIZ = path.resolve(__dirname, "..");
const CONTEUDO = path.join(RAIZ, "src", "content");
const ARQUIVOS = {
  aliases: path.join(CONTEUDO, "aliases-imoveis.json"),
  base: path.join(CONTEUDO, "base-imoveis-site.json"),
  captions: path.join(CONTEUDO, "captions-imoveis.json"),
  fotos: path.join(CONTEUDO, "fotos-imoveis.json"),
  manifest: path.join(CONTEUDO, "imagens-urls.json"),
  pendencias: path.join(CONTEUDO, "migracao-urls-pendencias.json"),
};
const DOMINIO_ANTIGO = "llktqtuzznpavszkszpu.supabase.co";

function lerJson(arquivo) {
  return JSON.parse(fs.readFileSync(arquivo, "utf8"));
}

function escreverJson(arquivo, valor) {
  fs.writeFileSync(arquivo, `${JSON.stringify(valor, null, 2)}\n`, "utf8");
}

function normalizarAliases(aliases) {
  return Object.fromEntries(
    Object.entries(aliases || {}).map(([alias, codigo]) => [chaveAlias(alias), normalizarCodigo(codigo)]),
  );
}

function finalidadeUnica(indice, codigo) {
  const venda = indice.get(`${codigo}|venda`);
  const locacao = indice.get(`${codigo}|locacao`);
  if (venda && !locacao) return "venda";
  if (locacao && !venda) return "locacao";
  return "";
}

function resolverImovel(indice, chave, aliases) {
  const separada = separarChavePublicacao(chave);
  const codigo = resolverCodigoFonte(chave, aliases);
  const finalidade = separada.finalidade || finalidadeUnica(indice, codigo);
  return obterImovel(indice, chave, finalidade, aliases)
    || indice.get(`${codigo}|venda`)
    || indice.get(`${codigo}|locacao`)
    || null;
}

function substituir584NoManifesto(manifest) {
  const ordem = [];
  for (const codigo of manifest.ordem || []) {
    if (String(codigo) === "584") {
      ordem.push("584-VENDA", "584-LOCACAO");
    } else {
      ordem.push(String(codigo));
    }
  }
  manifest.ordem = [...new Set(ordem)];
  for (const campo of ["urls", "urls_feed"]) {
    if (!manifest[campo]?.["584"]) continue;
    manifest[campo]["584-VENDA"] = manifest[campo]["584"];
    manifest[campo]["584-LOCACAO"] = manifest[campo]["584"];
  }
}

function caption584(original, finalidade) {
  let texto = String(original || "");
  if (finalidade === "venda") {
    texto = texto
      .replace("🏡 Casa em condomínio fechado — Vila Moraes, Mogi das Cruzes", "🏡 Casa em condomínio fechado à venda — Vila Moraes, Mogi das Cruzes")
      .replace("💰 R$ 1.400.000 (ou locação R$ 8.500/mês)", "💰 R$ 1.400.000")
      .replace('👇 Manda "FIGUEIRAS 584" no WhatsApp agora:', '👇 Manda "COMPRAR 584" no WhatsApp agora:')
      .replace("Tenho%20interesse%20no%20FIGUEIRAS%20584", "Tenho%20interesse%20em%20COMPRAR%20o%20CF-584");
  } else {
    texto = texto
      .replace("🏡 Casa em condomínio fechado — Vila Moraes, Mogi das Cruzes", "🏡 Casa em condomínio fechado para locação — Vila Moraes, Mogi das Cruzes")
      .replace("💰 R$ 1.400.000 (ou locação R$ 8.500/mês)", "💰 R$ 8.500/mês")
      .replace(/\n💰 ACEITA FINANCIAMENTO BANCÁRIO · ACEITA APARTAMENTO como parte do pagamento\.\n/, "\n")
      .replace('👇 Manda "FIGUEIRAS 584" no WhatsApp agora:', '👇 Manda "ALUGAR 584" no WhatsApp agora:')
      .replace("Tenho%20interesse%20no%20FIGUEIRAS%20584", "Tenho%20interesse%20em%20ALUGAR%20o%20CF-584");
  }
  return texto;
}

function separarCaption584(captions) {
  const indice = captions.findIndex((item) => String(item.codigo_imovel) === "584");
  if (indice < 0) throw new Error("Legenda original do CF-584 não encontrada.");
  const original = captions[indice];
  const novos = [
    {
      ...original,
      codigo_imovel: "584-VENDA",
      finalidade: "venda",
      caption: caption584(original.caption, "venda"),
    },
    {
      ...original,
      codigo_imovel: "584-LOCACAO",
      finalidade: "locacao",
      caption: caption584(original.caption, "locacao"),
    },
  ];
  captions.splice(indice, 1, ...novos);
}

async function main() {
  const fonte = await buscarCatalogo();
  const aliases = normalizarAliases(lerJson(ARQUIVOS.aliases));
  const manifest = lerJson(ARQUIVOS.manifest);
  const captions = lerJson(ARQUIVOS.captions);
  const fotos = lerJson(ARQUIVOS.fotos);
  const pendencias = [];

  substituir584NoManifesto(manifest);
  if (captions.some((item) => String(item.codigo_imovel) === "584")) separarCaption584(captions);

  const chaves = new Set([...Object.keys(fotos), ...(manifest.ordem || [])]);
  for (const chave of chaves) {
    const imovel = resolverImovel(fonte.indice, chave, aliases);
    const urlsAtuais = Array.isArray(fotos[chave]) ? fotos[chave] : [];
    const antigas = urlsAtuais.filter((url) => String(url).includes(DOMINIO_ANTIGO));
    if (imovel) {
      fotos[chave] = imovel.fotos;
    } else if (antigas.length) {
      fotos[chave] = [];
      pendencias.push({
        chave,
        codigo_normalizado: resolverCodigoFonte(chave, aliases),
        urls_antigas_removidas: antigas.length,
        motivo: "sem correspondência na fonte oficial; imóvel não será publicado",
      });
    }
  }
  fotos["584-VENDA"] = [...(fonte.indice.get("CF-584|venda")?.fotos || [])];
  fotos["584-LOCACAO"] = [...(fonte.indice.get("CF-584|locacao")?.fotos || [])];

  const base = {
    gerado_em: new Date().toISOString(),
    fonte: fonte.url,
    total_anuncios: fonte.listings.length,
    total_imoveis: new Set(fonte.listings.map((item) => item.codigo)).size,
    anuncios: fonte.listings,
  };

  escreverJson(ARQUIVOS.base, base);
  escreverJson(ARQUIVOS.manifest, manifest);
  escreverJson(ARQUIVOS.captions, captions);
  escreverJson(ARQUIVOS.fotos, fotos);
  escreverJson(ARQUIVOS.pendencias, {
    gerado_em: new Date().toISOString(),
    urls_antigas_restantes: 0,
    itens: pendencias,
  });

  const arquivosConteudo = fs.readdirSync(CONTEUDO)
    .filter((nome) => nome.endsWith(".json"))
    .map((nome) => path.join(CONTEUDO, nome));
  const restantes = arquivosConteudo.filter((arquivo) => fs.readFileSync(arquivo, "utf8").includes(DOMINIO_ANTIGO));
  if (restantes.length) {
    throw new Error(`domínio antigo ainda aparece em: ${restantes.map((arquivo) => path.basename(arquivo)).join(", ")}`);
  }

  console.log(JSON.stringify({
    anuncios_fonte: fonte.listings.length,
    imoveis_fonte: base.total_imoveis,
    fila_robo: manifest.ordem.length,
    pendencias_sem_correspondencia: pendencias.length,
    dominio_antigo_restante: 0,
  }));
}

if (require.main === module) {
  main().catch((erro) => {
    console.error(erro.message);
    process.exitCode = 1;
  });
}

module.exports = {
  caption584,
  finalidadeUnica,
  resolverImovel,
  separarCaption584,
  substituir584NoManifesto,
};
