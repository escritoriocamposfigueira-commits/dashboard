/**
 * gerar-video-story.js — Converte imagem 9:16 em vídeo story com música
 *
 * Uso:
 *   node scripts/gerar-video-story.js <codigo-imovel> [emocao]
 *
 * Exemplos:
 *   node scripts/gerar-video-story.js 516
 *   node scripts/gerar-video-story.js 516 sonho
 *   node scripts/gerar-video-story.js 515 urgencia
 *
 * Emoções disponíveis: sonho | urgencia | conquista | confianca | familiar
 *
 * Requer: FFmpeg em C:\Users\Henrique\ffmpeg\bin\ffmpeg.exe ou no PATH
 */

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const TRILHAS_DIR = path.join(RAIZ, "TRILHAS");
const MANIFEST = path.join(RAIZ, "src/content/imagens-urls.json");
const VIDEOS_DIR = path.join(RAIZ, "public/videos");

// Localiza o FFmpeg
function encontrarFFmpeg() {
  const candidatos = [
    "ffmpeg",
    "C:\\Users\\Henrique\\ffmpeg\\bin\\ffmpeg.exe",
    "/c/Users/Henrique/ffmpeg/bin/ffmpeg.exe",
    path.join(process.env.USERPROFILE || "", "ffmpeg", "bin", "ffmpeg.exe"),
  ];
  for (const c of candidatos) {
    try {
      const r = spawnSync(c, ["-version"], { encoding: "utf-8", timeout: 5000 });
      if (r.status === 0) return c;
    } catch {}
  }
  return null;
}

// Seleciona trilha com base na emoção
function selecionarTrilha(emocao = "sonho") {
  const catalogoPath = path.join(TRILHAS_DIR, "catalogo.json");
  if (!fs.existsSync(catalogoPath)) return null;

  const catalogo = JSON.parse(fs.readFileSync(catalogoPath, "utf-8"));
  const trilhas = catalogo.trilhas.filter((t) => t.emocao === emocao);
  if (trilhas.length === 0) {
    const todas = catalogo.trilhas;
    if (todas.length === 0) return null;
    return path.join(TRILHAS_DIR, todas[0].nome);
  }
  // Rotação: escolhe com base no dia da semana para variar
  const idx = new Date().getDay() % trilhas.length;
  return path.join(TRILHAS_DIR, trilhas[idx].nome);
}

// Detecta emoção com base na copy do imóvel
function detectarEmocao(caption = "") {
  const texto = caption.toLowerCase();
  if (/urgência|oportunidade|não perde|última|agora|rápido|corre/.test(texto)) return "urgencia";
  if (/família|filho|criança|lazer|reunir|amor/.test(texto)) return "familiar";
  if (/conquista|patrimônio|vitória|realizou|sonho se tornou/.test(texto)) return "conquista";
  if (/engenharia|advocacia|escritório|profissional|negócio/.test(texto)) return "confianca";
  return "sonho"; // padrão: inspirador
}

async function gerarVideoStory(codigo, emocaoOverride) {
  const ffmpeg = encontrarFFmpeg();
  if (!ffmpeg) {
    console.error("❌ FFmpeg não encontrado. Instale em C:\\Users\\Henrique\\ffmpeg\\bin");
    process.exit(1);
  }
  console.log(`✅ FFmpeg: ${ffmpeg}`);

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf-8"));
  const urlStory = manifest.urls[codigo];
  if (!urlStory) {
    console.error(`❌ Código ${codigo} não encontrado no manifest.`);
    process.exit(1);
  }

  // Carregar captions para detectar emoção
  const captionsPath = path.join(RAIZ, "src/content/captions-imoveis.json");
  const captions = JSON.parse(fs.readFileSync(captionsPath, "utf-8"));
  const cap = captions.find((c) => c.codigo_imovel === codigo);
  const emocao = emocaoOverride || detectarEmocao(cap?.caption || "");
  console.log(`🎭 Emoção detectada: ${emocao}`);

  // Baixar imagem da URL para arquivo temporário
  const tmpDir = path.join(RAIZ, ".tmp-videos");
  fs.mkdirSync(tmpDir, { recursive: true });
  const imagemLocal = path.join(tmpDir, `CF-${codigo}-story.png`);

  console.log(`⬇️  Baixando imagem: ${urlStory}`);
  const https = require("https");
  await new Promise((resolve, reject) => {
    const arquivo = fs.createWriteStream(imagemLocal);
    https.get(urlStory, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        arquivo.close();
        https.get(res.headers.location, (res2) => { res2.pipe(arquivo); arquivo.on("finish", resolve); }).on("error", reject);
      } else {
        res.pipe(arquivo);
        arquivo.on("finish", resolve);
      }
    }).on("error", reject);
  });
  console.log(`✅ Imagem baixada: ${imagemLocal}`);

  // Selecionar trilha
  const trilhaPath = selecionarTrilha(emocao);
  const semMusicaFallback = !trilhaPath || !fs.existsSync(trilhaPath);
  if (semMusicaFallback) {
    console.warn(`⚠️  Trilha não encontrada para "${emocao}". Gerando vídeo sem música.`);
  } else {
    console.log(`🎵 Trilha: ${path.basename(trilhaPath)} (${emocao})`);
  }

  // Gerar vídeo
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  const videoSaida = path.join(VIDEOS_DIR, `CF-${codigo}-story.mp4`);

  const DURACAO = 12; // segundos

  // Filtro Ken Burns: zoom suave de 1.0 para 1.15 + pan central
  // Dimensão alvo: 1080x1920 (9:16 para Stories)
  const filtroVideo = [
    `scale=1080:1920:force_original_aspect_ratio=decrease`,
    `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`,
    `zoompan=z='if(lte(zoom,1.0),1.0,zoom+0.0010)':d=${DURACAO * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=25`,
    `format=yuv420p`,
  ].join(",");

  let cmd;
  if (semMusicaFallback) {
    cmd = [
      `"${ffmpeg}"`,
      `-loop 1 -i "${imagemLocal}"`,
      `-t ${DURACAO}`,
      `-vf "${filtroVideo}"`,
      `-c:v libx264 -preset fast -crf 23`,
      `-movflags +faststart`,
      `-y "${videoSaida}"`,
    ].join(" ");
  } else {
    cmd = [
      `"${ffmpeg}"`,
      `-loop 1 -i "${imagemLocal}"`,
      `-i "${trilhaPath}"`,
      `-t ${DURACAO}`,
      `-vf "${filtroVideo}"`,
      `-c:v libx264 -preset fast -crf 23`,
      `-c:a aac -b:a 128k -ar 44100`,
      `-af "afade=t=out:st=${DURACAO - 2}:d=2,volume=0.7"`,
      `-shortest -movflags +faststart`,
      `-y "${videoSaida}"`,
    ].join(" ");
  }

  console.log(`\n🎬 Gerando vídeo (${DURACAO}s, 1080×1920, Ken Burns)...`);
  try {
    execSync(cmd, { stdio: "pipe", timeout: 120000 });
    const tamanho = Math.round(fs.statSync(videoSaida).size / 1024 / 1024 * 10) / 10;
    console.log(`✅ Vídeo gerado: ${videoSaida} (${tamanho}MB)`);
    return videoSaida;
  } catch (e) {
    console.error("❌ Erro no FFmpeg:", e.stderr?.toString()?.slice(-300) || e.message);
    process.exit(1);
  }
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const codigo = args[0];
const emocao = args[1];

if (!codigo) {
  console.log("Uso: node scripts/gerar-video-story.js <codigo> [emocao]");
  console.log("Emoções: sonho | urgencia | conquista | confianca | familiar");
  process.exit(0);
}

gerarVideoStory(codigo, emocao)
  .then((video) => {
    console.log(`\n📁 Arquivo pronto: ${video}`);
    console.log(`📤 Faça git add + push ou use o script publicar-story-video.js`);
  })
  .catch((e) => { console.error("❌", e.message); process.exit(1); });
