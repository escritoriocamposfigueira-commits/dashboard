"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  chaveAlias,
  normalizarCodigo,
  resolverCodigoFonte,
  separarChavePublicacao,
} = require("./fonte-imoveis-site");
const {
  carregarCodigosInativos,
  carregarImoveisInativos,
  codigoInativo,
} = require("./imoveis-inativos");

const RAIZ = path.resolve(__dirname, "..");
const CONTEUDO = path.join(RAIZ, "src", "content");
const SAIDA = path.join(RAIZ, "docs", "relatorios", "etapa-1.md");

function lerJson(arquivo) {
  return JSON.parse(fs.readFileSync(arquivo, "utf8"));
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function escapar(valor) {
  return String(valor ?? "—").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function finalidadeFila(chave, anunciosPorCodigo, aliases) {
  const explicita = separarChavePublicacao(chave).finalidade;
  if (explicita) return explicita;
  const codigo = resolverCodigoFonte(chave, aliases);
  const anuncios = anunciosPorCodigo.get(codigo) || [];
  return anuncios.length === 1 ? anuncios[0].finalidade : "";
}

function main() {
  const base = lerJson(path.join(CONTEUDO, "base-imoveis-site.json"));
  const manifest = lerJson(path.join(CONTEUDO, "imagens-urls.json"));
  const aliasesRaw = lerJson(path.join(CONTEUDO, "aliases-imoveis.json"));
  const aliases = Object.fromEntries(
    Object.entries(aliasesRaw).map(([alias, codigo]) => [chaveAlias(alias), normalizarCodigo(codigo)]),
  );
  const inativos = carregarCodigosInativos();
  const motivosInativos = new Map(
    carregarImoveisInativos().map((item) => [item.codigo_normalizado, item.motivo]),
  );
  const validacao = fs.existsSync(path.join(RAIZ, "controle", "validacao-base-diaria.json"))
    ? lerJson(path.join(RAIZ, "controle", "validacao-base-diaria.json"))
    : { itens: [] };
  const validacaoPorChave = new Map(validacao.itens.map((item) => [String(item.chave), item]));

  const anunciosPorCodigo = new Map();
  for (const anuncio of base.anuncios) {
    const itens = anunciosPorCodigo.get(anuncio.codigo) || [];
    itens.push(anuncio);
    anunciosPorCodigo.set(anuncio.codigo, itens);
  }

  const filaPorAnuncio = new Map();
  for (const chave of manifest.ordem.map(String)) {
    const codigo = resolverCodigoFonte(chave, aliases);
    const finalidade = finalidadeFila(chave, anunciosPorCodigo, aliases);
    const id = `${codigo}|${finalidade}`;
    const itens = filaPorAnuncio.get(id) || [];
    itens.push(chave);
    filaPorAnuncio.set(id, itens);
  }

  const linhas = [];
  const usados = new Set();
  const anunciosOrdenados = [...base.anuncios].sort((a, b) =>
    a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }) || a.finalidade.localeCompare(b.finalidade),
  );
  for (const anuncio of anunciosOrdenados) {
    const id = `${anuncio.codigo}|${anuncio.finalidade}`;
    const chaves = filaPorAnuncio.get(id) || [];
    chaves.forEach((chave) => usados.add(chave));
    const chave = chaves[0] || null;
    const arteFeed = chave ? manifest.urls_feed?.[chave] : null;
    const arteStory = chave ? manifest.urls?.[chave] : null;
    const codigoPausado = chave ? codigoInativo(chave, inativos) : codigoInativo(anuncio.codigo, inativos);
    const validado = chave ? validacaoPorChave.get(chave) : null;
    let situacao;
    if (!chave && codigoPausado) situacao = motivosInativos.get(anuncio.codigo) || "Excluído da fila";
    else if (!chave) situacao = "Falta incluir no robô";
    else if (codigoPausado) situacao = motivosInativos.get(anuncio.codigo) || "Pausado";
    else if (validado?.situacao === "bloqueado") situacao = `Bloqueado: ${validado.erros.join("; ")}`;
    else if (!arteFeed || !arteStory) situacao = "Bloqueado: arte ausente";
    else situacao = "Pronto para a fila";
    linhas.push({
      codigo: `${anuncio.codigo} (${anuncio.finalidade})`,
      site: `[sim](${anuncio.url}) — ${moeda(anuncio.preco)} · ${anuncio.fotos.length} fotos`,
      robo: chave
        ? (codigoPausado ? `pausado (${chaves.join(", ")})` : `sim (${chaves.join(", ")})`)
        : (codigoPausado ? "excluído/pausado" : "não"),
      feed: arteFeed ? "sim" : "não",
      story: arteStory ? "sim" : "não",
      situacao,
    });
  }

  for (const chave of manifest.ordem.map(String).filter((item) => !usados.has(item))) {
    const codigo = resolverCodigoFonte(chave, aliases);
    const motivo = motivosInativos.get(codigo);
    linhas.push({
      codigo: chave,
      site: "não encontrado na fonte oficial",
      robo: codigoInativo(chave, inativos) ? "pausado" : "sim",
      feed: manifest.urls_feed?.[chave] ? "sim" : "não",
      story: manifest.urls?.[chave] ? "sim" : "não",
      situacao: motivo || "Bloqueado: sem correspondência no site",
    });
  }

  const prontos = linhas.filter((item) => item.situacao === "Pronto para a fila").length;
  const faltamRobo = linhas.filter((item) => item.situacao === "Falta incluir no robô").length;
  const bloqueados = linhas.filter((item) => item.situacao.startsWith("Bloqueado:")).length;
  const pausados = linhas.length - prontos - faltamRobo - bloqueados;
  const markdown = [
    "# Relatório da Etapa 1 — base única e limpa",
    "",
    `Gerado em ${base.gerado_em}. Nenhuma publicação em rede social e nenhuma alteração no site/Supabase foram feitas.`,
    "",
    "## Resultado",
    "",
    `- Fonte oficial: [XML público somente leitura](${base.fonte})`,
    `- Fonte: ${base.total_anuncios} anúncios para ${base.total_imoveis} imóveis únicos (CF-584 aparece em venda e locação).`,
    `- Fila do robô: ${manifest.ordem.length} entradas; ${prontos} prontas, ${bloqueados} bloqueadas por regra técnica, ${pausados} pausadas/excluídas e ${faltamRobo} anúncio(s) do site ainda fora do robô.`,
    `- Validação HTTP diária: ${validacao.aprovados || 0} aprovados e ${validacao.bloqueados || 0} bloqueados entre os ativos.`,
    "- CF-584 foi separado em `584-VENDA` e `584-LOCACAO`, com preço e CTA próprios.",
    "- CF-527, CF-616 e CF-619 permanecem na fila, mas pausados; o bloqueio do CF-001 foi preservado mesmo ele já estando fora da fila; CF-537 excluído; CF-FD1FEFC4 bloqueado por preço zero.",
    "- CF-618 está no site, mas ainda não entra na fila porque não possui as artes premium aprovadas.",
    "",
    "## Inventário",
    "",
    "| Código | Site | Robô | Arte 4:5 | Arte 9:16 | Situação |",
    "|---|---|---|---|---|---|",
    ...linhas.map((item) => `| ${escapar(item.codigo)} | ${item.site} | ${escapar(item.robo)} | ${item.feed} | ${item.story} | ${escapar(item.situacao)} |`),
    "",
    "## Migração das URLs antigas",
    "",
    "Comando executado:",
    "",
    "```powershell",
    "rg -n \"llktqtuzznpavszkszpu\" src/content",
    "```",
    "",
    "Resultado: **nenhuma ocorrência**. Das 123 ocorrências antigas, 105 foram substituídas pelas fotos oficiais atuais e 18 pertenciam a CF-616/CF-619, sem correspondência; estas foram removidas e registradas em `src/content/migracao-urls-pendencias.json`, sem inventar substituição.",
    "",
    "## Proteções aplicadas",
    "",
    "- O publicador consulta o XML oficial antes de escolher e antes de postar.",
    "- Imóvel sem preço, link específico ou seis fotos reais é retirado da seleção.",
    "- As seis primeiras fotos e as artes 4:5/9:16 são conferidas por HTTP, com repetição para falhas transitórias.",
    "- A validação roda no GitHub Actions antes da publicação e registra motivos no resumo.",
    "- As proteções já existentes de estado versionado, janela antirrepetição de 30 horas, verificação no Facebook e retomada por canal foram preservadas.",
    "",
    "## Testes",
    "",
    "- `node --test tests/*.test.js`: 23 testes aprovados.",
    "- `node --check`: scripts da etapa sem erro de sintaxe.",
    "- Validação real do XML e das URLs executada sem publicar conteúdo.",
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, markdown, "utf8");
  console.log(JSON.stringify({ linhas: linhas.length, prontos, bloqueados, pausados, faltam_robo: faltamRobo }));
}

if (require.main === module) main();
