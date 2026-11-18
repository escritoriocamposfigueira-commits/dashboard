"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");

const ROOT = path.resolve(__dirname, "..");
const PROFILE_DIR = process.env.WHATSAPP_WEB_PROFILE || path.join(ROOT, "controle", "whatsapp-status-web-profile");
const STATE_PATH = process.env.WHATSAPP_WEB_STATE || path.join(ROOT, "controle", "whatsapp-status-web-state.json");
const LOCK_PATH = path.join(ROOT, "controle", "whatsapp-status-web.lock");
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOT_DIR = path.join(ROOT, "output", "whatsapp-status");
const PUBLICATION_STATE_PATH = process.env.WHATSAPP_PUBLICATION_STATE
  ? path.resolve(process.env.WHATSAPP_PUBLICATION_STATE)
  : path.join(ROOT, "controle", "estado-publicacao.json");
const DELIVERY_CONTACTS = String(process.env.WHATSAPP_DELIVERY_CONTACTS || "Renan Silva|Henrique Figueira")
  .split("|")
  .map((value) => value.trim())
  .filter(Boolean);

function readJson(file) {
  const target = path.isAbsolute(file) ? file : path.join(ROOT, file);
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/-(VENDA|LOCACAO|LOCAÇÃO)$/i, "")
    .replace(/^CF\s*-?\s*/, "")
    .replace(/[^A-Z0-9]/g, "");
}

function purposeFromCaption(text) {
  return /LOCA[ÇC][ÃA]O|PARA LOCA[ÇC][ÃA]O|R\$\s*[\d.]+\/M[ÊE]S/i.test(text || "") ? "locacao" : "venda";
}

function publicReference(code) {
  const normalized = normalizeCode(code);
  return /^[0-9]+[A-Z]?$/.test(normalized) ? `CF-${normalized}` : code;
}

function compactCaption(input, code) {
  const ignored = /instagram\.com|facebook\.com|youtube\.com|tiktok\.com|wa\.me|CRECI|Seg a Sex|escritoriocamposfigueira\.com\.br/i;
  const lines = String(input || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("🔗") && !ignored.test(line));
  const unique = [...new Set(lines)].slice(0, 6);
  const cta = `\n\n📲 Fale com a Campos Figueira: (11) 2378-5643\nInforme: ${publicReference(code)}`;
  let body = unique.join("\n");
  const maxBody = 700 - [...cta].length;
  if ([...body].length > maxBody) body = [...body].slice(0, maxBody - 1).join("") + "…";
  return `${body}${cta}`.trim();
}

function findCaption(captions, aliases, video) {
  const target = normalizeCode(video.codigo);
  const matches = captions.filter((item) => {
    const raw = String(item.codigo_imovel || "").replace(/-(VENDA|LOCACAO)$/i, "");
    return normalizeCode(aliases[raw] || raw) === target;
  });
  if (matches.length === 1) return matches[0].caption;
  return matches.find((item) => purposeFromCaption(item.caption) === video.finalidade)?.caption || "";
}

function loadSyncState() {
  if (!fs.existsSync(STATE_PATH)) {
    return { created: true, state: { activated_at: new Date().toISOString(), posted: {} } };
  }
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  state.posted ||= {};
  return { created: false, state };
}

function saveSyncState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  const temp = `${STATE_PATH}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, STATE_PATH);
}

function confirmedVideoPublications(snapshot) {
  const publications = [...(snapshot.publicados || []), snapshot.retryPublicacao?.reg, snapshot.retryLocacao?.reg];
  const confirmed = new Map();
  for (const publication of publications) {
    if (!publication?.codigo || !Number.isFinite(Date.parse(publication.data))) continue;
    const hasVideo = ["fb_story", "ig_story", "fb_reel", "ig_reel"].some((channel) =>
      String(publication[channel] || "").startsWith("✅") && !/\(imagem\)/i.test(publication[channel]));
    if (!hasVideo) continue;
    const key = `${publication.data}|${String(publication.codigo).toUpperCase()}`;
    confirmed.set(key, publication);
  }
  return confirmed;
}

function resolvePending(state) {
  const publications = confirmedVideoPublications(readJson(PUBLICATION_STATE_PATH));
  const videos = readJson(path.join("src", "content", "videos-imoveis.json"));
  const captions = readJson(path.join("src", "content", "captions-imoveis.json"));
  const captures = readJson(path.join("src", "content", "captacao.json"));
  const aliases = readJson(path.join("src", "content", "aliases-imoveis.json"));
  const activatedAt = Date.parse(state.activated_at);
  const pending = [];

  for (const [key, publication] of publications) {
    const publishedAt = Date.parse(publication.data);
    if (publishedAt <= activatedAt) continue;
    const progress = state.posted[key];
    const delivered = DELIVERY_CONTACTS.every((contact) => progress?.contacts?.[contact]);
    if (progress?.message_id && delivered) continue;

    const capture = captures.find((item) => item.id === publication.codigo && item.arquivo_video);
    if (capture) {
      pending.push({ key, code: publication.codigo, date: publication.data, video: path.join(ROOT, capture.arquivo_video), caption: compactCaption(capture.caption, publication.codigo) });
      continue;
    }
    if (String(publication.codigo).startsWith("CAPT-")) continue;

    const purpose = /-LOCACAO$/i.test(publication.codigo) ? "locacao" : /-VENDA$/i.test(publication.codigo) ? "venda" : "";
    const canonical = aliases[publication.codigo] || publication.codigo;
    const matches = videos.filter((item) => normalizeCode(item.codigo) === normalizeCode(canonical) && (!purpose || item.finalidade === purpose));
    if (matches.length !== 1) throw new Error(`Mapeamento ambíguo ou ausente para ${publication.codigo}`);
    const video = matches[0];
    const caption = findCaption(captions, aliases, video);
    if (!caption) throw new Error(`Legenda ausente para ${video.codigo}/${video.finalidade}`);
    pending.push({ key, code: publication.codigo, date: publication.data, video: path.join(ROOT, video.arquivo_video), caption: compactCaption(caption, video.codigo) });
  }
  return pending.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

function validateVideo(video) {
  if (!video || path.extname(video).toLowerCase() !== ".mp4") throw new Error(`Vídeo MP4 inválido: ${video}`);
  const stat = fs.statSync(video);
  if (!stat.isFile() || stat.size < 1024 * 1024) throw new Error(`Vídeo ausente ou pequeno demais: ${video}`);
}

async function launch(headless) {
  if (!fs.existsSync(CHROME)) throw new Error(`Google Chrome não encontrado: ${CHROME}`);
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  return chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: CHROME,
    headless,
    viewport: { width: 1365, height: 900 },
    args: ["--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"],
  });
}

async function getPage(context) {
  const page = context.pages()[0] || await context.newPage();
  await page.goto("https://web.whatsapp.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
  return page;
}

async function waitLoggedIn(page, timeout = 60000) {
  const status = page.getByRole("button", { name: "Status", exact: true });
  try {
    await status.waitFor({ state: "visible", timeout });
  } catch {
    throw new Error("WhatsApp Web não está vinculado neste perfil. Execute o pareamento oficial.");
  }
}

async function pair() {
  const context = await launch(false);
  try {
    const page = await getPage(context);
    const status = page.getByRole("button", { name: "Status", exact: true });
    if (await status.isVisible()) {
      console.log("WhatsApp Web oficial já está vinculado.");
      return;
    }
    console.log("Escaneie o QR na janela oficial do Chrome. Aguardando até 5 minutos...");
    await status.waitFor({ state: "visible", timeout: 300000 });
    console.log("WhatsApp Web oficial vinculado com sucesso.");
  } finally {
    await context.close();
  }
}

async function publishOnPage(page, item, dryRun = false) {
  validateVideo(item.video);
  if (dryRun) {
    console.log(`DRY-RUN: ${item.code} -> ${item.video}`);
    return "dry-run";
  }
  await page.getByRole("button", { name: "Status", exact: true }).click();
  await page.getByRole("button", { name: "Foto e vídeo", exact: true }).waitFor({ state: "visible", timeout: 30000 });
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 15000 });
  await page.getByRole("button", { name: "Foto e vídeo", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(item.video);
  const caption = page.getByRole("textbox", { name: "Adicione uma legenda" });
  await caption.waitFor({ state: "visible", timeout: 30000 });
  await caption.fill(item.caption);
  const send = page.getByRole("button", { name: /Enviar 1 item selecionado/i });
  await send.click();
  await send.waitFor({ state: "hidden", timeout: 120000 });
  await page.getByRole("button", { name: /Meu status.*Hoje às/i }).waitFor({ state: "visible", timeout: 120000 });
  console.log(`Publicado no Status pessoal: ${item.code}`);
  return `web-${Date.now()}`;
}

async function openContact(page, contact) {
  await page.getByRole("button", { name: "Conversas", exact: true }).click();
  const search = page.getByRole("textbox", { name: "Pesquisar ou começar uma nova conversa" });
  await search.waitFor({ state: "visible", timeout: 30000 });
  await search.fill(contact);
  const matches = page.getByText(contact, { exact: true });
  await matches.first().waitFor({ state: "visible", timeout: 30000 });
  const count = await matches.count();
  if (count !== 1) throw new Error(`Contato ausente ou ambiguo no WhatsApp: ${contact} (${count} resultados)`);
  await matches.first().click();
  await page.getByRole("textbox", { name: `Digite uma mensagem para ${contact}`, exact: true }).waitFor({ state: "visible", timeout: 30000 });
}

async function sendCopyToContact(page, item, contact, dryRun = false) {
  if (dryRun) {
    console.log(`DRY-RUN: copia de ${item.code} -> ${contact}`);
    return;
  }
  await openContact(page, contact);
  await page.getByRole("button", { name: "Anexar", exact: true }).click();
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 15000 });
  await page.getByRole("menuitem", { name: "Fotos e vídeos", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(item.video);
  const caption = page.getByRole("textbox", { name: /Adicione uma legenda|Digite uma mensagem/i }).last();
  await caption.waitFor({ state: "visible", timeout: 30000 });
  await caption.fill(item.caption);
  const send = page.getByRole("button", { name: /Enviar 1 item selecionado/i });
  await send.click();
  await send.waitFor({ state: "hidden", timeout: 120000 });
  console.log(`Copia enviada: ${item.code} -> ${contact}`);
}

async function withLock(callback) {
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  let handle;
  try {
    handle = fs.openSync(LOCK_PATH, "wx");
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("Outra sincronização do Status já está em andamento.");
    throw error;
  }
  try {
    return await callback();
  } finally {
    fs.closeSync(handle);
    fs.rmSync(LOCK_PATH, { force: true });
  }
}

async function runPost(args) {
  const videoIndex = args.indexOf("--video");
  const captionIndex = args.indexOf("--caption");
  const video = videoIndex >= 0 ? path.resolve(ROOT, args[videoIndex + 1]) : "";
  const caption = captionIndex >= 0 ? args[captionIndex + 1] : "";
  const dryRun = args.includes("--dry-run");
  const copiesOnly = args.includes("--copies-only");
  const statusOnly = args.includes("--status-only");
  validateVideo(video);
  if (dryRun) {
    const item = { code: "TESTE", video, caption };
    if (!copiesOnly) await publishOnPage(null, item, true);
    if (!statusOnly) for (const contact of DELIVERY_CONTACTS) await sendCopyToContact(null, item, contact, true);
    return;
  }
  await withLock(async () => {
    const context = await launch(args.includes("--visible") ? false : true);
    try {
      const page = await getPage(context);
      await waitLoggedIn(page);
      const item = { code: publicReference(path.basename(video).split("-")[1]), video, caption };
      if (!copiesOnly) await publishOnPage(page, item);
      if (!statusOnly) for (const contact of DELIVERY_CONTACTS) await sendCopyToContact(page, item, contact);
    } catch (error) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      const page = context.pages()[0];
      if (page) await page.screenshot({ path: path.join(SCREENSHOT_DIR, `erro-${Date.now()}.png`), fullPage: true }).catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  });
}

async function runSync(args) {
  const dryRun = args.includes("--dry-run");
  const { created, state } = loadSyncState();
  if (created) {
    if (!dryRun) saveSyncState(state);
    console.log("Fila inicializada; publicações antigas não serão repetidas.");
    return;
  }
  const pending = resolvePending(state);
  if (!pending.length) {
    console.log("Nenhum Status novo para publicar.");
    return;
  }
  if (dryRun) {
    for (const item of pending) await publishOnPage(null, item, true);
    return;
  }
  await withLock(async () => {
    const context = await launch(true);
    try {
      const page = await getPage(context);
      await waitLoggedIn(page);
      for (const item of pending) {
        const progress = state.posted[item.key] || { codigo: item.code, data: item.date, video: item.video, contacts: {} };
        progress.contacts ||= {};
        if (!progress.message_id) {
          progress.message_id = await publishOnPage(page, item);
          state.posted[item.key] = progress;
          saveSyncState(state);
        }
        for (const contact of DELIVERY_CONTACTS) {
          if (progress.contacts[contact]) continue;
          await sendCopyToContact(page, item, contact);
          progress.contacts[contact] = { sent_at: new Date().toISOString() };
          state.posted[item.key] = progress;
          saveSyncState(state);
        }
      }
    } catch (error) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      const page = context.pages()[0];
      if (page) await page.screenshot({ path: path.join(SCREENSHOT_DIR, `erro-${Date.now()}.png`), fullPage: true }).catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  });
}

async function audit() {
  const videos = readJson(path.join("src", "content", "videos-imoveis.json"));
  const captions = readJson(path.join("src", "content", "captions-imoveis.json"));
  const aliases = readJson(path.join("src", "content", "aliases-imoveis.json"));
  const captures = readJson(path.join("src", "content", "captacao.json")).filter((item) => item.arquivo_video);
  const errors = [];
  for (const video of videos) {
    try { validateVideo(path.join(ROOT, video.arquivo_video)); } catch (error) { errors.push(error.message); }
    if (!findCaption(captions, aliases, video)) errors.push(`Legenda ausente: ${video.codigo}/${video.finalidade}`);
  }
  for (const capture of captures) {
    try { validateVideo(path.join(ROOT, capture.arquivo_video)); } catch (error) { errors.push(error.message); }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  if (DELIVERY_CONTACTS.length !== 2) errors.push(`Quantidade inesperada de contatos para copia: ${DELIVERY_CONTACTS.length}`);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`Auditoria aprovada: ${videos.length} imóveis, ${captures.length} vídeos fixos e ${DELIVERY_CONTACTS.length} contatos de entrega.`);
}

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  if (command === "pair") return pair();
  if (command === "post") return runPost(args);
  if (command === "sync") return runSync(args);
  if (command === "audit") return audit();
  throw new Error("Use: pair | post | sync | audit");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`ERRO: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { confirmedVideoPublications };
