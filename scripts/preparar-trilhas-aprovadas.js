/**
 * Prepara os trechos contínuos das músicas aprovadas e atualiza o catálogo ativo.
 *
 * - Lote 1: usa os arquivos completos já baixados na pasta de avaliação.
 * - Lotes 2 e 3: baixa temporariamente o MP3 original do Mixkit.
 * - Gera um trecho contínuo de 20s, extraído da região central da música.
 * - Normaliza o volume e registra origem, licença, duração e SHA-256.
 *
 * Uso:
 *   node scripts/preparar-trilhas-aprovadas.js
 */

"use strict";

/* eslint-disable @typescript-eslint/no-require-imports */

const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const RAIZ = path.join(__dirname, "..");
const TRILHAS_DIR = path.join(RAIZ, "TRILHAS");
const MANIFESTO_PATH = path.join(TRILHAS_DIR, "aprovadas-manifesto.json");
const DESTINO_DIR = path.join(TRILHAS_DIR, "aprovadas");
const CATALOGO_PATH = path.join(TRILHAS_DIR, "catalogo.json");
const DURACAO_TRECHO = 20;
const EMOCOES = ["sonho", "confianca", "conquista", "familiar", "urgencia"];

function localizarExecutavel(nome) {
  const candidatos = [
    nome,
    `C:\\Users\\Henrique\\ffmpeg\\bin\\${nome}.exe`,
    path.join(process.env.USERPROFILE || "", "ffmpeg", "bin", `${nome}.exe`),
    `/usr/bin/${nome}`,
    `/usr/local/bin/${nome}`,
  ];
  return candidatos.find((candidato) => {
    if (path.isAbsolute(candidato)) return fs.existsSync(candidato);
    const teste = spawnSync(process.platform === "win32" ? "where" : "which", [candidato]);
    return teste.status === 0;
  });
}

function baixar(url, destino, redirecionamentos = 0) {
  if (redirecionamentos > 5) {
    return Promise.reject(new Error(`Redirecionamentos demais ao baixar ${url}`));
  }
  return new Promise((resolve, reject) => {
    const requisicao = https.get(url, { headers: { "User-Agent": "Campos-Figueira-Robo/1.0" } }, (resposta) => {
      if (resposta.statusCode >= 300 && resposta.statusCode < 400 && resposta.headers.location) {
        resposta.resume();
        baixar(new URL(resposta.headers.location, url).toString(), destino, redirecionamentos + 1)
          .then(resolve, reject);
        return;
      }
      if (resposta.statusCode !== 200) {
        resposta.resume();
        reject(new Error(`HTTP ${resposta.statusCode} ao baixar ${url}`));
        return;
      }
      const arquivo = fs.createWriteStream(destino);
      resposta.pipe(arquivo);
      arquivo.on("finish", () => arquivo.close(resolve));
      arquivo.on("error", reject);
    });
    requisicao.setTimeout(90000, () => requisicao.destroy(new Error(`Timeout ao baixar ${url}`)));
    requisicao.on("error", reject);
  });
}

function slug(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function arquivoLoteUm(trilha) {
  const pasta = path.join(TRILHAS_DIR, "AVALIACAO_D_50");
  const prefixo = `${String(trilha.numero).padStart(2, "0")}-`;
  const sufixo = `-mixkit-${trilha.mixkit_id}.mp3`;
  return fs.readdirSync(pasta)
    .filter((nome) => nome.startsWith(prefixo) && nome.endsWith(sufixo))
    .map((nome) => path.join(pasta, nome))[0];
}

function duracao(ffprobe, arquivo) {
  const resultado = spawnSync(ffprobe, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1",
    arquivo,
  ], { encoding: "utf-8" });
  if (resultado.status !== 0) {
    throw new Error(`FFprobe falhou em ${arquivo}: ${resultado.stderr}`);
  }
  return Number.parseFloat(resultado.stdout.trim());
}

function gerarTrecho(ffmpeg, origem, destino, duracaoOrigem) {
  const inicio = Math.max(0, Math.min(duracaoOrigem * 0.45, duracaoOrigem - DURACAO_TRECHO));
  const resultado = spawnSync(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-ss", inicio.toFixed(3),
    "-i", origem,
    "-t", String(DURACAO_TRECHO),
    "-af", "loudnorm=I=-18:LRA=7:TP=-1.5,afade=t=in:st=0:d=0.35,afade=t=out:st=19:d=1",
    "-ar", "44100",
    "-b:a", "160k",
    destino,
  ], { encoding: "utf-8" });
  if (resultado.status !== 0) {
    throw new Error(`FFmpeg falhou em ${origem}: ${resultado.stderr}`);
  }
}

function sha256(arquivo) {
  return crypto.createHash("sha256").update(fs.readFileSync(arquivo)).digest("hex");
}

async function main() {
  const ffmpeg = localizarExecutavel("ffmpeg");
  const ffprobe = localizarExecutavel("ffprobe");
  if (!ffmpeg || !ffprobe) throw new Error("FFmpeg/FFprobe não encontrados.");

  const manifesto = JSON.parse(fs.readFileSync(MANIFESTO_PATH, "utf-8"));
  if (manifesto.trilhas.length !== manifesto.quantidade) {
    throw new Error("Quantidade do manifesto não corresponde à lista.");
  }
  if (new Set(manifesto.trilhas.map((trilha) => trilha.mixkit_id)).size !== manifesto.quantidade) {
    throw new Error("O manifesto contém IDs duplicados.");
  }

  fs.mkdirSync(DESTINO_DIR, { recursive: true });
  const temporarios = fs.mkdtempSync(path.join(os.tmpdir(), "campos-aprovadas-"));
  const catalogoTrilhas = [];

  try {
    for (let indice = 0; indice < manifesto.trilhas.length; indice += 1) {
      const trilha = manifesto.trilhas[indice];
      const id = `mixkit-${trilha.mixkit_id}`;
      const nomeArquivo = `${String(indice + 1).padStart(2, "0")}-${slug(trilha.titulo)}-${id}.mp3`;
      const destino = path.join(DESTINO_DIR, nomeArquivo);
      const fonteUrl = `https://assets.mixkit.co/music/${trilha.mixkit_id}/${trilha.mixkit_id}.mp3`;
      const destinoValido =
        fs.existsSync(destino) && duracao(ffprobe, destino) >= DURACAO_TRECHO - 0.2;
      let inicioTrecho = null;

      if (!destinoValido) {
        let origem;
        if (trilha.lote === 1) {
          origem = arquivoLoteUm(trilha);
          if (!origem) throw new Error(`Arquivo do lote 1 não encontrado: ${trilha.titulo}`);
        } else {
          origem = path.join(temporarios, `${id}.mp3`);
          await baixar(fonteUrl, origem);
        }
        const duracaoOrigem = duracao(ffprobe, origem);
        inicioTrecho = Math.max(
          0,
          Math.min(duracaoOrigem * 0.45, duracaoOrigem - DURACAO_TRECHO),
        );
        gerarTrecho(ffmpeg, origem, destino, duracaoOrigem);
      }
      const duracaoFinal = duracao(ffprobe, destino);
      if (duracaoFinal < DURACAO_TRECHO - 0.2) {
        throw new Error(`Trecho final curto demais: ${nomeArquivo} (${duracaoFinal}s)`);
      }

      catalogoTrilhas.push({
        id,
        arquivo: `aprovadas/${nomeArquivo}`,
        titulo: trilha.titulo,
        artista: trilha.artista,
        perfil: "aprovada",
        emocoes: EMOCOES,
        descricao: "Música selecionada e aprovada auditivamente pelo usuário.",
        duracao_segundos: Number(duracaoFinal.toFixed(3)),
        instrumental: true,
        avaliacao_sem_voz_gemido: true,
        aprovada_pelo_usuario: true,
        lote_avaliacao: trilha.lote,
        numero_avaliacao: trilha.numero,
        origem: "mixkit-stock-music-free-license",
        fonte_url: fonteUrl,
        licenca: manifesto.licenca,
        licenca_url: manifesto.licenca_url,
        trecho_inicio_segundos: inicioTrecho === null ? null : Number(inicioTrecho.toFixed(3)),
        sha256: sha256(destino),
      });
      console.log(`[${indice + 1}/${manifesto.quantidade}] ${trilha.titulo}`);
    }

    const catalogo = {
      versao: 3,
      gerado_em: new Date().toISOString(),
      quantidade: catalogoTrilhas.length,
      politica: {
        uso: "trilhas licenciadas e aprovadas para vídeos do Escritório Campos Figueira",
        material_terceiros: true,
        instrumental: true,
        fonte: manifesto.fonte,
        licenca: manifesto.licenca,
        licenca_url: manifesto.licenca_url,
        observacao: "O robô percorre todas as faixas antes de repetir; o vídeo normaliza o volume.",
      },
      trilhas: catalogoTrilhas,
    };
    fs.writeFileSync(CATALOGO_PATH, `${JSON.stringify(catalogo, null, 2)}\n`, "utf-8");
    const certificado = [
      "# Registro de origem e licença das trilhas ativas",
      "",
      `Gerado em: ${catalogo.gerado_em}`,
      "",
      `As ${catalogoTrilhas.length} faixas ativas foram selecionadas pelo usuário em três`,
      "rodadas de avaliação auditiva. Cada arquivo ativo é um trecho contínuo de 20 segundos,",
      "preparado a partir da música indicada na coluna Fonte.",
      "",
      `Licença declarada pela fonte: [${manifesto.licenca}](${manifesto.licenca_url})`,
      "",
      "Este registro documenta a procedência e a integridade dos arquivos, mas não promete",
      "ausência absoluta de reivindicações automatizadas de Content ID. Os antigos arquivos",
      "sintéticos permanecem no repositório somente como histórico e não fazem parte do catálogo.",
      "",
      "| ID ativo | Título | Artista | Lote | Fonte | SHA-256 |",
      "|---|---|---|---:|---|---|",
      ...catalogoTrilhas.map((trilha) => [
        `| ${trilha.id}`,
        trilha.titulo.replace(/\|/g, "\\|"),
        trilha.artista.replace(/\|/g, "\\|"),
        trilha.lote_avaliacao,
        `[Mixkit](${trilha.fonte_url})`,
        `\`${trilha.sha256}\` |`,
      ].join(" | ")),
    ].join("\n");
    fs.writeFileSync(
      path.join(TRILHAS_DIR, "CERTIFICADO-ORIGEM.md"),
      `${certificado}\n`,
      "utf-8",
    );
    console.log(`Catálogo ativo atualizado com ${catalogoTrilhas.length} músicas aprovadas.`);
  } finally {
    fs.rmSync(temporarios, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  });
}

module.exports = { DURACAO_TRECHO, main, slug };
