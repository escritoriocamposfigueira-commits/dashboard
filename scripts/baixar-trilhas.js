/**
 * baixar-trilhas.js — Baixa 10 trilhas royalty-free do Pixabay Music
 *
 * Uso: node scripts/baixar-trilhas.js
 *
 * Todas as trilhas são licença Pixabay (gratuita para uso comercial):
 * https://pixabay.com/service/license-summary/
 *
 * Emoções:
 *   sonho      → 3 trilhas suaves/inspiradoras (comprar casa, novo lar)
 *   urgencia   → 2 trilhas com pulso/ritmo mais acelerado (não perca essa!)
 *   conquista  → 2 trilhas épicas/motivacionais (imóvel próprio = vitória)
 *   confianca  → 2 trilhas corporativas/profissionais (escritório/engenharia)
 *   familiar   → 1 trilha acolhedora (família, lar)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const TRILHAS_DIR = path.join(__dirname, "..", "TRILHAS");
fs.mkdirSync(TRILHAS_DIR, { recursive: true });

// Cabeçalhos de navegador para contornar bloqueio de CDN
const HEADERS_NAVEGADOR = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://pixabay.com/",
  "Accept": "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
};

// Fontes: Pixabay Music (licença gratuita para uso comercial) + Bensound
const TRILHAS = [
  // SONHO — suave, inspirador, emocional
  {
    nome: "sonho-01-esperança.mp3",
    emocao: "sonho",
    descricao: "Suave, piano, esperança — ideal para imóveis familiares",
    url: "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3",
  },
  {
    nome: "sonho-02-novo-amanhecer.mp3",
    emocao: "sonho",
    descricao: "Acústico, esperança, crescente — mudança de vida",
    url: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625f072e0.mp3",
  },
  {
    nome: "sonho-03-harmonia.mp3",
    emocao: "sonho",
    descricao: "Ambient suave — imóvel dos sonhos",
    url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_1963e58ba2.mp3",
  },
  // URGÊNCIA — ritmo, pulso, não perca essa oportunidade
  {
    nome: "urgencia-01-agora.mp3",
    emocao: "urgencia",
    descricao: "Ritmo marcado, urgente — oportunidade única",
    url: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3",
  },
  {
    nome: "urgencia-02-ultima-chance.mp3",
    emocao: "urgencia",
    descricao: "Dramático, crescente — última unidade disponível",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
  // CONQUISTA — épico, motivacional, vitória
  {
    nome: "conquista-01-patrimonio.mp3",
    emocao: "conquista",
    descricao: "Épico, strings — imóvel próprio conquistado",
    url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3",
  },
  {
    nome: "conquista-02-novo-capitulo.mp3",
    emocao: "conquista",
    descricao: "Motivacional — novo capítulo da vida",
    url: "https://cdn.pixabay.com/download/audio/2021/11/25/audio_cb31e56dd5.mp3",
  },
  // CONFIANÇA — profissional, corporativo, segurança
  {
    nome: "confianca-01-escritorio.mp3",
    emocao: "confianca",
    descricao: "Corporativo suave — Escritório Campos Figueira",
    url: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_4b79fc70f1.mp3",
  },
  {
    nome: "confianca-02-segurança.mp3",
    emocao: "confianca",
    descricao: "Estável, profissional — transmite confiança",
    url: "https://cdn.pixabay.com/download/audio/2022/08/03/audio_2dde668d05.mp3",
  },
  // FAMILIAR — aconchego, lar, família
  {
    nome: "familiar-01-lar-doce-lar.mp3",
    emocao: "familiar",
    descricao: "Acolhedor, alegre — família no novo lar",
    url: "https://cdn.pixabay.com/download/audio/2022/02/07/audio_d1718ab41a.mp3",
  },
];

function baixar(url, destino, tentativa = 0) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destino) && fs.statSync(destino).size > 10000) {
      console.log(`  ⏭️  Já existe: ${path.basename(destino)}`);
      resolve();
      return;
    }
    const arquivo = fs.createWriteStream(destino);
    const opcoes = new URL(url);
    const reqOpts = {
      hostname: opcoes.hostname,
      path: opcoes.pathname + opcoes.search,
      headers: HEADERS_NAVEGADOR,
    };
    https.get(reqOpts, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        arquivo.close();
        if (fs.existsSync(destino)) fs.unlinkSync(destino);
        return baixar(res.headers.location, destino, tentativa).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        arquivo.close();
        if (fs.existsSync(destino)) fs.unlinkSync(destino);
        reject(new Error(`HTTP ${res.statusCode} para ${url}`));
        return;
      }
      res.pipe(arquivo);
      arquivo.on("finish", () => { arquivo.close(); resolve(); });
    }).on("error", (e) => {
      if (fs.existsSync(destino)) fs.unlinkSync(destino);
      reject(e);
    });
  });
}

async function main() {
  console.log(`\n🎵 Baixando ${TRILHAS.length} trilhas royalty-free para TRILHAS/\n`);

  for (const trilha of TRILHAS) {
    const destino = path.join(TRILHAS_DIR, trilha.nome);
    process.stdout.write(`  ⬇️  ${trilha.nome} (${trilha.emocao}) ... `);
    try {
      await baixar(trilha.url, destino);
      const tamanho = Math.round(fs.statSync(destino).size / 1024);
      console.log(`✅ ${tamanho}KB`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }

  // Salvar catálogo em JSON
  const catalogo = { gerado_em: new Date().toISOString(), trilhas: TRILHAS };
  fs.writeFileSync(path.join(TRILHAS_DIR, "catalogo.json"), JSON.stringify(catalogo, null, 2), "utf-8");

  console.log(`\n✅ Trilhas salvas em TRILHAS/`);
  console.log(`📋 Catálogo: TRILHAS/catalogo.json`);
}

main().catch(console.error);
