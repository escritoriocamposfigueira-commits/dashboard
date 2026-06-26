/**
 * agendar-aprovados.js — Escritório Campos Figueira
 *
 * Lê o controle JSON gerado pelo inventariar-imagens.js,
 * filtra os itens com validacao=VALIDADO e status=AGUARDANDO_APROVACAO,
 * e agenda no Facebook + Instagram via Meta Graph API.
 *
 * Por padrão roda em DRY-RUN (não publica nada).
 * Para publicar de verdade: adicionar flag --aprovar
 *
 * Uso:
 *   node src/scripts/agendar-aprovados.js              ← DRY-RUN (mostra o que faria)
 *   node src/scripts/agendar-aprovados.js --aprovar    ← PUBLICA DE VERDADE
 *   node src/scripts/agendar-aprovados.js --ref 493    ← Apenas o imóvel REF 493
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const BASE = "https://graph.facebook.com/v22.0";
const PAGE_ID = "512040582222121";
const IG_USER_ID = "17841461388445580";

const CONTROLE_JSON = path.join(__dirname, "../../controle/controle_publicacoes_imobiliarias.json");
const LOG_PATH = path.join(__dirname, "../../logs/publicacoes.log");

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--aprovar");
const FILTRO_REF = (() => {
  const idx = args.indexOf("--ref");
  return idx >= 0 ? args[idx + 1] : null;
})();

// Carregar .env.local manualmente
function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(__dirname, "../../", name);
    if (fs.existsSync(p)) {
      fs.readFileSync(p, "utf-8")
        .split("\n")
        .forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return;
          const [k, ...rest] = trimmed.split("=");
          if (k && !process.env[k.trim()]) {
            process.env[k.trim()] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
          }
        });
      break;
    }
  }
}

function apiPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(`${BASE}/${endpoint}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ error: { message: raw } }); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  if (!DRY_RUN) {
    const dir = path.dirname(LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_PATH, line + "\n", "utf-8");
  }
}

function atualizarControle(jsonData, ref, updates) {
  const item = jsonData.publicacoes.find((p) => p.codigo_imovel === ref);
  if (item) Object.assign(item, updates);
  fs.writeFileSync(CONTROLE_JSON, JSON.stringify(jsonData, null, 2), "utf-8");
}

async function agendarFacebook(token, caption, dataHora) {
  const ts = Math.floor(new Date(dataHora).getTime() / 1000);
  const res = await apiPost(`${PAGE_ID}/feed`, {
    message: caption,
    scheduled_publish_time: ts,
    published: false,
    access_token: token,
  });
  if (res.error) throw new Error(res.error.message);
  return res.id;
}

async function agendarInstagram(token, imageUrl, caption, dataHora) {
  const ts = Math.floor(new Date(dataHora).getTime() / 1000);
  // Criar container
  const container = await apiPost(`${IG_USER_ID}/media`, {
    image_url: imageUrl,
    caption,
    scheduled_publish_time: ts,
    published: false,
    access_token: token,
  });
  if (container.error) throw new Error(container.error.message);
  // Confirmar agendamento
  const pub = await apiPost(`${IG_USER_ID}/media_publish`, {
    creation_id: container.id,
    access_token: token,
  });
  if (pub.error) throw new Error(pub.error.message);
  return pub.id;
}

async function main() {
  loadEnv();

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log(`║  AGENDADOR — ${DRY_RUN ? "DRY-RUN (sem publicar)" : "⚠️  PUBLICAÇÃO REAL ATIVADA"}  ║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  if (!fs.existsSync(CONTROLE_JSON)) {
    console.error("❌ Arquivo de controle não encontrado.");
    console.error("   Execute primeiro: node src/scripts/inventariar-imagens.js");
    process.exit(1);
  }

  const token = process.env.META_PAGE_TOKEN;
  if (!token && !DRY_RUN) {
    console.error("❌ META_PAGE_TOKEN não configurado no .env.local");
    process.exit(1);
  }

  const jsonData = JSON.parse(fs.readFileSync(CONTROLE_JSON, "utf-8"));
  let publicacoes = jsonData.publicacoes.filter(
    (p) => p.validacao === "VALIDADO" && p.status_publicacao === "AGUARDANDO_APROVACAO"
  );

  if (FILTRO_REF) {
    publicacoes = publicacoes.filter((p) => p.codigo_imovel === FILTRO_REF);
  }

  if (publicacoes.length === 0) {
    console.log("Nenhuma publicação validada e pendente encontrada.");
    return;
  }

  console.log(`Publicações a processar: ${publicacoes.length}`);
  if (DRY_RUN) console.log("⚠️  DRY-RUN: apenas simulando, nada será publicado.\n");

  let fbOk = 0, igOk = 0, erros = 0;

  for (const pub of publicacoes) {
    const dataHora = `${pub.data_programada}T${pub.horario_programado}:00-03:00`;
    log(`[${pub.seq}] ${pub.arquivo} → ${pub.data_programada} ${pub.horario_programado}`);

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Agendaria Facebook + Instagram: ${dataHora}`);
      console.log(`  Caption: ${pub.texto_preparado === "SIM (ver calendário JSON)" ? "(do calendário)" : pub.texto_preparado}`);
      continue;
    }

    // Obter caption do calendário
    const calPath = path.join(__dirname, "../../src/content/calendario-julho-2026.json");
    const calPosts = JSON.parse(fs.readFileSync(calPath, "utf-8")).posts;
    const postCal = calPosts.find(
      (p) => p.caption.includes(`REF: ${pub.codigo_imovel}`) || p.caption.includes(`REF:${pub.codigo_imovel}`)
    );
    const caption = postCal?.caption || `Imóvel REF ${pub.codigo_imovel} — Escritório Campos Figueira\n${pub.bairro_cidade}\n\nhttps://www.escritoriocamposfigueira.com.br`;

    // Facebook
    try {
      const fbId = await agendarFacebook(token, caption, dataHora);
      log(`  ✅ Facebook: ${fbId}`);
      fbOk++;
      atualizarControle(jsonData, pub.codigo_imovel, { fb_post_id: fbId });
    } catch (e) {
      log(`  ❌ Facebook: ${e.message}`);
      erros++;
    }

    // Instagram (só se tiver imageUrl pública)
    if (pub.image_url_publica) {
      try {
        const igId = await agendarInstagram(token, pub.image_url_publica, caption, dataHora);
        log(`  ✅ Instagram: ${igId}`);
        igOk++;
        atualizarControle(jsonData, pub.codigo_imovel, { ig_post_id: igId, status_publicacao: "AGENDADO" });
      } catch (e) {
        log(`  ❌ Instagram: ${e.message}`);
      }
    } else {
      log(`  ⚠️  Instagram: sem image_url_publica — adicione o link da imagem hospedada no CSV`);
    }
  }

  console.log("\n─────────────────────────────────────");
  if (DRY_RUN) {
    console.log(`DRY-RUN concluído. ${publicacoes.length} publicações prontas para agendar.`);
    console.log("Para publicar de verdade: node src/scripts/agendar-aprovados.js --aprovar");
  } else {
    console.log(`Facebook: ${fbOk} agendados | Instagram: ${igOk} agendados | Erros: ${erros}`);
    console.log(`Log salvo em: ${LOG_PATH}`);
  }
  console.log("─────────────────────────────────────\n");
}

main().catch(console.error);
