"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  MANIFESTO,
  PASTA_SAIDA,
} = require("./gerar-biblioteca-videos-story");

const FFMPEG = "C:\\Users\\Henrique\\ffmpeg\\bin\\ffmpeg.exe";
const FFPROBE = "C:\\Users\\Henrique\\ffmpeg\\bin\\ffprobe.exe";
const RELATORIO = path.join(PASTA_SAIDA, "relatorio-validacao.json");

function metadata(video) {
  const resultado = spawnSync(
    FFPROBE,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=codec_type,codec_name,width,height",
      "-of",
      "json",
      video,
    ],
    { encoding: "utf8", timeout: 20000 },
  );
  if (resultado.status !== 0) throw new Error(resultado.stderr || "ffprobe falhou");
  return JSON.parse(resultado.stdout);
}

function compararQuadroFinal(video, imagem) {
  const resultado = spawnSync(
    FFMPEG,
    [
      "-v",
      "info",
      "-ss",
      "13",
      "-i",
      video,
      "-loop",
      "1",
      "-i",
      imagem,
      "-filter_complex",
      "[1:v]scale=1080:1920,format=yuv420p[ref];[0:v]format=yuv420p[test];[test][ref]ssim",
      "-frames:v",
      "1",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8", timeout: 30000 },
  );
  const texto = `${resultado.stdout || ""}\n${resultado.stderr || ""}`;
  const match = texto.match(/All:([0-9.]+)/);
  return match ? Number(match[1]) : null;
}

function main() {
  if (!fs.existsSync(MANIFESTO)) throw new Error("Manifesto da biblioteca não encontrado.");
  const manifesto = JSON.parse(fs.readFileSync(MANIFESTO, "utf8"));
  const resultados = [];

  manifesto.itens.forEach((item, indice) => {
    const erros = [];
    let meta = null;
    let ssim = null;
    try {
      meta = metadata(item.video);
      const video = meta.streams.find((stream) => stream.codec_type === "video");
      const audio = meta.streams.find((stream) => stream.codec_type === "audio");
      const duracao = Number(meta.format.duration);
      if (video?.codec_name !== "h264") erros.push("codec de vídeo diferente de H.264");
      if (video?.width !== 1080 || video?.height !== 1920) erros.push("resolução diferente de 1080x1920");
      if (audio?.codec_name !== "aac") erros.push("áudio AAC ausente");
      if (duracao < 14.9 || duracao > 15.1) erros.push(`duração inválida: ${duracao}`);
      ssim = compararQuadroFinal(item.video, item.imagem_origem);
      if (ssim === null || ssim < 0.94) erros.push(`quadro final não preservou suficientemente a arte: SSIM=${ssim}`);
    } catch (erro) {
      erros.push(erro.message);
    }
    resultados.push({
      codigo_arte: item.codigo_arte,
      video: item.video,
      modelo_id: item.modelo_id,
      trilha_id: item.trilha_id,
      ssim_quadro_final: ssim,
      aprovado: erros.length === 0,
      erros,
    });
    console.log(`VALIDACAO ${indice + 1}/${manifesto.itens.length} · ${item.codigo_arte} · ${erros.length ? "FALHOU" : "OK"}`);
  });

  const relatorio = {
    validado_em: new Date().toISOString(),
    total: resultados.length,
    aprovados: resultados.filter((item) => item.aprovado).length,
    falhas: resultados.filter((item) => !item.aprovado).length,
    criterio_ssim_minimo: 0.94,
    resultados,
  };
  fs.writeFileSync(RELATORIO, `${JSON.stringify(relatorio, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ total: relatorio.total, aprovados: relatorio.aprovados, falhas: relatorio.falhas }));
  if (relatorio.falhas) process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (erro) {
    console.error("ERRO", erro.message);
    process.exit(1);
  }
}
