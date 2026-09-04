"use strict";
/**
 * Gera um vídeo 9:16 (1080x1920) com música para cada carrossel, a partir dos
 * slides (prefere a versão VERTICAL 9x16; usa FEED 4x5 com padding se faltar).
 * Música: rotação das trilhas aprovadas (livres de direitos) sem repetir em sequência.
 * Saída: public/carrosseis-videos/<CARROSSEL>.mp4 + manifest.json
 *
 * Cada imagem entra como input próprio (-framerate 30 -loop 1 -t SEG) e é
 * concatenada via filtro "concat" — isso evita o corte da 1ª/última imagem que
 * acontecia com o demuxer "concat" + diretiva "duration" (o cálculo de duração
 * dali depende do frame SEGUINTE pra saber quanto duplicar o frame atual, e o
 * primeiro/último slide nem sempre tem essa referência de forma confiável).
 *
 * Uso: node scripts/gerar-videos-carrosseis.js [NOME_DO_CARROSSEL]   (sem arg = todos)
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const RAIZ = path.join(__dirname, "..");
const FF = require("ffmpeg-static");
const BASE = path.join(RAIZ, "public", "carrosseis");
const SILENCIO = process.env.SILENCIO === "1";           // vídeo sem música (p/ YouTube)
const REL = (process.env.SAIDA_DIR || "public/carrosseis-videos").replace(/\\/g, "/");
const SAIDA = path.join(RAIZ, REL);
const TRILHAS_DIR = path.join(RAIZ, "TRILHAS", "aprovadas");
const SEG_POR_SLIDE = 3.2;
const FPS = 30;
const PROP = process.env.PROP === "4x5" ? "4x5" : "9x16";   // proporção do vídeo
const W = 1080, H = PROP === "4x5" ? 1350 : 1920;
const CRF = process.env.CRF || "18";        // qualidade (menor = melhor; 18 ~ visualmente sem perda)
const PRESET = process.env.PRESET || "slow"; // compressão premium

function trilhas() {
  return fs.readdirSync(TRILHAS_DIR).filter((f) => /\.mp3$/i.test(f)).sort()
    .map((f) => path.join(TRILHAS_DIR, f));
}
function imagensDe(carrDir) {
  const subs = fs.readdirSync(carrDir).filter((d) => {
    try { return fs.statSync(path.join(carrDir, d)).isDirectory(); } catch (e) { return false; }
  });
  const vert = subs.find((s) => /9x16|vertical/i.test(s));
  const feed = subs.find((s) => /4x5|feed/i.test(s));
  const escolha = PROP === "4x5" ? feed : (vert || feed);   // 4:5 usa feed; 9:16 usa vertical
  if (!escolha) return [];
  const dir = path.join(carrDir, escolha);
  return fs.readdirSync(dir)
    .filter((f) => /^\d+\.(png|jpe?g)$/i.test(f))   // só slides numerados (ignora _source)
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
    .map((f) => path.join(dir, f));
}

function gerarUm(carr, faixa) {
  const carrDir = path.join(BASE, carr);
  const imgs = imagensDe(carrDir);
  if (imgs.length < 3) { console.log("  (incompleto/sem imagens, pulado)", carr); return false; }

  const dur = +(imgs.length * SEG_POR_SLIDE).toFixed(2);
  const fadeSt = Math.max(0, dur - 1.6);
  const out = path.join(SAIDA, carr + ".mp4");

  // cada slide = 1 input independente, já travado em SEG_POR_SLIDE * FPS frames exatos
  const inputArgs = [];
  imgs.forEach((img) => {
    inputArgs.push("-framerate", String(FPS), "-loop", "1", "-t", String(SEG_POR_SLIDE), "-i", img);
  });
  const audioIdx = imgs.length; // índice do input de áudio (entra depois das imagens)

  const vfSlide = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p`;
  const filtros = imgs.map((_, i) => `[${i}:v]${vfSlide}[v${i}]`).join(";");
  const concatIn = imgs.map((_, i) => `[v${i}]`).join("");
  const filterComplex = `${filtros};${concatIn}concat=n=${imgs.length}:v=1:a=0[vout]`;

  const args = SILENCIO ? [
    "-y",
    ...inputArgs,
    "-filter_complex", filterComplex,
    "-map", "[vout]",
    "-r", String(FPS),
    "-c:v", "libx264", "-preset", PRESET, "-crf", CRF, "-profile:v", "high", "-level", "4.2",
    "-movflags", "+faststart",
    out,
  ] : [
    "-y",
    ...inputArgs,
    "-stream_loop", "-1", "-i", faixa,
    "-filter_complex", filterComplex,
    "-map", "[vout]", "-map", `${audioIdx}:a`,
    "-t", String(dur),
    "-r", String(FPS),
    "-c:v", "libx264", "-preset", PRESET, "-crf", CRF, "-profile:v", "high", "-level", "4.2",
    "-c:a", "aac", "-b:a", "192k",
    "-af", `afade=t=out:st=${fadeSt}:d=1.6`,
    "-movflags", "+faststart",
    out,
  ];
  const r = spawnSync(FF, args, { stdio: ["ignore", "ignore", "pipe"] });
  if (r.status !== 0) {
    console.log("  ERRO", carr, (r.stderr || "").toString().split("\n").slice(-6).join("\n"));
    return false;
  }
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`  ok ${carr}.mp4  (${imgs.length} slides, ${dur}s, ${kb} KB${SILENCIO ? ", sem musica" : ", trilha " + path.basename(faixa)})`);
  return true;
}

function main() {
  fs.mkdirSync(SAIDA, { recursive: true });
  const faixas = trilhas();
  if (!faixas.length) throw new Error("Nenhuma trilha aprovada encontrada em " + TRILHAS_DIR);

  const alvo = process.argv[2];
  let carrosseis = fs.readdirSync(BASE)
    .filter((d) => { try { return fs.statSync(path.join(BASE, d)).isDirectory(); } catch (e) { return false; } })
    .sort();
  if (alvo) carrosseis = carrosseis.filter((c) => c === alvo);

  const manifest = {};
  carrosseis.forEach((c, i) => {
    const faixa = faixas[i % faixas.length];
    const ok = gerarUm(c, faixa);
    if (ok) manifest[c] = { video: `${REL}/${c}.mp4`, trilha: SILENCIO ? null : path.basename(faixa) };
  });

  // mescla manifest (não perde entradas de execuções anteriores)
  const manPath = path.join(SAIDA, "manifest.json");
  let atual = {};
  try { atual = JSON.parse(fs.readFileSync(manPath, "utf8")); } catch (e) {}
  fs.writeFileSync(manPath, JSON.stringify({ ...atual, ...manifest }, null, 2));
  console.log("Manifest:", Object.keys({ ...atual, ...manifest }).length, "videos");
}

main();
