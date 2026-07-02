/**
 * trocar-token.js — Gera Page Token PERMANENTE para o Escritório Campos Figueira
 *
 * Como usar (uma vez só):
 *   node trocar-token.js APP_ID APP_SECRET TOKEN_CURTO
 *
 * Onde encontrar:
 *   APP_ID e APP_SECRET → developers.facebook.com → POST AUTOMATICO CLAUDE → Configurações → Básico
 *   TOKEN_CURTO         → Graph API Explorer → gerar com as permissões corretas (dura 1h)
 *
 * O script faz 3 passos automaticamente:
 *   1. Token curto → Token longo (60 dias) via oauth/access_token
 *   2. Token longo → Page Token PERMANENTE via /me/accounts
 *   3. Verifica expiração com /debug_token → confirma "não expira"
 *   4. Salva no .env.local
 *   5. Mostra o valor final para colar no GitHub Secret
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const [, , APP_ID, APP_SECRET, SHORT_TOKEN] = process.argv;

if (!APP_ID || !APP_SECRET || !SHORT_TOKEN) {
  console.log("\nUso: node trocar-token.js APP_ID APP_SECRET TOKEN_CURTO\n");
  console.log("Onde encontrar:");
  console.log("  APP_ID / APP_SECRET → developers.facebook.com → Configurações → Básico");
  console.log("  TOKEN_CURTO         → developers.facebook.com/tools/explorer\n");
  process.exit(1);
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); }
        catch { reject(new Error("Resposta inválida: " + d.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  GERAÇÃO DE TOKEN PERMANENTE — Escritório Campos Figueira");
  console.log("═══════════════════════════════════════════════════════\n");

  // ── Passo 1: Token curto → Token longo (60 dias) ─────────────────────────
  console.log("▸ Passo 1: Trocando token curto por token longo (60 dias)...");
  const longRes = await get(
    `https://graph.facebook.com/v22.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${APP_ID}` +
    `&client_secret=${APP_SECRET}` +
    `&fb_exchange_token=${encodeURIComponent(SHORT_TOKEN)}`
  );
  if (longRes.error) {
    console.error("  ❌ Erro:", longRes.error.message);
    console.error("  Verifique o APP_ID, APP_SECRET e se o token curto ainda é válido (dura 1h).");
    process.exit(1);
  }
  const longToken = longRes.access_token;
  const expiresIn = longRes.expires_in ? `${Math.round(longRes.expires_in / 86400)} dias` : "60 dias";
  console.log(`  ✅ Token longo obtido (expira em ${expiresIn})`);

  // ── Passo 2: Token longo → Page Token PERMANENTE ──────────────────────────
  console.log("\n▸ Passo 2: Buscando Page Token permanente...");
  const pagesRes = await get(
    `https://graph.facebook.com/v22.0/me/accounts?access_token=${encodeURIComponent(longToken)}`
  );
  if (!pagesRes.data || pagesRes.data.length === 0) {
    console.error("  ❌ Nenhuma página encontrada. Verifique se o token tem pages_show_list e pages_manage_posts.");
    process.exit(1);
  }

  const ecf =
    pagesRes.data.find((p) => /campos.figueira|escritorio/i.test(p.name)) ||
    pagesRes.data[0];

  const pageToken = ecf.access_token;
  console.log(`  ✅ Página: "${ecf.name}" (ID: ${ecf.id})`);

  // ── Passo 3: Verificar expiração com debug_token ───────────────────────────
  console.log("\n▸ Passo 3: Verificando validade do Page Token...");
  const debugRes = await get(
    `https://graph.facebook.com/v22.0/debug_token` +
    `?input_token=${encodeURIComponent(pageToken)}` +
    `&access_token=${APP_ID}|${APP_SECRET}`
  );

  if (debugRes.error || !debugRes.data) {
    console.warn("  ⚠️  Não foi possível verificar via debug_token — salvando assim mesmo.");
  } else {
    const { is_valid, expires_at, scopes } = debugRes.data;
    const expiraEm = expires_at === 0 ? "NUNCA (permanente ✅)" : `em ${new Date(expires_at * 1000).toLocaleDateString("pt-BR")}`;
    console.log(`  ✅ Token válido: ${is_valid ? "Sim" : "NÃO"}`);
    console.log(`  ✅ Expira: ${expiraEm}`);
    if (scopes) console.log(`  ✅ Permissões: ${scopes.join(", ")}`);

    if (!is_valid) {
      console.error("\n  ❌ Token inválido! Gere um novo token curto no Graph Explorer e tente novamente.");
      process.exit(1);
    }
    if (expires_at !== 0) {
      console.warn("\n  ⚠️  Page Token com expiração — isso é incomum. Verifique se usou /me/accounts com token LONGO.");
    }
  }

  // ── Passo 4: Salvar no .env.local ─────────────────────────────────────────
  console.log("\n▸ Passo 4: Salvando no .env.local...");
  const envContent =
    `# Meta API — Escritório Campos Figueira\n` +
    `# PAGE TOKEN PERMANENTE — gerado em ${new Date().toLocaleDateString("pt-BR")}\n` +
    `META_PAGE_TOKEN=${pageToken}\n\n` +
    `# USER TOKEN (para Grupos do Facebook — gerar separado com publish_to_groups)\n` +
    `# META_USER_TOKEN=\n`;
  fs.writeFileSync(path.join(__dirname, ".env.local"), envContent, "utf-8");
  console.log("  ✅ Salvo em .env.local");

  // ── Resultado final ────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  TOKEN PERMANENTE GERADO COM SUCESSO");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n  Cole o valor abaixo no GitHub Secret META_PAGE_TOKEN:\n");
  console.log(`  ${pageToken}`);
  console.log("\n  Caminho do secret:");
  console.log("  github.com/escritoriocamposfigueira-commits/dashboard");
  console.log("  → Settings → Secrets and variables → Actions → META_PAGE_TOKEN → Update\n");
}

main().catch((e) => {
  console.error("\n❌ Erro fatal:", e.message);
  process.exit(1);
});
