"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { MANIFESTO } = require("./gerar-amostras-tour-vertical");

const RAIZ = path.resolve(__dirname, "..");

function executar(programa, args, timeout = 60_000) {
  const resultado = spawnSync(programa, args, { encoding: "utf8", timeout, maxBuffer: 20 * 1024 * 1024 });
  if (resultado.status !== 0) throw new Error(resultado.stderr || `${programa} falhou`);
  return resultado.stdout;
}

function metadata(video) {
  return JSON.parse(executar("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate",
    "-of", "json", video,
  ]));
}

function hashArquivo(arquivo) {
  return crypto.createHash("sha256").update(fs.readFileSync(arquivo)).digest("hex");
}

function ssimAntesDaArte(video, arte) {
  const resultado = spawnSync("ffmpeg", [
    "-v", "info", "-ss", "19.5", "-i", video,
    "-loop", "1", "-i", arte,
    "-filter_complex", "[0:v]scale=1080:1920,format=yuv420p[test];[1:v]scale=1080:1920,format=yuv420p[ref];[test][ref]ssim",
    "-frames:v", "1", "-f", "null", "-",
  ], { encoding: "utf8", timeout: 60_000 });
  const texto = `${resultado.stdout || ""}\n${resultado.stderr || ""}`;
  const achado = texto.match(/All:([0-9.]+)/);
  return achado ? Number(achado[1]) : null;
}

function main() {
  const manifesto = JSON.parse(fs.readFileSync(MANIFESTO, "utf8"));
  const resultados = manifesto.itens.map((item) => {
    const video = path.join(RAIZ, item.video);
    const arte = path.join(RAIZ, item.arte_final);
    const info = metadata(video);
    const faixaVideo = info.streams.find((stream) => stream.codec_type === "video");
    const faixaAudio = info.streams.find((stream) => stream.codec_type === "audio");
    const duracao = Number(info.format.duration);
    const fotosUnicas = new Set(item.fotos_usadas.map((foto) => foto.sha256)).size;
    const ssim = ssimAntesDaArte(video, arte);
    const erros = [];
    if (faixaVideo?.width !== 1080 || faixaVideo?.height !== 1920) erros.push("resolução diferente de 1080x1920");
    if (faixaVideo?.r_frame_rate !== "30/1") erros.push("fps diferente de 30");
    if (!faixaAudio) erros.push("áudio ausente");
    if (duracao < 20 || duracao > 30) erros.push(`duração fora da faixa: ${duracao}`);
    if (fotosUnicas < 5) erros.push("menos de cinco fotos reais distintas");
    if (item.arte_inicio_segundos < 20) erros.push("arte final começa antes de 20s");
    if (ssim !== null && ssim >= 0.80) erros.push("quadro anterior a 20s parece ser apenas a arte");
    if (hashArquivo(video) !== item.sha256) erros.push("hash do vídeo diverge do manifesto");
    if (item.imagem_gerada_por_ia !== false) erros.push("origem visual não declarada como real");
    return {
      codigo: item.codigo,
      versao: item.versao,
      duracao,
      resolucao: `${faixaVideo?.width}x${faixaVideo?.height}`,
      fps: faixaVideo?.r_frame_rate,
      fotos_unicas: fotosUnicas,
      audio: faixaAudio?.codec_name || null,
      arte_inicio_segundos: item.arte_inicio_segundos,
      ssim_arte_em_19_5s: ssim,
      valido: erros.length === 0,
      erros,
    };
  });
  const saida = path.join(path.dirname(MANIFESTO), "validacao.json");
  fs.writeFileSync(saida, `${JSON.stringify({ gerado_em: new Date().toISOString(), resultados }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(resultados, null, 2));
  if (resultados.some((item) => !item.valido)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { metadata, ssimAntesDaArte };
