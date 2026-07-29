"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { carregarCatalogo } = require("./biblioteca-trilhas");
const {
  DURACAO_PADRAO,
  MODELOS,
  gerarVideoStoryProfissional,
} = require("./video-story-profissional");

const PASTA_IMAGENS =
  "D:\\01 - ESCRITÓRIO IMOBILIÁRIO\\04- REDE SOCIAL\\IMAGENS ANUNCIOS\\proporção 9.16";
const PASTA_SAIDA =
  "D:\\01 - ESCRITÓRIO IMOBILIÁRIO\\04- REDE SOCIAL\\IMAGENS ANUNCIOS\\VÍDEOS ANIMADOS 9.16";
const PASTA_PRONTOS = path.join(PASTA_SAIDA, "PRONTOS");
const PASTA_PREVIAS = path.join(PASTA_SAIDA, "PRÉVIAS DOS MODELOS");
const MANIFESTO = path.join(PASTA_SAIDA, "manifesto-videos.json");
const RELATORIO = path.join(PASTA_SAIDA, "LEIA-ME.txt");

function encontrarFFmpeg() {
  const candidatos = [
    "C:\\Users\\Henrique\\ffmpeg\\bin\\ffmpeg.exe",
    "ffmpeg",
    "/usr/bin/ffmpeg",
  ];
  for (const candidato of candidatos) {
    const resultado = spawnSync(candidato, ["-version"], { timeout: 5000 });
    if (resultado.status === 0) return candidato;
  }
  throw new Error("FFmpeg não encontrado.");
}

function slug(nome) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
}

function videoValido(ffmpeg, arquivo) {
  if (!fs.existsSync(arquivo) || fs.statSync(arquivo).size < 100_000) return false;
  const resultado = spawnSync(
    ffmpeg,
    ["-v", "error", "-i", arquivo, "-t", "0.1", "-f", "null", "-"],
    { encoding: "utf8", timeout: 15000 },
  );
  return resultado.status === 0;
}

function salvarManifesto(itens, destino = MANIFESTO) {
  const manifesto = {
    versao: 1,
    gerado_em: new Date().toISOString(),
    tipo: "biblioteca_local_de_videos_story",
    publicado_automaticamente: false,
    origem: PASTA_IMAGENS,
    saida: PASTA_PRONTOS,
    proporcao: "9:16",
    resolucao: "1080x1920",
    duracao_segundos: DURACAO_PADRAO,
    audio: "incorporado no MP4",
    politica_visual: {
      original_preservado: true,
      site_rodape_sempre_por_ultimo: true,
      cor_iluminacao: "dourado #D9AA4A sobre identidade preta/dourada",
      modelos: MODELOS,
    },
    total: itens.length,
    itens,
  };
  fs.writeFileSync(destino, `${JSON.stringify(manifesto, null, 2)}\n`, "utf8");
}

function gerarPrevia(ffmpeg, videoPath, modeloId) {
  const destino = path.join(PASTA_PREVIAS, `${modeloId}.jpg`);
  if (fs.existsSync(destino)) return destino;
  const resultado = spawnSync(
    ffmpeg,
    ["-y", "-ss", "4.8", "-i", videoPath, "-frames:v", "1", "-q:v", "2", destino],
    { encoding: "utf8", timeout: 30000 },
  );
  if (resultado.status !== 0) {
    throw new Error(`Falha ao gerar prévia ${modeloId}: ${resultado.stderr?.slice(-500)}`);
  }
  return destino;
}

function main() {
  const ffmpeg = encontrarFFmpeg();
  const forcar = process.argv.includes("--forcar");
  const consolidar = process.argv.includes("--consolidar");
  const limiteArg = process.argv.find((arg) => arg.startsWith("--limite="));
  const limite = limiteArg ? Number(limiteArg.split("=")[1]) : Number.POSITIVE_INFINITY;
  const partesArg = process.argv.find((arg) => arg.startsWith("--partes="));
  const parteArg = process.argv.find((arg) => arg.startsWith("--parte="));
  const partes = partesArg ? Math.max(1, Number(partesArg.split("=")[1])) : 1;
  const parte = parteArg ? Number(parteArg.split("=")[1]) : 0;
  if (!Number.isInteger(parte) || parte < 0 || parte >= partes) {
    throw new Error(`Parte inválida: ${parte}. Use de 0 a ${partes - 1}.`);
  }
  const catalogo = carregarCatalogo();
  const arquivos = fs
    .readdirSync(PASTA_IMAGENS, { withFileTypes: true })
    .filter((item) => item.isFile() && /\.(png|jpe?g|webp)$/i.test(item.name))
    .map((item) => item.name)
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
    .map((arquivo, indiceGlobal) => ({ arquivo, indiceGlobal }))
    .slice(0, limite)
    .filter(({ indiceGlobal }) => consolidar || indiceGlobal % partes === parte);

  fs.mkdirSync(PASTA_PRONTOS, { recursive: true });
  fs.mkdirSync(PASTA_PREVIAS, { recursive: true });

  const itens = [];
  const previaPorModelo = new Set();
  arquivos.forEach(({ arquivo, indiceGlobal }, indiceLocal) => {
    const modelo = MODELOS[indiceGlobal % MODELOS.length];
    // Passo 19 percorre as 56 trilhas antes de repetir e evita sequências parecidas.
    const trilha = catalogo.trilhas[(indiceGlobal * 19) % catalogo.trilhas.length];
    const base = slug(path.parse(arquivo).name);
    const nomeSaida = `${base}__STORY__${modelo.id.toUpperCase()}__${trilha.id.toUpperCase()}.mp4`;
    const imagemPath = path.join(PASTA_IMAGENS, arquivo);
    const outputPath = path.join(PASTA_PRONTOS, nomeSaida);
    const validoAntes = videoValido(ffmpeg, outputPath);

    if ((!validoAntes || forcar) && !consolidar) {
      console.log(`PROGRESSO ${indiceLocal + 1}/${arquivos.length} · global ${indiceGlobal + 1}/85 · ${arquivo} · ${modelo.id} · ${trilha.id}`);
      gerarVideoStoryProfissional({
        ffmpeg,
        imagemPath,
        audioPath: trilha.caminho,
        outputPath,
        modeloId: modelo.id,
      });
    } else {
      if (!validoAntes) {
        throw new Error(`Vídeo ausente ou inválido durante a consolidação: ${nomeSaida}`);
      }
      console.log(`REUSADO ${indiceLocal + 1}/${arquivos.length} · ${nomeSaida}`);
    }

    let previa = null;
    if (!previaPorModelo.has(modelo.id)) {
      previa = gerarPrevia(ffmpeg, outputPath, modelo.id);
      previaPorModelo.add(modelo.id);
    }

    itens.push({
      codigo_arte: path.parse(arquivo).name,
      imagem_origem: imagemPath,
      video: outputPath,
      modelo_id: modelo.id,
      modelo_titulo: modelo.titulo,
      trilha_id: trilha.id,
      trilha_titulo: trilha.titulo,
      trilha_arquivo: trilha.caminho,
      licenca: trilha.licenca,
      previa_modelo: previa,
      bytes: fs.statSync(outputPath).size,
    });
    if (partes === 1 || consolidar) salvarManifesto(itens);
  });

  const linhas = [
    "BIBLIOTECA PROFISSIONAL DE STORIES — ESCRITÓRIO CAMPOS FIGUEIRA",
    "",
    `Total de vídeos: ${itens.length}`,
    "Formato: MP4 H.264 + áudio AAC incorporado",
    "Resolução: 1080x1920 (9:16)",
    `Duração: ${DURACAO_PADRAO} segundos`,
    "Originais: preservados; nenhuma imagem-fonte foi modificada",
    "Publicação: esta pasta é uma biblioteca local e não publica nada sozinha",
    "",
    "Modelos utilizados:",
    ...MODELOS.map((modelo) => `- ${modelo.titulo}: ${modelo.descricao}`),
    "",
    "O rodapé/site nunca abre o vídeo; ele aparece por último.",
    "A iluminação usa dourado compatível com o fundo preto e dourado da marca.",
    "O robô usa o mesmo motor para gerar a versão correspondente no momento da publicação.",
    "",
  ];
  if (partes === 1 || consolidar) {
    fs.writeFileSync(RELATORIO, linhas.join("\r\n"), "utf8");
  }
  console.log(`CONCLUIDO ${itens.length} vídeos`);
  console.log(PASTA_SAIDA);
}

if (require.main === module) {
  try {
    main();
  } catch (erro) {
    console.error("ERRO", erro.message);
    process.exit(1);
  }
}

module.exports = {
  MANIFESTO,
  PASTA_IMAGENS,
  PASTA_PREVIAS,
  PASTA_PRONTOS,
  PASTA_SAIDA,
};
