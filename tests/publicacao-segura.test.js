"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  avancarPonteiros,
  comRetryRede,
  concluirVideoInstagram,
  ehErroRedeTransitorio,
  escolherProximo,
  escolherFormatoPrincipal,
  formatoDaExecucao,
  legendaCompactaParaVideo,
  publicadoRecentementeNoEstado,
  registroPublicacaoCompleta,
  resolverVideoCaptacao,
  resolverVideoImovelPronto,
  tipoAgendado,
} = require("../scripts/publicar-servidor");

test("alternância favorece Reel sem eliminar o carrossel", () => {
  const formatos = Array.from({ length: 20 }, (_, indice) =>
    escolherFormatoPrincipal({ indice }, { feed: 0.8, reel: 1.2 }));
  const reels = formatos.filter((item) => item === "reel").length;
  const feeds = formatos.filter((item) => item === "feed").length;
  assert.ok(reels > feeds);
  assert.ok(feeds >= 6);
});

test("produção publica Reel mesmo se a tentativa anterior só publicou fotos", () => {
  const anterior = { formato_principal: "feed" };
  assert.equal(formatoDaExecucao({}, anterior, "reel"), "reel");
  assert.equal(formatoDaExecucao({}, anterior), "feed");
});

test("horários diários em produção apontam para venda e locação", () => {
  assert.equal(tipoAgendado({ GITHUB_SCHEDULE: "7 15 * * *" }), "venda");
  assert.equal(tipoAgendado({ GITHUB_SCHEDULE: "7 19 * * *" }), "locacao");
});

test("Instagram espera o container e tenta novamente só o mesmo vídeo no erro 9007", async () => {
  const estados = ["IN_PROGRESS", "FINISHED", "FINISHED"];
  const envios = [{ error: { code: 9007 } }, { id: "id-confirmado" }];
  assert.equal(await concluirVideoInstagram({
    consultar: async () => ({ status_code: estados.shift() }),
    publicar: async () => envios.shift(),
    aguardar: async () => {},
    limite: 3,
  }), "id-confirmado");
  assert.equal(estados.length, 0);
  assert.equal(envios.length, 0);
});

test("Instagram não envia container incompleto, expirado ou já publicado", async () => {
  const executar = (status_code) => concluirVideoInstagram({
    consultar: async () => ({ status_code }),
    publicar: async () => assert.fail("Publicação não deveria ser chamada"),
    aguardar: async () => {},
    limite: 2,
  });
  await assert.rejects(executar("IN_PROGRESS"), /no prazo/);
  await assert.rejects(executar("EXPIRED"), /EXPIRED/);
  assert.match(await executar("PUBLISHED"), /confirmado/);
});

test("legenda de vídeo mantém fatos, CTA e reduz o bloco social", () => {
  const caption = [
    "Seu imóvel pode virar patrimônio.",
    "Uma oportunidade real em Mogi.",
    "🏡 Casa — Centro",
    "💰 R$ 300.000",
    "✅ 2 dormitórios",
    "✅ 1 vaga",
    "✅ quintal",
    "✅ financiamento bancário",
    "✅ linha excedente",
    "👇 Manda \"CENTRO 123\" no WhatsApp agora:",
    "📲 https://wa.me/551123785643",
    "📲 instagram.com/exemplo",
    "✅ https://www.escritoriocamposfigueira.com.br",
    "CRECI-PJ: 043649-J",
    "#mogidascruzes #imoveismogi #casaavenda #imobiliariamogi #extra #mais #corta",
  ].join("\n");
  const curta = legendaCompactaParaVideo(caption);
  assert.match(curta, /R\$ 300\.000/);
  assert.match(curta, /wa\.me\/551123785643/);
  assert.match(curta, /CRECI-PJ/);
  assert.doesNotMatch(curta, /instagram\.com\/exemplo/);
  assert.doesNotMatch(curta, /linha excedente/);
  assert.ok(curta.length < caption.length);
});

test("Reels mantêm a chamada e o link de captação", () => {
  const texto = legendaCompactaParaVideo([
    "Casa em Mogi", "Condomínio fechado", '💬 Comente "IMOVEL" para receber no direct.',
    "🔗 https://exemplo.com/captador/imoveis?utm_source=robo_social&utm_campaign=venda-cf-554",
  ].join("\n"));
  assert.match(texto, /Comente "IMOVEL"/);
  assert.match(texto, /utm_campaign=venda-cf-554/);
});

test("reconhece falhas transitórias de DNS, timeout e servidor", () => {
  assert.equal(ehErroRedeTransitorio("getaddrinfo ENOTFOUND exemplo.com"), true);
  assert.equal(ehErroRedeTransitorio("EAI_AGAIN"), true);
  assert.equal(ehErroRedeTransitorio("HTTP 503"), true);
  assert.equal(ehErroRedeTransitorio("HTTP 404"), false);
});

test("repete operação de rede transitória sem duplicar a tentativa bem-sucedida", async () => {
  let chamadas = 0;
  const resultado = await comRetryRede(async () => {
    chamadas += 1;
    if (chamadas < 3) throw new Error("getaddrinfo ENOTFOUND exemplo.com");
    return "ok";
  }, "teste", 3, 0);
  assert.equal(resultado, "ok");
  assert.equal(chamadas, 3);
});

test("não repete erro permanente de imagem", async () => {
  let chamadas = 0;
  await assert.rejects(
    () => comRetryRede(async () => {
      chamadas += 1;
      throw new Error("HTTP 404");
    }, "teste", 3, 0),
    /HTTP 404/,
  );
  assert.equal(chamadas, 1);
});

const ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/imagens-urls.json"), "utf8"));
const LOCACOES = new Set(["584-LOCACAO", "607", "609", "609B", "619", "620", "CASA INDAIA BERTIOGA", "CASA JARDIM ARMENIA"]);
const { filtrarCodigosAtivos } = require("../scripts/imoveis-inativos");
const totalVendas = filtrarCodigosAtivos(manifest.ordem).filter((codigo) => !LOCACOES.has(String(codigo))).length;

test("captação em vídeo usa MP4 pronto dentro de public", () => {
  const item = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/captacao.json"), "utf8"))
    .find((captacao) => captacao.id === "CAPT-LOCACAO-PROPRIETARIO");
  const resolvido = resolverVideoCaptacao(ROOT, item);
  assert.equal(path.relative(ROOT, resolvido.videoPath).replace(/\\/g, "/"), item.arquivo_video);
  assert.equal(resolvido.videoUrl, item.url_video);
});

test("captação em vídeo bloqueia caminho fora de public", () => {
  assert.throws(() => resolverVideoCaptacao(ROOT, {
    id: "CAPT-INVALIDA",
    arquivo_video: "../segredo.mp4",
    url_video: "https://example.com/segredo.mp4",
  }), /fora da pasta public/);
});

test("imóvel usa o vídeo V2 narrado correspondente à finalidade", () => {
  const videos = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/videos-imoveis.json"), "utf8"));
  const aliases = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/aliases-imoveis.json"), "utf8"));
  const venda = resolverVideoImovelPronto(ROOT, videos, aliases, "584-VENDA", "venda");
  const locacao = resolverVideoImovelPronto(ROOT, videos, aliases, "584-LOCACAO", "locacao");
  assert.match(path.basename(venda.videoPath), /584-VENDA-NARRADO\.mp4$/);
  assert.match(path.basename(locacao.videoPath), /584-LOCACAO-NARRADO\.mp4$/);
});

test("captação recusada e artes legadas não entram na publicação automática", () => {
  const captacoes = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/captacao.json"), "utf8"));
  const fixa = captacoes.find((item) => item.agenda === "semanal_fixa");
  assert.equal(fixa.id, "CAPT-VENDA-LOCACAO");
  assert.equal(fixa.publicacao_automatica, false);
  const estado = { indiceCapt: 0, publicados: [] };
  assert.equal(escolherProximo(manifest, estado, "captacao_semanal").tipo, "noop");
  for (let i = 0; i < captacoes.length * 2; i++) {
    assert.equal(escolherProximo(manifest, { ...estado, indiceCapt: i }, "captacao").codigo, "CAPT-LOCACAO-PROPRIETARIO");
  }
});

test("a fila de vendas completa um ciclo sem repetir e volta ao início", () => {
  const estado = { indiceVenda: 0, indice: 0, publicados: [] };
  const codigos = [];
  for (let i = 0; i < totalVendas; i += 1) {
    const plano = escolherProximo(manifest, estado, "venda");
    codigos.push(plano.codigo);
    avancarPonteiros(estado, plano, manifest);
  }
  assert.equal(codigos.length, totalVendas);
  assert.equal(new Set(codigos).size, totalVendas);
  assert.equal(escolherProximo(manifest, estado, "venda").codigo, codigos[0]);
});

test("condições comerciais entram primeiro na fila", () => {
  const estado = { indiceVenda: 0, publicados: [] };
  assert.equal(escolherProximo(manifest, estado, "venda").codigo, "516");
});

test("estado bloqueia uma republicação bem-sucedida nas últimas 30 horas", () => {
  const agora = new Date("2026-08-03T15:00:00.000Z");
  const estado = {
    publicados: [{ codigo: "547", data: "2026-08-03T10:00:00.000Z", fb_feed: "✅ post" }],
  };
  assert.equal(publicadoRecentementeNoEstado(estado, "547", agora), true);
  assert.equal(publicadoRecentementeNoEstado(estado, "547", new Date("2026-08-04T17:00:00.000Z")), false);
});

test("registro que só contém falha não bloqueia uma tentativa válida", () => {
  const agora = new Date("2026-08-03T15:00:00.000Z");
  const estado = {
    publicados: [{ codigo: "547", data: "2026-08-03T10:00:00.000Z", fb_feed: "❌ falhou" }],
  };
  assert.equal(publicadoRecentementeNoEstado(estado, "547", agora), false);
});

test("locação só conta como concluída com Feed e Story nas duas redes", () => {
  assert.equal(registroPublicacaoCompleta({
    fb_feed: "✅ ok", fb_story: "✅ ok", ig_feed: "✅ ok", ig_story: "✅ ok",
  }), true);
  assert.equal(registroPublicacaoCompleta({
    fb_feed: "✅ ok", fb_story: "✅ ok", ig_feed: "❌ falhou", ig_story: "✅ ok",
  }), false);
  assert.equal(registroPublicacaoCompleta({
    fb_feed: "✅ ok", fb_story: "✅ ok", ig_feed: "✅ ok", ig_story: "✅ ok", youtube: "❌ falhou",
  }), false);
  assert.equal(registroPublicacaoCompleta({
    fb_feed: "✅ ok", fb_story: "✅ ok", ig_feed: "✅ ok", ig_story: "✅ ok", youtube: "✅ short",
  }), true);
  assert.equal(registroPublicacaoCompleta({
    formato_principal: "reel", fb_reel: "✅ ok", fb_story: "✅ ok", ig_reel: "✅ ok", ig_story: "✅ ok",
  }), true);
  assert.equal(registroPublicacaoCompleta({
    formato_principal: "reel", fb_reel: "✅ ok", fb_story: "✅ ok", ig_reel: "❌ falhou", ig_story: "✅ ok",
  }), false);
});

test("locação incompleta continua pendente sem bloquear as ainda não tentadas", () => {
  const agora = new Date();
  const estado = {
    publicados: [{
      codigo: "584-LOCACAO", data: agora.toISOString(),
      fb_feed: "✅ ok", fb_story: "✅ ok", ig_feed: "❌ falhou", ig_story: "✅ ok",
    }],
  };
  const plano = escolherProximo(manifest, estado, "locacao");
  assert.equal(plano.codigo, "607");
});
