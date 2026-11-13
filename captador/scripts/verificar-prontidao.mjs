import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const obrigatorios = [
  "captador/supabase/migrations/202611130001_captador.sql",
  "captador/supabase/functions/captador-api/index.ts",
  "captador/scripts/processar-comentarios-meta.js",
  ".github/workflows/captador-meta.yml",
  "docs/captador/index.html",
  "docs/captador/crm.html",
  "docs/captador/descadastro.html",
];
const ausentes = obrigatorios.filter((item) => !fs.existsSync(path.join(raiz, item)));
if (ausentes.length) { console.error(`Arquivos ausentes: ${ausentes.join(", ")}`); process.exit(1); }
const config = fs.readFileSync(path.join(raiz, "docs/captador/config.js"), "utf8");
const configurado = !config.includes("SEU-PROJETO") && !config.includes("CONFIRMAR_NUMERO");
console.log(`Estrutura: OK | API externa: ${configurado ? "CONFIGURADA" : "PENDENTE DE CREDENCIAIS/URL"}`);
if (process.argv.includes("--strict") && !configurado) process.exit(2);
