/**
 * alertar.js — Notificações push para o celular via ntfy.sh
 *
 * Sem conta, sem configuração de servidor. O proprietário instala o app ntfy
 * no celular e assina o canal: escritorio-cf-alertas
 *
 * App: https://ntfy.sh (iOS e Android, gratuito)
 * Canal: https://ntfy.sh/escritorio-cf-alertas
 */

const https = require("https");

const CANAL = process.env.NTFY_CANAL || "escritorio-cf-alertas";
const NTFY_HOST = "ntfy.sh";

function post(path, corpo, headers = {}) {
  return new Promise((resolve) => {
    const data = Buffer.from(JSON.stringify(corpo), "utf-8");
    const req = https.request(
      {
        hostname: NTFY_HOST,
        path,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": data.length, ...headers },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => resolve({ ok: res.statusCode < 300, status: res.statusCode }));
      }
    );
    req.on("error", (e) => {
      console.warn("⚠️  Alerta não enviado (sem internet ou ntfy offline):", e.message);
      resolve({ ok: false, error: e.message });
    });
    req.write(data);
    req.end();
  });
}

/**
 * Alerta de FALHA — prioridade alta, toca o celular mesmo no silencioso.
 * Chame quando algum canal falhar na publicação.
 */
async function alertarFalha(codigo, canaisComErro, mensagemErro) {
  const titulo = `❌ Falha ao publicar CF-${codigo}`;
  const corpo = `Canais com erro: ${canaisComErro.join(", ")}\n${mensagemErro || ""}`;
  console.log(`📲 Enviando alerta de falha: ${titulo}`);
  return post(`/${CANAL}`, {
    topic: CANAL,
    title: titulo,
    message: corpo,
    priority: 5,
    tags: ["warning", "robot"],
    actions: [{ action: "view", label: "Ver no GitHub", url: "https://github.com/escritoriocamposfigueira-commits/dashboard/actions" }],
  });
}

/**
 * Alerta de TOKEN EXPIRANDO — prioridade alta, enviado 7 dias antes.
 */
async function alertarTokenExpirando(diasRestantes) {
  const titulo = `🔑 Token Meta expira em ${diasRestantes} dias`;
  const corpo = `Siga o guia TROCA-DE-TOKEN.md ANTES de trocar a senha do Facebook.\nVeja o guia completo no repositório.`;
  console.log(`📲 Enviando alerta de token: ${titulo}`);
  return post(`/${CANAL}`, {
    topic: CANAL,
    title: titulo,
    message: corpo,
    priority: 4,
    tags: ["warning", "key"],
  });
}

/**
 * Alerta de TOKEN INVÁLIDO — crítico, publicações pararam.
 */
async function alertarTokenInvalido(erro) {
  const titulo = `🚨 TOKEN INVÁLIDO — robô parado!`;
  const corpo = `O robô não consegue publicar. Erro: ${erro}\nSiga o guia TROCA-DE-TOKEN.md agora.`;
  console.log(`📲 Enviando alerta crítico: ${titulo}`);
  return post(`/${CANAL}`, {
    topic: CANAL,
    title: titulo,
    message: corpo,
    priority: 5,
    tags: ["rotating_light", "robot"],
  });
}

/**
 * Resumo diário — o que foi publicado hoje + o que está na fila amanhã.
 */
async function enviarResumoDiario(publicadoHoje, proximoNaFila, indiceAtual, totalFila) {
  const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const progresso = `${indiceAtual}/${totalFila} imóveis publicados`;

  const publicados = publicadoHoje.length > 0
    ? publicadoHoje.map((p) => `• CF-${p.codigo}: FB ${p.fb_feed?.startsWith("✅") ? "✅" : "❌"} IG ${p.ig_feed?.startsWith("✅") ? "✅" : "❌"}`).join("\n")
    : "Nenhuma publicação hoje";

  const proximo = proximoNaFila
    ? `🔜 Próximo: CF-${proximoNaFila}`
    : "✅ Fila completa!";

  const titulo = `📊 Resumo ${agora.slice(0, 10)} — ECF`;
  const corpo = `${publicados}\n\n${proximo}\n📈 ${progresso}`;

  console.log(`📲 Enviando resumo diário`);
  return post(`/${CANAL}`, {
    topic: CANAL,
    title: titulo,
    message: corpo,
    priority: 2,
    tags: ["bar_chart"],
  });
}

/**
 * Confirmação de publicação bem-sucedida — prioridade baixa, opcional.
 */
async function confirmarPublicacao(codigo, canaisOk) {
  const titulo = `✅ CF-${codigo} publicado`;
  const corpo = `Canais: ${canaisOk.join(", ")}`;
  console.log(`📲 Enviando confirmação: ${titulo}`);
  return post(`/${CANAL}`, {
    topic: CANAL,
    title: titulo,
    message: corpo,
    priority: 2,
    tags: ["white_check_mark"],
  });
}

module.exports = {
  alertarFalha,
  alertarTokenExpirando,
  alertarTokenInvalido,
  enviarResumoDiario,
  confirmarPublicacao,
};
