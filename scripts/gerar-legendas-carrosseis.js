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

// Conteúdo emocional sob medida por carrossel: abertura (dor/emoção/sonho) + pergunta
// que gera comentário, ligada ao TEMA central. Sem "comente QUERO".
const CONTEUDO = {
  CARROSSEL_001_RECRIADO_INTEGRADO: { abertura: "Você junta uma vida inteira pra comprar um imóvel… e um detalhe pequeno pode te impedir de colocar ele no seu nome.", pergunta: "Você sabia que dá pra pagar por um imóvel e ainda assim não conseguir registrar? Conta aqui 👇" },
  CARROSSEL_002_FINAL_INTEGRADO_APROVADO: { abertura: "Pedir a certidão no cartório errado devolve o seu pedido antes mesmo de começar — e você perde tempo, dinheiro e paciência.", pergunta: "Você sabe qual cartório é o dono da matrícula do SEU imóvel? 👇" },
  CARROSSEL_003_RECRIADO_INTEGRADO: { abertura: "Recebeu a certidão por WhatsApp e ficou tranquilo? Aquele print pode esconder justamente o que mais importa.", pergunta: "Você confiaria num documento só porque ele chegou pelo WhatsApp? Comenta 👇" },
  CARROSSEL_004_RECRIADO_INTEGRADO: { abertura: "Pegar a chave dá aquela emoção de 'conquistei'. Mas, sem registro, no papel a casa ainda pode não ser sua.", pergunta: "Você já achou que um imóvel era seu só porque pegou a chave? 👇" },
  CARROSSEL_005_RECRIADO_INTEGRADO: { abertura: "Pagar o IPTU todo ano dá a sensação de dono. Só que IPTU é cobrança — não é prova de que o imóvel é seu.", pergunta: "Você achava que quem paga o IPTU é automaticamente o dono? Conta aqui 👇" },
  CARROSSEL_006_RECRIADO_INTEGRADO: { abertura: "Você vive dentro dela todos os dias, criou seus filhos ali… mas, na matrícula, essa casa pode simplesmente não existir.", pergunta: "Você já conferiu se a sua construção está averbada na matrícula? 👇" },
  CARROSSEL_007_RECRIADO_INTEGRADO: { abertura: "Construir no terreno da família parece o caminho seguro… até o dia em que você precisa provar que a casa é sua.", pergunta: "Você conhece alguém que construiu no terreno dos pais? Marca essa pessoa 👇" },
  CARROSSEL_008_RECRIADO_INTEGRADO: { abertura: "O muro está no mesmo lugar há 30 anos — e mesmo assim a divisa de verdade pode ser outra bem diferente.", pergunta: "Você já viu (ou viveu) briga de divisa entre vizinhos? Conta aqui 👇" },
  CARROSSEL_009_RECRIADO_INTEGRADO: { abertura: "O banco aprovou o SEU crédito, você já comemorou… só que o financiamento ainda pode travar por causa do imóvel.", pergunta: "Você já teve um financiamento travado bem na última hora? 👇" },
  CARROSSEL_010_RECRIADO_INTEGRADO: { abertura: "Você compra o apartamento dos sonhos… e a dívida de condomínio do antigo dono pode vir de brinde, no seu nome.", pergunta: "Você sabia que dívida de condomínio 'gruda' no imóvel, e não na pessoa? 👇" },
  CARROSSEL_011_RECRIADO_INTEGRADO: { abertura: "Duas casas, dois portões, duas famílias — e uma única matrícula no papel. Isso trava venda, financiamento e herança.", pergunta: "Você conhece um imóvel assim, 'dois em um' na mesma matrícula? Comenta 👇" },
  CARROSSEL_012_RECRIADO_INTEGRADO: { abertura: "O Pix do sinal caiu na hora e bateu aquele alívio. Mas quem recebeu pode simplesmente não ter poder pra vender aquele imóvel.", pergunta: "Você já deu sinal antes de conferir quem realmente é o dono? 👇" },
  CARROSSEL_013_RECRIADO_INTEGRADO: { abertura: "A visita encanta, o sonho fala mais alto… e é a matrícula que revela o problema que ninguém te contou.", pergunta: "Você já se apaixonou por um imóvel antes de ler a matrícula? 👇" },
  CARROSSEL_014_RECRIADO_INTEGRADO: { abertura: "Vinte anos morando no mesmo lugar não colocam, sozinhos, o seu nome na matrícula do imóvel.", pergunta: "Você conhece alguém que mora há décadas num imóvel que não está no nome? Marca 👇" },
  CARROSSEL_017_RECRIADO_INTEGRADO: { abertura: "A matrícula é verdadeira, autêntica, assinada… e ainda assim pode estar mostrando uma realidade que já mudou.", pergunta: "Você sabe de quando é a última atualização da matrícula do seu imóvel? 👇" },
  CARROSSEL_018: { abertura: "'Falta a escritura' é o que todo mundo repete. Mas esse pode ser o diagnóstico errado — e te fazer gastar à toa.", pergunta: "Você já ouviu que o seu problema era 'falta de escritura'? Conta aqui 👇" },
  CARROSSEL_019: { abertura: "O imóvel existe, você mora nele há anos — mas, pro sistema, o endereço pode simplesmente não aparecer no mapa.", pergunta: "O endereço do seu imóvel bate igualzinho em todos os documentos? 👇" },
  CARROSSEL_020: { abertura: "Aquele papel velho e amassado esquecido na gaveta pode ser exatamente o que leva até a matrícula do seu imóvel.", pergunta: "Você sabe onde estão os documentos antigos do seu imóvel? 👇" },
  CARROSSEL_021: { abertura: "Você comprou aquele lote, pisou no terreno… mas a matrícula pode estar apontando pra um pedaço de terra diferente.", pergunta: "Você já conferiu se o lote que você viu é o mesmo da matrícula? 👇" },
  CARROSSEL_022: { abertura: "Tem documento que, se você perde hoje, pode travar a venda do seu imóvel lá na frente — quando você mais precisar.", pergunta: "Você guarda os documentos do seu imóvel em lugar seguro? Comenta 👇" },
  CARROSSEL_023: { abertura: "O golpe imobiliário mais perigoso não parece golpe: ele começa num anúncio bonito e num site perfeitinho.", pergunta: "Você já quase caiu (ou caiu) num golpe de imóvel? Conta sua história 👇" },
  CARROSSEL_024: { abertura: "O primeiro nome que aparece na matrícula pode não ser o dono de hoje. Parar de ler ali é terminar com a resposta errada.", pergunta: "Você sabia que a matrícula é uma linha do tempo, e não uma foto? 👇" },
  CARROSSEL_025: { abertura: "Assinou a escritura e sentiu que finalmente acabou? Ainda falta o passo que de verdade coloca o imóvel no seu nome.", pergunta: "Você sabia que escritura assinada ainda NÃO é imóvel registrado? 👇" },
  CARROSSEL_026: { abertura: "O IPTU diz 180 m². A matrícula diz 120. No fim das contas, qual área você realmente comprou?", pergunta: "Você já comparou a área do IPTU com a da matrícula do seu imóvel? 👇" },
  CARROSSEL_027: { abertura: "Seu contrato prova que você comprou. Mas comprar não é a mesma coisa que ser o dono lá no registro.", pergunta: "Você achava que contrato assinado já era garantia de propriedade? 👇" },
  CARROSSEL_028: { abertura: "A casa está pronta, habitada, cheia de memórias… e mesmo assim pode simplesmente não existir nos documentos.", pergunta: "A sua construção já está regularizada no papel? Comenta 👇" },
  CARROSSEL_029: { abertura: "A planta aprovada mostra 2 quartos. A casa real tem 4. Essa diferença pode virar uma baita dor de cabeça na hora de vender.", pergunta: "A sua casa é igualzinha à planta que foi aprovada? 👇" },
  CARROSSEL_030: { abertura: "A planta mostra o desenho, o memorial descreve os detalhes. Quando os dois se contradizem, o problema acaba sendo seu.", pergunta: "Você sabia que planta e memorial precisam contar a MESMA história? 👇" },
  CARROSSEL_031: { abertura: "Ter uma assinatura na planta não é a mesma coisa que ter alguém que, de verdade, assumiu a responsabilidade técnica pela obra.", pergunta: "Você sabe quem assinou a responsabilidade técnica da sua obra? 👇" },
  CARROSSEL_032: { abertura: "Vinte anos morando no mesmo lugar não colocam, sozinhos, o seu nome na matrícula do imóvel.", pergunta: "Você conhece alguém que mora há décadas num imóvel que não está no nome? Marca 👇" },
  CARROSSEL_033: { abertura: "Pagar IPTU por 15 anos dá aquela forte sensação de dono… mas será que isso, sozinho, torna o imóvel seu?", pergunta: "Você achava que pagar IPTU por muitos anos já garantia a propriedade? 👇" },
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
  const pergunta = conteudo.pergunta || "Você já passou por algo parecido? Conta aqui nos comentários 👇";
  const site = info.site ? `🔗 ${info.site}` : "";

  function bloco(rede) {
    const c = CONTAS[rede];
    const p = [];
    p.push(abertura);                              // conexão emocional (dor/sonho)
    p.push("");
    p.push(pergunta);                              // pergunta ligada ao tema → comentário
    p.push("🔖 Salva pra não esquecer e marca quem vai comprar ou vender.");
    if (site) { p.push(""); p.push(site); }
    p.push("");
    p.push(`🎤 Apresentador: ${c.apresentador}`);   // menção em créditos
    p.push(`🤝 Apoio: ${c.apoio}`);
    p.push("");
    p.push(TAGS[rede]);
    return p.join("\n");
  }

  return {
    _titulo: t,
    instagram: bloco("instagram"),
    facebook:  bloco("facebook"),
    tiktok:    bloco("tiktok"),
    youtube:   bloco("youtube"),
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
