"use strict";
/**
 * Gera src/content/carrosseis-captions.json a partir dos ROTEIRO_7_SLIDES.md /
 * MANIFESTO de cada carrossel. Uma legenda viral por rede, com as menções reais.
 */
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const BASE = path.join(RAIZ, "public", "carrosseis");
const SAIDA = path.join(RAIZ, "src", "content", "carrosseis-captions.json");

// Contas por rede: menção em formato de créditos (Apresentador / Apoio)
const CONTAS = {
  instagram: { apresentador: "@henriquefigueiraoficial", apoio: "@escritorio.figueira @gravataafiada" },
  facebook:  { apresentador: "@eng.henriquefigueira", apoio: "@Escritorio.figueira @gravataafiada" },
  tiktok:    { apresentador: "@henriquesfigueira", apoio: "@camposfigueira @gravataafiada" },
  youtube:   { apresentador: "Henrique Figueira", apoio: "@gravataafiada" },
};
// Hashtags por rede — quantidade e escolha baseadas em pesquisa (2026):
// IG máx 5 (nicho+local), TikTok 5 (popular+nicho+tema, sem #fyp), FB 2, YouTube 3 (#Shorts).
const TAGS = {
  instagram: "#imoveis #comprarimovel #regularizacaodeimoveis #matriculadeimovel #mogidascruzes",
  facebook:  "#imoveis #mogidascruzes",
  tiktok:    "#imoveis #regularizacaodeimoveis #cartorio #dicasdeimovel #direitoimobiliario",
  youtube:   "#Shorts #imoveis #mogidascruzes",
};

function limpar(s) {
  return (s || "")
    .replace(/\*\*/g, "")
    .replace(/[`"“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Rejeita "títulos" que na verdade são texto meta do manifesto, não o gancho.
const META = /(mestre|integrad|recriad|aprovad|do zero|roteiro final|composi|refer[êe]ncia|constru[çc])/i;
function ehTituloReal(t) {
  if (!t) return false;
  const s = limpar(t).replace(/[→\s]+$/, "");
  if (s.length < 15) return false;
  if (!/\s/.test(s)) return false;
  if (META.test(s)) return false;
  return true;
}
function norm(t) {
  return limpar(t).replace(/[→\s]+$/, "").replace(/\s*[.:]\s*$/, "").trim();
}

function extrair(md) {
  const linhas = md.split(/\r?\n/);
  const candidatos = [];

  // a) seção "## Título" -> próxima linha não vazia
  for (let i = 0; i < linhas.length; i++) {
    if (/^#{1,3}\s*t[íi]tulo/i.test(linhas[i])) {
      for (let j = i + 1; j < linhas.length; j++) {
        if (limpar(linhas[j])) { candidatos.push(norm(linhas[j])); break; }
      }
      break;
    }
  }
  // b) primeiro texto em **negrito** que não seja rótulo "Título:"
  const negritos = [...md.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);
  for (const nb of negritos) {
    if (/^t[íi]tulo/i.test(nb.trim())) continue;
    candidatos.push(norm(nb));
    break;
  }
  // c) H1 "# Carrossel NNN — tema"
  const h1 = md.match(/^#\s*Carrossel\s*\d+\s*[—-]\s*(.+)$/im);
  if (h1) candidatos.push(norm(h1[1]));

  const titulo = candidatos.find(ehTituloReal) || "";

  // Apoio / subtexto (primeiro "Apoio:")
  let apoio = "";
  const a = md.match(/apoio:?\s*\**\s*`?([^`\n]+)`?/i);
  if (a) apoio = limpar(a[1]);
  // Site / ferramenta
  let site = "";
  const s = md.match(/(?:site(?:\s*principal)?|ferramenta|url):?\s*\**\s*`?([a-z0-9.\/-]+\.[a-z]{2,}[^\s`]*)`?/i);
  if (s) site = limpar(s[1]);

  return { titulo, apoio, site };
}

// Ganchos genéricos fortes para carrosséis sem roteiro identificável.
const GENERICOS = [
  "Antes de comprar ou vender um imóvel, veja isto 👇",
  "O detalhe da matrícula que quase ninguém confere",
  "Isso pode travar a compra do seu imóvel",
  "O erro que custa caro na hora de comprar um imóvel",
];
// Títulos/apoio definidos à mão (lidos direto da arte) quando não há roteiro.
const OVERRIDES = {
  CARROSSEL_001_RECRIADO_INTEGRADO: { titulo: "5 ERROS QUE PODEM TRAVAR A SUA ESCRITURA", apoio: "Você pode pagar pelo imóvel e ainda não conseguir registrar." },
  CARROSSEL_002_FINAL_INTEGRADO_APROVADO: { titulo: "NÃO PEÇA A MATRÍCULA ANTES DE VER ESTE MAPA", apoio: "O cartório mais perto pode ser o errado — e devolver seu pedido antes de começar.", site: "mapa.onr.org.br" },
  CARROSSEL_015: { titulo: "A CASA EXISTE NO QUINTAL. PARA O BANCO, ELA PODE NÃO EXISTIR", apoio: "A visita mostra a construção. A análise precisa identificar a garantia." },
  CARROSSEL_016: { titulo: "A PREFEITURA MANDA O IPTU. O CARTÓRIO PODE NÃO TER A MATRÍCULA", apoio: "O cadastro cobra e localiza. O registro identifica juridicamente o imóvel." },
  CARROSSEL_017: { titulo: "A MATRÍCULA É VERDADEIRA. MESMO ASSIM, PODE ESTAR VELHA DEMAIS", apoio: "O documento pode ser autêntico e ainda mostrar uma realidade que já mudou." },
};

// Conteúdo compacto por carrossel: gancho curto (com a palavra-chave = SEO) + pergunta curta.
const CONTEUDO = {
  CARROSSEL_001_RECRIADO_INTEGRADO: { abertura: "Você pode pagar por um imóvel e, por um detalhe, não conseguir registrar no seu nome.", pergunta: "Isso já te tirou o sono? Desabafa aqui 👇" },
  CARROSSEL_002_FINAL_INTEGRADO_APROVADO: { abertura: "Pedir a matrícula no cartório errado faz você perder tempo e dinheiro.", pergunta: "Você sabe qual cartório cuida do seu imóvel? 👇" },
  CARROSSEL_003_RECRIADO_INTEGRADO: { abertura: "A certidão de matrícula que chega pelo WhatsApp pode não valer nada.", pergunta: "Você confia num documento só pelo print? 👇" },
  CARROSSEL_004_RECRIADO_INTEGRADO: { abertura: "Pegar a chave emociona — mas, sem registro, a casa ainda pode não ser sua.", pergunta: "Você já achou que era dono só por ter a chave? 👇" },
  CARROSSEL_005_RECRIADO_INTEGRADO: { abertura: "Pagar o IPTU não prova que o imóvel é seu.", pergunta: "Você achava que quem paga o IPTU é o dono? 👇" },
  CARROSSEL_006_RECRIADO_INTEGRADO: { abertura: "Você mora nela há anos — mas na matrícula essa casa pode não existir.", pergunta: "Já conferiu se a sua construção está averbada? 👇" },
  CARROSSEL_007_RECRIADO_INTEGRADO: { abertura: "Construiu no terreno dos pais? A casa pode não ser sua.", pergunta: "Você confiaria só na palavra da família? 👇" },
  CARROSSEL_008_RECRIADO_INTEGRADO: { abertura: "O muro está aí há 30 anos — e a divisa ainda pode estar errada.", pergunta: "Já viu briga de divisa entre vizinhos? 👇" },
  CARROSSEL_009_RECRIADO_INTEGRADO: { abertura: "Seu crédito foi aprovado. O imóvel ainda pode ser reprovado no financiamento.", pergunta: "Já teve um financiamento travado na última hora? 👇" },
  CARROSSEL_010_RECRIADO_INTEGRADO: { abertura: "Você compra o apartamento — e a dívida de condomínio pode vir junto.", pergunta: "Sabia que a dívida gruda no imóvel, não na pessoa? 👇" },
  CARROSSEL_011_RECRIADO_INTEGRADO: { abertura: "Duas casas, dois portões, uma única matrícula. Isso trava tudo.", pergunta: "Você conhece um imóvel 'dois em um'? 👇" },
  CARROSSEL_012_RECRIADO_INTEGRADO: { abertura: "O Pix do sinal caiu — mas quem recebeu pode não poder vender.", pergunta: "Já deu sinal antes de conferir o dono? 👇" },
  CARROSSEL_013_RECRIADO_INTEGRADO: { abertura: "A visita vende o sonho. A matrícula revela o problema.", pergunta: "Já se apaixonou por um imóvel antes de ler a matrícula? 👇" },
  CARROSSEL_014_RECRIADO_INTEGRADO: { abertura: "Morar 20 anos não coloca, sozinho, seu nome na matrícula (usucapião).", pergunta: "Conhece alguém que mora há décadas num imóvel que não é dele? 👇" },
  CARROSSEL_017_RECRIADO_INTEGRADO: { abertura: "A matrícula é verdadeira — mas pode estar velha demais.", pergunta: "De quando é a última atualização da sua? 👇" },
  CARROSSEL_018: { abertura: "'Falta escritura' pode ser o diagnóstico errado na regularização.", pergunta: "Já te disseram que o seu problema era esse? 👇" },
  CARROSSEL_019: { abertura: "O imóvel existe, mas o endereço pode sumir do mapa.", pergunta: "O seu endereço bate em todos os documentos? 👇" },
  CARROSSEL_020: { abertura: "Um papel velho na gaveta pode guardar a matrícula do seu imóvel.", pergunta: "Você sabe onde estão os documentos antigos? 👇" },
  CARROSSEL_021: { abertura: "Você comprou um lote — mas a matrícula pode ser de outra área.", pergunta: "Já conferiu se o lote é o mesmo do papel? 👇" },
  CARROSSEL_022: { abertura: "Tem documento que, se você perde hoje, trava o imóvel amanhã.", pergunta: "Você guarda os seus em lugar seguro? 👇" },
  CARROSSEL_023: { abertura: "O golpe imobiliário começa num anúncio bonito e num site perfeito.", pergunta: "Você ou alguém já quase caiu num golpe de imóvel? 👇" },
  CARROSSEL_024: { abertura: "O primeiro nome da matrícula pode não ser o dono de hoje.", pergunta: "Você leria a matrícula até o último ato? 👇" },
  CARROSSEL_025: { abertura: "Assinou a escritura? Ainda falta o registro pra o imóvel ser seu.", pergunta: "Você achava que a escritura já era o fim? 👇" },
  CARROSSEL_026: { abertura: "IPTU diz 180 m². Matrícula diz 120. Qual área você comprou?", pergunta: "Já comparou o IPTU com a matrícula do seu imóvel? 👇" },
  CARROSSEL_027: { abertura: "Seu contrato prova a compra — mas pode não provar a propriedade.", pergunta: "Você achava que contrato assinado já bastava? 👇" },
  CARROSSEL_028: { abertura: "A casa está pronta — mas pode não existir nos documentos.", pergunta: "A sua construção já está regularizada? 👇" },
  CARROSSEL_029: { abertura: "A planta mostra 2 quartos. A casa tem 4. E agora?", pergunta: "A sua casa é igual à planta aprovada? 👇" },
  CARROSSEL_030: { abertura: "A planta diz uma coisa. O memorial pode dizer outra.", pergunta: "Sabia que os dois precisam bater? 👇" },
  CARROSSEL_031: { abertura: "Assinatura na planta não é o mesmo que responsabilidade técnica (ART/RRT).", pergunta: "Você sabe quem assumiu a da sua obra? 👇" },
  CARROSSEL_032: { abertura: "Morar 20 anos não coloca, sozinho, seu nome na matrícula (usucapião).", pergunta: "Conhece alguém nessa situação? 👇" },
  CARROSSEL_033: { abertura: "Pagar IPTU por 15 anos faz o imóvel virar seu?", pergunta: "Você acreditava nisso? De onde veio a ideia? 👇" },
};

// Pega uma frase curta de valor a partir do apoio do roteiro.
function fraseValor(s) {
  if (!s) return "";
  s = s.trim();
  if (s.length <= 140) return s;
  let f = s.slice(0, 137);
  const corte = Math.max(f.lastIndexOf(". "), f.lastIndexOf(" "));
  if (corte > 60) f = f.slice(0, corte);
  return f.trim() + "…";
}

function montar(info, fallback, key) {
  const t = info.titulo || fallback || GENERICOS[0];
  const conteudo = CONTEUDO[key] || {};
  const abertura = conteudo.abertura || fraseValor(info.apoio) || t;
  const pergunta = conteudo.pergunta || "Você já passou por algo parecido? 👇";
  const site = info.site ? `🔗 ${info.site}` : "";

  // Legenda ENXUTA: gancho (com palavra-chave) + pergunta + créditos numa linha + hashtags.
  function bloco(rede) {
    const c = CONTAS[rede];
    const p = [];
    p.push(abertura);
    p.push("");
    p.push(pergunta);
    if (site) p.push(site);
    p.push(`🎤 ${c.apresentador} · 🤝 ${c.apoio}`);
    p.push(TAGS[rede]);
    return p.join("\n");
  }

  return {
    _titulo: t,
    _titulo_youtube: t,   // título viral p/ o campo "Título" do YouTube (Short)
    instagram: bloco("instagram"),
    facebook:  bloco("facebook"),
    tiktok:    bloco("tiktok"),
    // YouTube tem TÍTULO + DESCRIÇÃO separados
    youtube:   `🎬 TÍTULO (copie no campo "Título" do Short):\n${t}\n\n📝 DESCRIÇÃO:\n` + bloco("youtube"),
  };
}

function acharRoteiro(dir) {
  const arqs = fs.readdirSync(dir).filter((f) => /\.md$/i.test(f));
  const pref = ["ROTEIRO_7_SLIDES.md", "MANIFESTO_MESTRE.md", "MANIFESTO.md", "PROVENIENCIA.md", "BRIEF_VISUAL_INVIOLAVEL.md"];
  for (const p of pref) {
    const hit = arqs.find((f) => f.toUpperCase() === p.toUpperCase());
    if (hit) return path.join(dir, hit);
  }
  return arqs.length ? path.join(dir, arqs[0]) : null;
}

function main() {
  const out = {};
  const carrosseis = fs
    .readdirSync(BASE)
    .filter((d) => fs.statSync(path.join(BASE, d)).isDirectory())
    .sort();

  carrosseis.forEach((c, idx) => {
    const dir = path.join(BASE, c);
    const rot = acharRoteiro(dir);
    let info = { titulo: "", apoio: "", site: "" };
    if (rot) {
      try { info = extrair(fs.readFileSync(rot, "utf8")); } catch (e) {}
    }
    const ov = OVERRIDES[c];
    if (ov) { info.titulo = ov.titulo; if (ov.apoio) info.apoio = ov.apoio; if (ov.site) info.site = ov.site; }
    const fallback = GENERICOS[idx % GENERICOS.length];
    out[c] = montar(info, fallback, c);
  });

  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2));
  console.log("Gerado:", SAIDA, "->", Object.keys(out).length, "carrosseis");
  // amostra
  for (const c of Object.keys(out).slice(0, 4)) {
    console.log("  •", c, "→", out[c]._titulo);
  }
}

main();
