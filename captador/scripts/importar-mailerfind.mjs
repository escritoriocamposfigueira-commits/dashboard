import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { linhaEhEmpresa, normalizarEmail, normalizarTelefoneBR } from "../supabase/functions/_shared/core.mjs";

function parseCsv(texto) {
  const linhas = []; let atual = []; let campo = ""; let aspas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (c === '"' && aspas && texto[i + 1] === '"') { campo += '"'; i += 1; }
    else if (c === '"') aspas = !aspas;
    else if (c === ',' && !aspas) { atual.push(campo); campo = ""; }
    else if ((c === '\n' || c === '\r') && !aspas) {
      if (c === '\r' && texto[i + 1] === '\n') i += 1;
      atual.push(campo); campo = "";
      if (atual.some((x) => x.trim())) linhas.push(atual);
      atual = [];
    } else campo += c;
  }
  if (campo || atual.length) { atual.push(campo); linhas.push(atual); }
  if (linhas.length < 2) return [];
  const cab = linhas[0].map((x) => x.trim().toLowerCase().replace(/\s+/g, "_"));
  return linhas.slice(1).map((linha) => Object.fromEntries(cab.map((c, i) => [c, (linha[i] || "").trim()])));
}

export function prepararImportacao(texto, operacao, limite = 30) {
  if (!['imobiliaria', 'engenharia'].includes(operacao)) throw new Error("CSV B2B permitido apenas para imobiliária ou engenharia.");
  const vistos = new Set(); const aceitos = []; const recusados = [];
  for (const row of parseCsv(texto)) {
    if (!linhaEhEmpresa(row)) { recusados.push({ row, motivo: "linha parece pessoa física ou não comprova empresa" }); continue; }
    const telefone = normalizarTelefoneBR(row.telefone || row.phone);
    const email = normalizarEmail(row.email);
    const chave = telefone || email;
    if (!chave || vistos.has(chave)) { recusados.push({ row, motivo: "contato inválido ou duplicado" }); continue; }
    vistos.add(chave);
    aceitos.push({
      operacao, fonte: "mailerfind_b2b", base_legal: "legitimo_interesse_b2b",
      nome: row.contato || row.nome || row.name || row.empresa,
      empresa: row.empresa || row.company || row.nome_empresa,
      categoria: row.categoria || row.category || "empresa",
      municipio: row.municipio || row.cidade || row.city || null,
      bairro: row.bairro || null,
      interesse: row.interesse || (operacao === "engenharia" ? "parceria ou serviço de engenharia" : "parceria imobiliária B2B"),
      telefone: telefone || null, email: email || null,
      canal_autorizado: [], consentimento: false,
      metadata: { origem_csv: true, site: row.site || row.website || null },
    });
    if (aceitos.length >= limite) break;
  }
  return { aceitos, recusados, limite };
}

async function main() {
  const [arquivo, operacao = "imobiliaria"] = process.argv.slice(2);
  if (!arquivo) throw new Error("Uso: node importar-mailerfind.mjs arquivo.csv imobiliaria|engenharia [--enviar]");
  const resultado = prepararImportacao(fs.readFileSync(arquivo, "utf8"), operacao, 30);
  console.log(`Aceitos: ${resultado.aceitos.length} | Recusados: ${resultado.recusados.length} | Limite diário: 30`);
  if (!process.argv.includes("--enviar")) {
    console.log("Modo seguro: nada enviado. Use --enviar após revisar as empresas.");
    return;
  }
  const api = process.env.CAPTADOR_API_URL;
  const token = process.env.CAPTADOR_INTERNAL_TOKEN;
  if (!api || !token) throw new Error("CAPTADOR_API_URL e CAPTADOR_INTERNAL_TOKEN são obrigatórios.");
  for (const lead of resultado.aceitos) {
    const resposta = await fetch(`${api}/admin/leads`, {
      method: "POST", headers: { "content-type": "application/json", "x-internal-token": token }, body: JSON.stringify(lead),
    });
    if (!resposta.ok && resposta.status !== 409) throw new Error(`Falha HTTP ${resposta.status} ao importar ${lead.empresa}`);
  }
  console.log(`${resultado.aceitos.length} empresas enviadas para a etapa validar.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
