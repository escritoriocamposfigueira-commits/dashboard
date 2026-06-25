/**
 * trocar-token.js — Gera token permanente para o Escritório Campos Figueira
 *
 * Como usar (uma vez só):
 *   node trocar-token.js APP_ID APP_SECRET TOKEN_CURTO
 *
 * Onde encontrar:
 *   APP_ID e APP_SECRET → developers.facebook.com → POST AUTOMATICO CLAUDE → Configurações → Básico
 *   TOKEN_CURTO → Graph API Explorer (o que você gerou agora)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const [, , APP_ID, APP_SECRET, SHORT_TOKEN] = process.argv;

if (!APP_ID || !APP_SECRET || !SHORT_TOKEN) {
  console.log("Uso: node trocar-token.js APP_ID APP_SECRET TOKEN_CURTO");
  process.exit(1);
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

async function main() {
  console.log("\n1. Trocando por token longo (60 dias)...");
  const longRes = await get(
    `https://graph.facebook.com/v22.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${APP_ID}` +
    `&client_secret=${APP_SECRET}` +
    `&fb_exchange_token=${SHORT_TOKEN}`
  );

  if (longRes.error) {
    console.error("Erro:", longRes.error.message);
    process.exit(1);
  }

  const longToken = longRes.access_token;
  console.log("   Token longo obtido.");

  console.log("\n2. Buscando Page Token permanente da ECF...");
  const pagesRes = await get(
    `https://graph.facebook.com/v22.0/me/accounts?access_token=${longToken}`
  );

  if (!pagesRes.data || pagesRes.data.length === 0) {
    console.error("Nenhuma página encontrada. Verifique as permissões.");
    process.exit(1);
  }

  const ecf = pagesRes.data.find((p) =>
    p.name.toLowerCase().includes("campos figueira") ||
    p.name.toLowerCase().includes("escritorio")
  ) || pagesRes.data[0];

  console.log(`   Página encontrada: ${ecf.name}`);
  console.log(`   Page Token (não expira): obtido`);

  const pageToken = ecf.access_token;

  console.log("\n3. Salvando no .env.local...");
  const envPath = path.join(__dirname, ".env.local");
  const envContent =
    `# Meta API — Escritório Campos Figueira\n` +
    `# PAGE TOKEN PERMANENTE — gerado em ${new Date().toLocaleDateString("pt-BR")}\n` +
    `META_PAGE_TOKEN=${pageToken}\n\n` +
    `# USER TOKEN (para Grupos do Facebook — gerar separado com publish_to_groups)\n` +
    `# META_USER_TOKEN=\n`;

  fs.writeFileSync(envPath, envContent, "utf-8");
  console.log("   Salvo em .env.local");

  console.log("\n✅ Pronto! Token permanente configurado.");
  console.log("   O agendador vai funcionar sem precisar renovar token.");
  console.log("\n   Próximo passo: reinicie o servidor (npm run dev) e acesse /agendador");
}

main().catch(console.error);
