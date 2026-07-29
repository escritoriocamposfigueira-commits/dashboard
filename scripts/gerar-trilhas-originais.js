/**
 * Gera 60 trilhas instrumentais originais para os vídeos de Story/Short.
 *
 * As faixas são sintetizadas localmente: não usam samples, loops, vozes,
 * gravações ou melodias de terceiros. O catálogo registra parâmetros e SHA-256.
 *
 * Uso:
 *   node scripts/gerar-trilhas-originais.js
 */

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const RAIZ = path.join(__dirname, "..");
const DESTINO = path.join(RAIZ, "TRILHAS");
const SAMPLE_RATE = 44100;
const DURACAO = 14;
const CANAIS = 2;
const VERSAO_GERADOR = "1.0.0";

const PERFIS = [
  {
    prefixo: "premium",
    titulo: "Patrimônio Premium",
    emocoes: ["sonho", "confianca"],
    descricao: "Sofisticada e segura; piano elétrico, baixo contido e pulsação elegante.",
    bpmBase: 84,
    bpmPasso: 2,
    raizBase: 45,
    escala: [0, 2, 4, 7, 9, 11],
    progressoes: [[0, 5, 3, 4], [0, 3, 5, 4], [0, 4, 5, 3]],
    energia: 0.58,
    brilho: 0.45,
  },
  {
    prefixo: "lar",
    titulo: "Novo Lar",
    emocoes: ["familiar", "sonho"],
    descricao: "Acolhedora e positiva; harmonia aberta e movimento suave.",
    bpmBase: 88,
    bpmPasso: 2,
    raizBase: 48,
    escala: [0, 2, 4, 5, 7, 9, 11],
    progressoes: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 5]],
    energia: 0.62,
    brilho: 0.62,
  },
  {
    prefixo: "conquista",
    titulo: "Conquista",
    emocoes: ["conquista", "sonho"],
    descricao: "Ascendente e motivadora; ataque imediato e resolução positiva.",
    bpmBase: 100,
    bpmPasso: 2,
    raizBase: 50,
    escala: [0, 2, 4, 5, 7, 9, 11],
    progressoes: [[0, 3, 5, 4], [0, 5, 4, 3], [0, 4, 3, 5]],
    energia: 0.75,
    brilho: 0.70,
  },
  {
    prefixo: "engenharia",
    titulo: "Projeto e Engenharia",
    emocoes: ["confianca", "conquista"],
    descricao: "Precisa e profissional; pulso técnico, timbres limpos e estabilidade.",
    bpmBase: 94,
    bpmPasso: 2,
    raizBase: 43,
    escala: [0, 2, 3, 5, 7, 9, 10],
    progressoes: [[0, 3, 5, 4], [0, 5, 3, 6], [0, 4, 5, 3]],
    energia: 0.70,
    brilho: 0.55,
  },
  {
    prefixo: "oportunidade",
    titulo: "Oportunidade",
    emocoes: ["urgencia", "conquista"],
    descricao: "Atenta sem ser ansiosa; ritmo mais ativo e crescimento controlado.",
    bpmBase: 108,
    bpmPasso: 2,
    raizBase: 47,
    escala: [0, 2, 4, 5, 7, 9, 11],
    progressoes: [[0, 4, 5, 3], [0, 3, 4, 5], [0, 5, 4, 3]],
    energia: 0.82,
    brilho: 0.74,
  },
  {
    prefixo: "investimento",
    titulo: "Investimento Seguro",
    emocoes: ["confianca", "urgencia"],
    descricao: "Contemporânea e firme; baixo marcado, textura discreta e sensação de decisão.",
    bpmBase: 96,
    bpmPasso: 2,
    raizBase: 46,
    escala: [0, 2, 3, 5, 7, 9, 10],
    progressoes: [[0, 5, 3, 4], [0, 3, 6, 5], [0, 4, 3, 5]],
    energia: 0.72,
    brilho: 0.52,
  },
];

function localizarFFmpeg() {
  const candidatos = [
    "ffmpeg",
    "C:\\Users\\Henrique\\ffmpeg\\bin\\ffmpeg.exe",
    path.join(process.env.USERPROFILE || "", "ffmpeg", "bin", "ffmpeg.exe"),
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
  ];
  for (const candidato of candidatos) {
    try {
      if (spawnSync(candidato, ["-version"], { timeout: 5000 }).status === 0) return candidato;
    } catch {}
  }
  throw new Error("FFmpeg não encontrado.");
}

function midiHz(nota) {
  return 440 * (2 ** ((nota - 69) / 12));
}

function ondaTriangular(fase) {
  return (2 / Math.PI) * Math.asin(Math.sin(fase));
}

function ruidoDeterministico(indice, semente) {
  const x = Math.sin((indice + 1) * (12.9898 + semente * 0.017)) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function envelopeAtaqueQueda(posicao, ataque, queda) {
  if (posicao < 0 || posicao > queda) return 0;
  if (posicao < ataque) return posicao / Math.max(ataque, 0.0001);
  return Math.exp(-5 * ((posicao - ataque) / Math.max(queda - ataque, 0.0001)));
}

function escreverWav16(arquivo, esquerda, direita) {
  const frames = esquerda.length;
  const bytesDados = frames * CANAIS * 2;
  const buffer = Buffer.alloc(44 + bytesDados);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + bytesDados, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CANAIS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * CANAIS * 2, 28);
  buffer.writeUInt16LE(CANAIS * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(bytesDados, 40);

  for (let i = 0; i < frames; i += 1) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, esquerda[i])) * 32767), 44 + i * 4);
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, direita[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(arquivo, buffer);
}

function criarEspecificacao(perfil, variante) {
  const bpm = perfil.bpmBase + ((variante - 1) % 5) * perfil.bpmPasso;
  const raiz = perfil.raizBase + ((variante - 1) % 6);
  const progressao = perfil.progressoes[(variante - 1) % perfil.progressoes.length];
  const id = `${perfil.prefixo}-${String(variante).padStart(2, "0")}`;
  return {
    id,
    arquivo: `${id}.mp3`,
    titulo: `${perfil.titulo} ${String(variante).padStart(2, "0")}`,
    perfil: perfil.prefixo,
    emocoes: perfil.emocoes,
    descricao: perfil.descricao,
    bpm,
    raiz_midi: raiz,
    progressao,
    energia: Number((perfil.energia + ((variante % 3) - 1) * 0.025).toFixed(3)),
    brilho: Number((perfil.brilho + ((variante % 4) - 1.5) * 0.02).toFixed(3)),
    variante,
  };
}

function sintetizar(especificacao, perfil) {
  const frames = Math.floor(SAMPLE_RATE * DURACAO);
  const esquerda = new Float32Array(frames);
  const direita = new Float32Array(frames);
  const segundosPorBeat = 60 / especificacao.bpm;
  const semente = Number.parseInt(
    crypto.createHash("sha256").update(especificacao.id).digest("hex").slice(0, 8),
    16,
  );
  let pico = 0;

  for (let i = 0; i < frames; i += 1) {
    const t = i / SAMPLE_RATE;
    const beat = t / segundosPorBeat;
    const indiceCompasso = Math.floor(beat / 4) % especificacao.progressao.length;
    const grau = especificacao.progressao[indiceCompasso];
    const notaRaiz = especificacao.raiz_midi + perfil.escala[grau % perfil.escala.length];
    const faseBeat = beat - Math.floor(beat);
    const meioBeat = beat * 2;
    const faseMeioBeat = meioBeat - Math.floor(meioBeat);
    const passoArpejo = Math.floor(meioBeat);
    const acorde = [0, 4, 7, 11];

    let pad = 0;
    for (let voz = 0; voz < 3; voz += 1) {
      const hz = midiHz(notaRaiz + acorde[voz] + 12);
      const fase = 2 * Math.PI * hz * t + voz * 0.37 + especificacao.variante * 0.11;
      pad += Math.sin(fase) * 0.65 + ondaTriangular(fase * 0.5) * 0.35;
    }
    pad *= 0.055 * (0.8 + especificacao.brilho * 0.35);

    const hzBaixo = midiHz(notaRaiz - 12);
    const baixo = Math.sin(2 * Math.PI * hzBaixo * t) * 0.16
      * (0.70 + 0.30 * Math.exp(-3.5 * faseBeat));

    const notaArpejo = notaRaiz + acorde[(passoArpejo + especificacao.variante) % acorde.length] + 12;
    const faseArpejo = 2 * Math.PI * midiHz(notaArpejo) * t;
    const envArpejo = envelopeAtaqueQueda(faseMeioBeat * segundosPorBeat / 2, 0.008, segundosPorBeat * 0.45);
    const arpejo = (
      ondaTriangular(faseArpejo) * 0.65
      + Math.sin(faseArpejo * 2) * 0.20
    ) * envArpejo * (0.09 + especificacao.brilho * 0.045);

    const posKick = faseBeat * segundosPorBeat;
    const envKick = envelopeAtaqueQueda(posKick, 0.002, 0.18);
    const freqKick = 78 - 38 * Math.min(1, posKick / 0.18);
    const kick = Math.sin(2 * Math.PI * freqKick * t) * envKick * 0.23 * especificacao.energia;

    const posHat = faseMeioBeat * segundosPorBeat / 2;
    const envHat = envelopeAtaqueQueda(posHat, 0.001, 0.055);
    const hat = ruidoDeterministico(i, semente) * envHat * 0.035 * especificacao.energia;

    const entrada = Math.min(1, t / 0.08);
    const saida = Math.min(1, (DURACAO - t) / 1.35);
    const envelopeGlobal = Math.max(0, Math.min(entrada, saida));
    const movimento = 0.94 + 0.06 * Math.sin(2 * Math.PI * 0.18 * t + especificacao.variante);
    const centro = (pad + baixo + kick) * envelopeGlobal * movimento;
    const pan = 0.18 * Math.sin(2 * Math.PI * 0.07 * t + especificacao.variante * 0.6);
    const l = centro + arpejo * (0.72 - pan) + hat * 0.62;
    const r = centro + arpejo * (0.72 + pan) - hat * 0.48;
    esquerda[i] = l;
    direita[i] = r;
    pico = Math.max(pico, Math.abs(l), Math.abs(r));
  }

  const ganho = pico > 0 ? 0.88 / pico : 1;
  for (let i = 0; i < frames; i += 1) {
    esquerda[i] *= ganho;
    direita[i] *= ganho;
  }
  return { esquerda, direita };
}

function sha256(arquivo) {
  return crypto.createHash("sha256").update(fs.readFileSync(arquivo)).digest("hex");
}

function gerarCertificado(trilhas) {
  const linhas = [
    "# Certificado técnico de origem das trilhas",
    "",
    `Gerado em: ${new Date().toISOString()}`,
    "",
    "As 60 faixas ativas desta pasta foram sintetizadas localmente pelo script",
    "`scripts/gerar-trilhas-originais.js`. Elas não contêm samples, loops, vozes,",
    "gravações ou melodias importadas de terceiros.",
    "",
    "Cada arquivo possui parâmetros determinísticos e SHA-256 registrado abaixo.",
    "Os MP3 antigos foram preservados, mas não fazem parte do catálogo ativo.",
    "",
    "| ID | Perfil | BPM | SHA-256 |",
    "|---|---:|---:|---|",
    ...trilhas.map((t) => `| ${t.id} | ${t.perfil} | ${t.bpm} | \`${t.sha256}\` |`),
    "",
  ];
  fs.writeFileSync(path.join(DESTINO, "CERTIFICADO-ORIGEM.md"), linhas.join("\n"), "utf-8");
}

function main() {
  const ffmpeg = localizarFFmpeg();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "campos-trilhas-"));
  fs.mkdirSync(DESTINO, { recursive: true });
  const trilhas = [];

  try {
    for (const perfil of PERFIS) {
      for (let variante = 1; variante <= 10; variante += 1) {
        const especificacao = criarEspecificacao(perfil, variante);
        const wav = path.join(tmpDir, `${especificacao.id}.wav`);
        const mp3 = path.join(DESTINO, especificacao.arquivo);
        process.stdout.write(`Gerando ${especificacao.id}... `);
        const audio = sintetizar(especificacao, perfil);
        escreverWav16(wav, audio.esquerda, audio.direita);

        const resultado = spawnSync(ffmpeg, [
          "-hide_banner", "-loglevel", "error",
          "-i", wav,
          "-af", "loudnorm=I=-20:TP=-2.5:LRA=5",
          "-ar", String(SAMPLE_RATE),
          "-ac", String(CANAIS),
          "-codec:a", "libmp3lame",
          "-b:a", "128k",
          "-y", mp3,
        ], { timeout: 120000 });
        if (resultado.status !== 0) {
          throw new Error(`FFmpeg falhou em ${especificacao.id}: ${resultado.stderr?.toString() || ""}`);
        }

        trilhas.push({
          ...especificacao,
          duracao_segundos: DURACAO,
          instrumental: true,
          contem_samples_terceiros: false,
          origem: "sintese-original-local",
          gerador: `scripts/gerar-trilhas-originais.js@${VERSAO_GERADOR}`,
          sha256: sha256(mp3),
        });
        console.log("ok");
      }
    }

    const catalogo = {
      versao: 2,
      gerado_em: new Date().toISOString(),
      quantidade: trilhas.length,
      politica: {
        uso: "trilhas originais para vídeos do Escritório Campos Figueira",
        material_terceiros: false,
        instrumental: true,
        observacao: "Volume final do vídeo é reduzido para preservar a leitura do anúncio.",
      },
      trilhas,
    };
    fs.writeFileSync(
      path.join(DESTINO, "catalogo.json"),
      `${JSON.stringify(catalogo, null, 2)}\n`,
      "utf-8",
    );
    gerarCertificado(trilhas);
    console.log(`\n${trilhas.length} trilhas originais geradas em ${DESTINO}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (require.main === module) main();

module.exports = {
  DURACAO,
  PERFIS,
  VERSAO_GERADOR,
  criarEspecificacao,
  main,
};
