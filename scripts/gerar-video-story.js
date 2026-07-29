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

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { registrarUsoTrilha, selecionarTrilha } = require("./biblioteca-trilhas");
const {
  DURACAO_PADRAO,
  gerarVideoStoryProfissional,
  registrarUsoModelo,
  selecionarModeloStory,
} = require("./video-story-profissional");

const RAIZ = path.join(__dirname, "..");
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
  const dataPublicacao = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const chavePublicacao = `${dataPublicacao}|manual|CF-${codigo}`;
  const trilha = selecionarTrilha({
    emocao,
    codigo: `CF-${codigo}`,
    chavePublicacao,
  });
  const modelo = selecionarModeloStory({
    codigo: `CF-${codigo}`,
    chavePublicacao,
  });
  const trilhaPath = trilha?.caminho;
  const semMusicaFallback = !trilhaPath || !fs.existsSync(trilhaPath);
  if (semMusicaFallback) {
    console.warn(`⚠️  Trilha não encontrada para "${emocao}". Gerando vídeo sem música.`);
  } else {
    console.log(`🎵 Trilha: ${trilha.id} · ${path.basename(trilhaPath)} (${emocao})`);
  }
  console.log(`🎞️ Modelo: ${modelo.titulo} (${modelo.id})`);

  // Gerar vídeo
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  const videoSaida = path.join(
    VIDEOS_DIR,
    `CF-${codigo}-story-${dataPublicacao}-manual-${modelo.id}-${trilha?.id || "sem-musica"}.mp4`,
  );

  console.log(`\n🎬 Gerando vídeo profissional (${DURACAO_PADRAO}s, 1080×1920)...`);
  try {
    gerarVideoStoryProfissional({
      ffmpeg,
      imagemPath: imagemLocal,
      audioPath: semMusicaFallback ? null : trilhaPath,
      outputPath: videoSaida,
      modeloId: modelo.id,
    });
    const tamanho = Math.round(fs.statSync(videoSaida).size / 1024 / 1024 * 10) / 10;
    if (trilha) registrarUsoTrilha(trilha, { codigo: `CF-${codigo}`, emocao });
    registrarUsoModelo(modelo, { codigo: `CF-${codigo}` });
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
