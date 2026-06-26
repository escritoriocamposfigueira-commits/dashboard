/**
 * inventariar-imagens.js — Escritório Campos Figueira
 *
 * Lê a pasta de imagens, valida cada arquivo, cruza com o calendário de posts
 * e gera o controle completo em CSV e JSON.
 *
 * Uso:
 *   node src/scripts/inventariar-imagens.js
 *   node src/scripts/inventariar-imagens.js --pasta "D:\01 - ESCRITÓRIO IMOBILIÁRIO\04- REDE SOCIAL\IMAGENS ANUNCIOS"
 *   node src/scripts/inventariar-imagens.js --pasta ./imagens-teste
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PASTA_PADRAO =
  "D:\\01 - ESCRITÓRIO IMOBILIÁRIO\\04- REDE SOCIAL\\IMAGENS ANUNCIOS";

const EXTENSOES_VALIDAS = [".jpg", ".jpeg", ".png", ".webp"];

const SITE_BASE = "https://www.escritoriocamposfigueira.com.br";
const CANAIS = "Facebook Page, Instagram, Grupos Facebook";

// Horários ideais baseados em desempenho típico de imóveis na região SP
const HORARIOS = ["09:00", "18:00"];

// Ler argumentos
const args = process.argv.slice(2);
const pastaIdx = args.indexOf("--pasta");
const PASTA = pastaIdx >= 0 ? args[pastaIdx + 1] : PASTA_PADRAO;

// Carregar calendário existente
const calPath = path.join(__dirname, "../../src/content/calendario-julho-2026.json");
let calPosts = [];
try {
  calPosts = JSON.parse(fs.readFileSync(calPath, "utf-8")).posts;
} catch {
  console.log("  Aviso: calendário JSON não encontrado. Apenas inventário será gerado.");
}

function hashArquivo(caminhoCompleto) {
  try {
    const buf = fs.readFileSync(caminhoCompleto);
    return crypto.createHash("md5").update(buf).digest("hex");
  } catch {
    return "erro_hash";
  }
}

function extrairCodigo(nomeArquivo) {
  const base = path.parse(nomeArquivo).name;
  // Padrões: "493", "REF-493", "CF-493", "Sobrado_493", "493 - Jardim Ivete"
  const match = base.match(/\b(\d{3,6})\b/);
  return match ? match[1] : null;
}

function encontrarPostCalendario(codigo) {
  if (!codigo) return null;
  return calPosts.find(
    (p) =>
      p.caption.includes(`REF: ${codigo}`) ||
      p.caption.includes(`REF:${codigo}`) ||
      p.ref === codigo
  ) || null;
}

function calcularDataHora(index, dataInicio) {
  const diasOffset = Math.floor(index / 2);
  const horarioIdx = index % 2;
  const data = new Date(dataInicio + "T12:00:00");
  data.setDate(data.getDate() + diasOffset);
  const dataStr = data.toISOString().slice(0, 10);
  return { data: dataStr, hora: HORARIOS[horarioIdx] };
}

function gerarLinkSite(codigo) {
  if (!codigo) return "";
  return `${SITE_BASE}/?s=${codigo}`;
}

function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║     INVENTÁRIO DE PUBLICAÇÕES — ESCRITÓRIO CAMPOS FIGUEIRA    ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  console.log(`Pasta: ${PASTA}`);

  // Verificar se pasta existe
  if (!fs.existsSync(PASTA)) {
    console.error(`\n❌ ERRO: Pasta não encontrada: ${PASTA}`);
    console.error("   Verifique o caminho e tente novamente.");
    console.error("   Uso: node src/scripts/inventariar-imagens.js --pasta CAMINHO");
    process.exit(1);
  }

  // Listar arquivos
  const arquivos = fs.readdirSync(PASTA).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return EXTENSOES_VALIDAS.includes(ext);
  });

  console.log(`\nArquivos de imagem encontrados: ${arquivos.length}`);

  if (arquivos.length === 0) {
    console.error("❌ Nenhuma imagem encontrada na pasta.");
    process.exit(1);
  }

  // Detectar duplicatas (por hash)
  const hashMap = {};
  const duplicatas = [];

  // Processar cada arquivo
  const inventario = [];
  let seq = 1;
  const dataInicio = "2026-06-26";

  for (const arquivo of arquivos) {
    const caminhoCompleto = path.join(PASTA, arquivo);
    const ext = path.extname(arquivo).toLowerCase();
    const tamanho = fs.statSync(caminhoCompleto).size;

    const hash = hashArquivo(caminhoCompleto);
    const codigo = extrairCodigo(arquivo);
    const postCalendario = encontrarPostCalendario(codigo);
    const { data, hora } = calcularDataHora(seq - 1, dataInicio);

    // Verificar duplicata por hash
    if (hashMap[hash]) {
      duplicatas.push({ arquivo, duplicataDe: hashMap[hash] });
    } else {
      hashMap[hash] = arquivo;
    }

    const isDuplicata = !!hashMap[hash] && hashMap[hash] !== arquivo;

    // Determinar validação
    let validacao = "PENDENTE_REVISAO";
    let erros = [];

    if (isDuplicata) {
      validacao = "REJEITADO_DUPLICATA";
      erros.push(`Duplicata de: ${hashMap[hash]}`);
    } else if (!codigo) {
      validacao = "PENDENTE_REVISAO_HUMANA";
      erros.push("Código do imóvel não identificado no nome do arquivo");
    } else if (postCalendario) {
      validacao = "VALIDADO";
    } else {
      validacao = "PENDENTE_REVISAO_HUMANA";
      erros.push(`Código ${codigo} não encontrado no calendário`);
    }

    const item = {
      seq,
      arquivo,
      caminho_completo: caminhoCompleto,
      hash_md5: hash,
      tamanho_bytes: tamanho,
      codigo_imovel: codigo || "",
      tipo_imovel: postCalendario?.tipo?.split("—")[0]?.trim() || "",
      finalidade: postCalendario?.tipo?.toLowerCase().includes("locaç")
        ? "LOCAÇÃO"
        : postCalendario?.tipo?.toLowerCase().includes("venda")
        ? "VENDA"
        : "",
      bairro_cidade: postCalendario?.imovel || "",
      valor: postCalendario?.valor || "",
      link_site: gerarLinkSite(codigo),
      validacao,
      data_programada: validacao === "VALIDADO" ? data : "",
      horario_programado: validacao === "VALIDADO" ? hora : "",
      canais: validacao === "VALIDADO" ? CANAIS : "",
      texto_preparado: postCalendario?.caption ? "SIM (ver calendário JSON)" : "PENDENTE",
      status_publicacao: "AGUARDANDO_APROVACAO",
      fb_post_id: "",
      ig_post_id: "",
      erros: erros.join(" | "),
    };

    inventario.push(item);
    if (validacao !== "REJEITADO_DUPLICATA") seq++;
  }

  // Estatísticas
  const validados = inventario.filter((i) => i.validacao === "VALIDADO").length;
  const pendentes = inventario.filter((i) => i.validacao.includes("PENDENTE")).length;
  const rejeitados = inventario.filter((i) => i.validacao.includes("REJEITADO")).length;
  const diasNecessarios = Math.ceil(validados / 2);
  const dataFinal = (() => {
    const d = new Date(dataInicio + "T12:00:00");
    d.setDate(d.getDate() + diasNecessarios - 1);
    return d.toISOString().slice(0, 10);
  })();

  // Exibir resumo
  console.log("\n─────────────────────────────────────");
  console.log("RESULTADO DO INVENTÁRIO");
  console.log("─────────────────────────────────────");
  console.log(`Total de imagens:          ${inventario.length}`);
  console.log(`✅ Validadas:              ${validados}`);
  console.log(`⚠️  Pendentes revisão:     ${pendentes}`);
  console.log(`❌ Rejeitadas (duplicata): ${rejeitados}`);
  console.log(`📅 Dias necessários:       ${diasNecessarios}`);
  console.log(`📅 Início:                 ${dataInicio}`);
  console.log(`📅 Término previsto:       ${dataFinal}`);

  if (duplicatas.length > 0) {
    console.log(`\n⚠️  DUPLICATAS DETECTADAS:`);
    duplicatas.forEach((d) => console.log(`   ${d.arquivo} ← duplicata de → ${d.duplicataDe}`));
  }

  const comErros = inventario.filter((i) => i.erros);
  if (comErros.length > 0) {
    console.log(`\n⚠️  PENDENTES DE REVISÃO HUMANA:`);
    comErros.forEach((i) =>
      console.log(`   [${i.seq}] ${i.arquivo}: ${i.erros}`)
    );
  }

  // Salvar CSV
  const csvDir = path.join(__dirname, "../../controle");
  if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });

  const csvPath = path.join(csvDir, "controle_publicacoes_imobiliarias.csv");
  const csvHeaders = [
    "seq", "arquivo", "hash_md5", "tamanho_bytes", "codigo_imovel",
    "tipo_imovel", "finalidade", "bairro_cidade", "valor", "link_site",
    "validacao", "data_programada", "horario_programado", "canais",
    "texto_preparado", "status_publicacao", "fb_post_id", "ig_post_id", "erros",
  ];
  const csvLinhas = inventario.map((i) =>
    csvHeaders.map((h) => `"${String(i[h] || "").replace(/"/g, '""')}"`).join(",")
  );
  fs.writeFileSync(csvPath, [csvHeaders.join(","), ...csvLinhas].join("\n"), "utf-8");
  console.log(`\n📄 CSV salvo: ${csvPath}`);

  // Salvar JSON
  const jsonPath = path.join(csvDir, "controle_publicacoes_imobiliarias.json");
  const jsonData = {
    gerado_em: new Date().toISOString(),
    pasta_origem: PASTA,
    resumo: {
      total: inventario.length,
      validados,
      pendentes,
      rejeitados,
      dias_necessarios: diasNecessarios,
      data_inicio: dataInicio,
      data_termino: dataFinal,
    },
    publicacoes: inventario,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");
  console.log(`📄 JSON salvo: ${jsonPath}`);

  // Prévia dos primeiros e últimos 2 anúncios
  const primeiros = inventario.filter((i) => i.validacao === "VALIDADO").slice(0, 2);
  const ultimos = inventario.filter((i) => i.validacao === "VALIDADO").slice(-2);

  if (primeiros.length > 0) {
    console.log("\n─────────────────────────────────────");
    console.log("PRÉVIA — PRIMEIROS 2 ANÚNCIOS");
    console.log("─────────────────────────────────────");
    primeiros.forEach((i) => {
      console.log(`[${i.seq}] ${i.arquivo} → ${i.data_programada} ${i.horario_programado}`);
      console.log(`     Código: ${i.codigo_imovel} | ${i.bairro_cidade}`);
    });
  }

  if (ultimos.length > 0) {
    console.log("\n─────────────────────────────────────");
    console.log("PRÉVIA — ÚLTIMOS 2 ANÚNCIOS");
    console.log("─────────────────────────────────────");
    ultimos.forEach((i) => {
      console.log(`[${i.seq}] ${i.arquivo} → ${i.data_programada} ${i.horario_programado}`);
      console.log(`     Código: ${i.codigo_imovel} | ${i.bairro_cidade}`);
    });
  }

  console.log("\n─────────────────────────────────────");
  console.log("⚠️  MODO DRY-RUN ATIVO — NADA FOI PUBLICADO");
  console.log("─────────────────────────────────────");
  console.log("Próximo passo: revise o CSV gerado e aprove para agendar.");
  console.log("Para agendar após aprovação:");
  console.log("  node src/scripts/agendar-aprovados.js --aprovar\n");
}

main();
