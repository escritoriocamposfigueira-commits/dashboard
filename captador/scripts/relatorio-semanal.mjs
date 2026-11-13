import fs from "node:fs";
import path from "node:path";

const api = process.env.CAPTADOR_API_URL;
const token = process.env.GITHUB_OIDC_TOKEN || process.env.CAPTADOR_INTERNAL_TOKEN;
if (!api || !token) throw new Error("CAPTADOR_API_URL e token de execução são obrigatórios.");
const headers = process.env.GITHUB_OIDC_TOKEN
  ? { authorization: `Bearer ${token}` }
  : { "x-internal-token": token };
const resposta = await fetch(`${api}/report/weekly`, { headers });
const dados = await resposta.json();
if (!resposta.ok || !dados.ok) throw new Error(dados.erro || `Relatório HTTP ${resposta.status}`);
const destino = process.argv[2];
if (destino) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, dados.markdown, "utf8");
  console.log(`Relatório salvo em ${destino}`);
} else console.log(dados.markdown);
