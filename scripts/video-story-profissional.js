"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const RAIZ = path.join(__dirname, "..");
const HISTORICO_PADRAO = path.join(RAIZ, "controle", "estado-modelos-story.json");
const DURACAO_PADRAO = 15;
const LARGURA = 1080;
const ALTURA = 1920;
const COR_DESTAQUE = "0xD9AA4A";

const MODELOS = [
  {
    id: "topo-cinematografico",
    titulo: "Topo cinematográfico",
    descricao: "Monta a arte de cima para baixo com entradas suaves.",
  },
  {
    id: "cascata",
    titulo: "Cascata",
    descricao: "As seções entram em sequência com deslocamentos alternados.",
  },
  {
    id: "iluminacao-dourada",
    titulo: "Iluminação dourada",
    descricao: "Revela cada área com um brilho dourado compatível com a identidade preta e dourada.",
  },
  {
    id: "foco-central",
    titulo: "Foco central",
    descricao: "Abre pela fotografia principal e expande a leitura ao redor.",
  },
  {
    id: "laterais-alternadas",
    titulo: "Laterais alternadas",
    descricao: "Alterna entradas pela esquerda e pela direita sem perder legibilidade.",
  },
  {
    id: "subida-cinematografica",
    titulo: "Subida cinematográfica",
    descricao: "Os elementos sobem para a posição final, começando pela fotografia e nunca pelo site.",
  },
];

const FAIXAS = [
  { id: "cabecalho", y: 0, h: 200 },
  { id: "foto-principal", y: 200, h: 450 },
  { id: "titulo", y: 650, h: 140 },
  { id: "fotos-internas", y: 790, h: 320 },
  { id: "preco", y: 1110, h: 140 },
  { id: "detalhes", y: 1250, h: 580 },
  { id: "rodape", y: 1830, h: 90 },
];

const ROTEIROS = {
  "topo-cinematografico": {
    ordem: ["cabecalho", "foto-principal", "titulo", "fotos-internas", "preco", "detalhes", "rodape"],
    inicios: [0.2, 1.35, 3.0, 4.55, 6.25, 8.05, 10.75],
    deslocamentos: [
      { dx: 0, dy: -45 },
      { dx: 55, dy: 0 },
      { dx: 0, dy: 32 },
      { dx: -55, dy: 0 },
      { dx: 45, dy: 0 },
      { dx: 0, dy: 35 },
      { dx: 0, dy: 24 },
    ],
  },
  cascata: {
    ordem: ["foto-principal", "titulo", "fotos-internas", "preco", "cabecalho", "detalhes", "rodape"],
    inicios: [0.15, 1.75, 3.15, 4.75, 6.35, 7.95, 10.65],
    deslocamentos: [
      { dx: 85, dy: -20 },
      { dx: -75, dy: 22 },
      { dx: 80, dy: 18 },
      { dx: -65, dy: 18 },
      { dx: 60, dy: -25 },
      { dx: -55, dy: 25 },
      { dx: 45, dy: 18 },
    ],
  },
  "iluminacao-dourada": {
    ordem: ["foto-principal", "titulo", "preco", "fotos-internas", "detalhes", "cabecalho", "rodape"],
    inicios: [0.15, 1.85, 3.45, 5.05, 6.75, 8.85, 10.85],
    deslocamentos: [
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
    ],
  },
  "foco-central": {
    ordem: ["foto-principal", "titulo", "fotos-internas", "preco", "cabecalho", "detalhes", "rodape"],
    inicios: [0.15, 1.55, 3.05, 4.65, 6.25, 7.95, 10.75],
    deslocamentos: [
      { dx: 0, dy: 0 },
      { dx: 0, dy: -35 },
      { dx: 0, dy: 35 },
      { dx: -45, dy: 0 },
      { dx: 0, dy: -40 },
      { dx: 45, dy: 0 },
      { dx: 0, dy: 25 },
    ],
  },
  "laterais-alternadas": {
    ordem: ["cabecalho", "foto-principal", "titulo", "fotos-internas", "preco", "detalhes", "rodape"],
    inicios: [0.2, 1.25, 2.95, 4.45, 6.05, 7.75, 10.6],
    deslocamentos: [
      { dx: -85, dy: 0 },
      { dx: 90, dy: 0 },
      { dx: -75, dy: 0 },
      { dx: 80, dy: 0 },
      { dx: -65, dy: 0 },
      { dx: 70, dy: 0 },
      { dx: -45, dy: 0 },
    ],
  },
  "subida-cinematografica": {
    ordem: ["foto-principal", "titulo", "fotos-internas", "preco", "detalhes", "cabecalho", "rodape"],
    inicios: [0.15, 1.6, 3.05, 4.55, 6.15, 8.65, 10.85],
    deslocamentos: [
      { dx: 0, dy: 65 },
      { dx: 0, dy: 55 },
      { dx: 0, dy: 55 },
      { dx: 0, dy: 50 },
      { dx: 0, dy: 45 },
      { dx: 0, dy: 40 },
      { dx: 0, dy: 30 },
    ],
  },
};

function lerJson(arquivo, fallback) {
  if (!fs.existsSync(arquivo)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(arquivo, "utf8"));
  } catch {
    return fallback;
  }
}

function hashNumero(texto) {
  return Number.parseInt(
    crypto.createHash("sha256").update(String(texto)).digest("hex").slice(0, 12),
    16,
  );
}

function carregarHistoricoModelos(historicoPath = HISTORICO_PADRAO) {
  const historico = lerJson(historicoPath, { versao: 1, usos: [] });
  return {
    versao: 1,
    usos: Array.isArray(historico.usos) ? historico.usos : [],
  };
}

function selecionarModeloStory({
  codigo = "sem-codigo",
  chavePublicacao,
  historicoPath = HISTORICO_PADRAO,
}) {
  const historico = carregarHistoricoModelos(historicoPath);
  const chave = chavePublicacao || `${codigo}|${new Date().toISOString().slice(0, 10)}`;

  const mesmoUso = [...historico.usos]
    .reverse()
    .find((uso) => uso.chave_publicacao === chave);
  if (mesmoUso) {
    const modelo = MODELOS.find((item) => item.id === mesmoUso.modelo_id);
    if (modelo) return { ...modelo, chavePublicacao: chave, reutilizado: true };
  }

  const estatisticas = new Map();
  historico.usos.forEach((uso, indice) => {
    const atual = estatisticas.get(uso.modelo_id) || { quantidade: 0, ultimoIndice: -1 };
    atual.quantidade += 1;
    atual.ultimoIndice = indice;
    estatisticas.set(uso.modelo_id, atual);
  });
  const ultimoModelo = historico.usos.at(-1)?.modelo_id;

  const candidatos = MODELOS
    .filter((modelo) => MODELOS.length === 1 || modelo.id !== ultimoModelo)
    .sort((a, b) => {
      const ea = estatisticas.get(a.id) || { quantidade: 0, ultimoIndice: -1 };
      const eb = estatisticas.get(b.id) || { quantidade: 0, ultimoIndice: -1 };
      if (ea.quantidade !== eb.quantidade) return ea.quantidade - eb.quantidade;
      if (ea.ultimoIndice !== eb.ultimoIndice) return ea.ultimoIndice - eb.ultimoIndice;
      return hashNumero(`${chave}|${a.id}`) - hashNumero(`${chave}|${b.id}`);
    });

  return { ...candidatos[0], chavePublicacao: chave, reutilizado: false };
}

function registrarUsoModelo(
  modelo,
  { codigo = "sem-codigo", historicoPath = HISTORICO_PADRAO } = {},
) {
  if (!modelo?.id || !modelo?.chavePublicacao) return;
  const historico = carregarHistoricoModelos(historicoPath);
  if (historico.usos.some((uso) => uso.chave_publicacao === modelo.chavePublicacao)) return;

  historico.usos.push({
    modelo_id: modelo.id,
    codigo,
    chave_publicacao: modelo.chavePublicacao,
    usado_em: new Date().toISOString(),
  });
  historico.usos = historico.usos.slice(-240);
  fs.mkdirSync(path.dirname(historicoPath), { recursive: true });
  fs.writeFileSync(historicoPath, `${JSON.stringify(historico, null, 2)}\n`, "utf8");
}

function expressaoDeslocamento(base, delta, inicio, duracao) {
  if (!delta) return String(base);
  const fim = inicio + duracao;
  return `${base}+if(lt(t,${inicio}),${delta},if(lt(t,${fim}),${delta}*(1-(t-${inicio})/${duracao}),0))`;
}

function construirFiltroVideo(modeloId, duracao = DURACAO_PADRAO) {
  const roteiro = ROTEIROS[modeloId];
  if (!roteiro) throw new Error(`Modelo de Story desconhecido: ${modeloId}`);
  const entradaPorFaixa = new Map();

  roteiro.ordem.forEach((faixaId, indice) => {
    entradaPorFaixa.set(faixaId, {
      inicio: roteiro.inicios[indice],
      movimento: roteiro.deslocamentos[indice],
    });
  });

  const filtros = [
    `[0:v]scale=${LARGURA}:${ALTURA},setsar=1,fps=30,format=rgba,split=8[bg0]${FAIXAS.map((_, i) => `[s${i + 1}]`).join("")}`,
    "[bg0]eq=brightness=-0.44:saturation=0.34,boxblur=13:2,drawbox=color=black@0.22:t=fill[bg]",
  ];

  FAIXAS.forEach((faixa, indice) => {
    const entrada = entradaPorFaixa.get(faixa.id);
    filtros.push(
      `[s${indice + 1}]crop=${LARGURA}:${faixa.h}:0:${faixa.y},fade=t=in:st=${entrada.inicio}:d=0.85:alpha=1[f${indice + 1}]`,
    );
  });

  let anterior = "bg";
  FAIXAS.forEach((faixa, indice) => {
    const entrada = entradaPorFaixa.get(faixa.id);
    const x = expressaoDeslocamento(0, entrada.movimento.dx, entrada.inicio, 0.85);
    const y = expressaoDeslocamento(faixa.y, entrada.movimento.dy, entrada.inicio, 0.85);
    const saida = `v${indice + 1}`;
    filtros.push(`[${anterior}][f${indice + 1}]overlay=x='${x}':y='${y}'[${saida}]`);
    anterior = saida;
  });

  if (modeloId === "iluminacao-dourada") {
    roteiro.ordem.forEach((faixaId, indice) => {
      const faixa = FAIXAS.find((item) => item.id === faixaId);
      const inicio = roteiro.inicios[indice];
      const saida = `luz${indice + 1}`;
      filtros.push(
        `[${anterior}]drawbox=x=0:y=${faixa.y}:w=${LARGURA}:h=${faixa.h}:color=${COR_DESTAQUE}@0.16:t=fill:enable='between(t,${inicio},${inicio + 0.58})'[${saida}]`,
      );
      anterior = saida;
    });
  }

  filtros.push(`[${anterior}]format=yuv420p[v]`);
  return filtros.join(";");
}

function gerarVideoStoryProfissional({
  ffmpeg,
  imagemPath,
  audioPath,
  outputPath,
  modeloId,
  duracao = DURACAO_PADRAO,
  timeoutMs = 180000,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const filtroVideo = construirFiltroVideo(modeloId, duracao);
  const args = ["-y", "-loop", "1", "-i", imagemPath];

  if (audioPath) {
    args.push("-stream_loop", "-1", "-i", audioPath);
    args.push(
      "-filter_complex",
      `${filtroVideo};[1:a]atrim=0:${duracao},asetpts=N/SR/TB,loudnorm=I=-23:TP=-4:LRA=5,volume=0.78,afade=t=in:st=0:d=0.8,afade=t=out:st=${duracao - 1.5}:d=1.5[a]`,
      "-map",
      "[v]",
      "-map",
      "[a]",
    );
  } else {
    args.push("-filter_complex", filtroVideo, "-map", "[v]", "-an");
  }

  args.push(
    "-t",
    String(duracao),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-profile:v",
    "high",
    "-level",
    "4.1",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-ar",
    "44100",
    "-movflags",
    "+faststart",
    outputPath,
  );

  const resultado = spawnSync(ffmpeg, args, {
    encoding: "utf8",
    timeout: timeoutMs,
  });
  if (resultado.status !== 0) {
    const detalhe = resultado.stderr?.slice(-1200) || resultado.error?.message || "erro desconhecido";
    throw new Error(`FFmpeg falhou no modelo ${modeloId}: ${detalhe}`);
  }
  return outputPath;
}

module.exports = {
  ALTURA,
  COR_DESTAQUE,
  DURACAO_PADRAO,
  FAIXAS,
  HISTORICO_PADRAO,
  LARGURA,
  MODELOS,
  ROTEIROS,
  carregarHistoricoModelos,
  construirFiltroVideo,
  gerarVideoStoryProfissional,
  registrarUsoModelo,
  selecionarModeloStory,
};
