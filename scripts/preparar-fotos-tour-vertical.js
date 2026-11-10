"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const RAIZ = path.resolve(__dirname, "..");
const TMP = path.join(RAIZ, ".tmp-tour-etapa2");
const BASE = path.join(RAIZ, "src", "content", "base-imoveis-site.json");
const CODIGOS = ["CF-620", "CF-609", "CF-493"];
const EXTRAS_OFICIAIS = {
  "CF-609": [
    "https://escritoriocamposfigueira.com.br/uploads/imoveis-360/1779715083947-hak3216m9fs.jpg",
    "https://escritoriocamposfigueira.com.br/uploads/imoveis-360/1779715085019-mrzoszotq4s.jpg",
  ],
};

function executar(programa, args, opcoes = {}) {
  const resultado = spawnSync(programa, args, {
    encoding: opcoes.encoding === undefined ? "utf8" : opcoes.encoding,
    maxBuffer: 30 * 1024 * 1024,
    timeout: opcoes.timeout || 60_000,
  });
  if (resultado.status !== 0) {
    throw new Error(`${programa} falhou: ${(resultado.stderr || resultado.error?.message || "erro desconhecido").toString().slice(-1200)}`);
  }
  return resultado;
}

function metadata(arquivo) {
  const resultado = executar("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "json",
    arquivo,
  ]);
  const stream = JSON.parse(resultado.stdout).streams?.[0] || {};
  return { largura: Number(stream.width || 0), altura: Number(stream.height || 0) };
}

function pixelsCinza(arquivo) {
  return executar("ffmpeg", [
    "-v", "error", "-i", arquivo,
    "-vf", "scale=9:8,format=gray",
    "-frames:v", "1", "-f", "rawvideo", "pipe:1",
  ], { encoding: null }).stdout;
}

function dhashEBilho(arquivo) {
  const pixels = pixelsCinza(arquivo);
  let bits = "";
  let soma = 0;
  for (const pixel of pixels) soma += pixel;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits += pixels[y * 9 + x] > pixels[y * 9 + x + 1] ? "1" : "0";
    }
  }
  return {
    dhash: BigInt(`0b${bits}`).toString(16).padStart(16, "0"),
    brilho: Math.round((soma / pixels.length) * 10) / 10,
  };
}

function distanciaHash(a, b) {
  let valor = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let total = 0;
  while (valor) {
    total += Number(valor & 1n);
    valor >>= 1n;
  }
  return total;
}

async function baixar(url, destino) {
  if (fs.existsSync(destino) && fs.statSync(destino).size > 10_000) return;
  const resposta = await fetch(url, { headers: { "User-Agent": "campos-figueira-tour/1.0" } });
  if (!resposta.ok) throw new Error(`foto respondeu HTTP ${resposta.status}: ${url}`);
  const tipo = String(resposta.headers.get("content-type") || "");
  if (!tipo.startsWith("image/")) throw new Error(`URL não retornou imagem: ${url}`);
  fs.writeFileSync(destino, Buffer.from(await resposta.arrayBuffer()));
}

function criarContato(pasta, quantidade) {
  const lista = path.join(pasta, "lista-contato.txt");
  const linhas = [];
  for (let i = 1; i <= quantidade; i += 1) {
    const arquivo = path.join(pasta, `${String(i).padStart(2, "0")}.jpg`).replace(/'/g, "'\\''");
    linhas.push(`file '${arquivo}'`, "duration 1");
  }
  fs.writeFileSync(lista, `${linhas.join("\n")}\n`, "utf8");
  const colunas = 4;
  const linhasGrade = Math.ceil(quantidade / colunas);
  const filtro = [
    "fps=1",
    "scale=320:240:force_original_aspect_ratio=decrease",
    "pad=320:240:(ow-iw)/2:(oh-ih)/2:color=black",
    "drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='%{eif\\:n+1\\:d\\:2}':x=12:y=12:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.75:boxborderw=8",
    `tile=${colunas}x${linhasGrade}:padding=6:margin=6:color=0x111111`,
  ].join(",");
  executar("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", lista,
    "-vf", filtro, "-frames:v", "1", "-q:v", "2",
    path.join(pasta, "contato.jpg"),
  ], { timeout: 120_000 });
}

async function main() {
  const base = JSON.parse(fs.readFileSync(BASE, "utf8"));
  fs.mkdirSync(TMP, { recursive: true });
  const resumo = {};
  for (const codigo of CODIGOS) {
    const imovel = base.anuncios.find((item) => item.codigo === codigo);
    if (!imovel) throw new Error(`${codigo} não encontrado na base oficial`);
    const urls = [...new Set([...(imovel.fotos || []), ...(EXTRAS_OFICIAIS[codigo] || [])])];
    const pasta = path.join(TMP, codigo);
    fs.mkdirSync(pasta, { recursive: true });
    await Promise.all(urls.map((url, indice) => baixar(url, path.join(pasta, `${String(indice + 1).padStart(2, "0")}.jpg`))));
    const itens = urls.map((url, indice) => {
      const numero = indice + 1;
      const arquivo = path.join(pasta, `${String(numero).padStart(2, "0")}.jpg`);
      const dimensoes = metadata(arquivo);
      const imagem = fs.readFileSync(arquivo);
      return {
        numero,
        arquivo,
        url,
        ...dimensoes,
        ...dhashEBilho(arquivo),
        sha256: crypto.createHash("sha256").update(imagem).digest("hex"),
        bytes: imagem.length,
      };
    });
    for (const item of itens) {
      const parecida = itens.find((outra) => outra.numero < item.numero && distanciaHash(item.dhash, outra.dhash) <= 5);
      item.possivel_duplicata_de = parecida?.numero || null;
      item.apta_resolucao = Math.max(item.largura, item.altura) >= 1000;
      item.apta_brilho = item.brilho >= 45;
    }
    criarContato(pasta, itens.length);
    fs.writeFileSync(path.join(pasta, "analise.json"), `${JSON.stringify({ codigo, imovel, itens }, null, 2)}\n`, "utf8");
    resumo[codigo] = {
      fotos_oficiais: urls.length,
      aptas: itens.filter((item) => item.apta_resolucao && item.apta_brilho && !item.possivel_duplicata_de).length,
      contato: path.join(pasta, "contato.jpg"),
    };
  }
  console.log(JSON.stringify(resumo, null, 2));
}

if (require.main === module) {
  main().catch((erro) => {
    console.error(erro.message);
    process.exitCode = 1;
  });
}

module.exports = {
  CODIGOS,
  EXTRAS_OFICIAIS,
  dhashEBilho,
  distanciaHash,
};
