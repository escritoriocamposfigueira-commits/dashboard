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

// Conteúdo sob medida por carrossel:
//  abertura = conexão emocional (dor/sonho) · seo = frase-chave evergreen (o que a
//  pessoa PESQUISA hoje e por anos) · pergunta = envolvimento profundo que puxa história.
const CONTEUDO = {
  CARROSSEL_001_RECRIADO_INTEGRADO: { abertura: "Você junta uma vida inteira pra comprar um imóvel… e um detalhe pequeno pode te impedir de colocar ele no seu nome.", seo: "Estes são os erros que travam a escritura e o registro de um imóvel — e como evitá-los antes de comprar.", pergunta: "Imagina descobrir, depois de anos economizando, que a casa que você pagou ainda não é sua no papel. Isso te tira o sono? Desabafa aqui 👇" },
  CARROSSEL_002_FINAL_INTEGRADO_APROVADO: { abertura: "Pedir a certidão no cartório errado devolve o seu pedido antes mesmo de começar — e você perde tempo, dinheiro e paciência.", seo: "Veja como descobrir qual cartório de registro de imóveis é o competente antes de pedir a matrícula.", pergunta: "Já teve aquela sensação de correr atrás de papel e só ouvir 'não é aqui'? Como foi pra você? 👇" },
  CARROSSEL_003_RECRIADO_INTEGRADO: { abertura: "Recebeu a certidão por WhatsApp e ficou tranquilo? Aquele print pode esconder justamente o que mais importa.", seo: "Aprenda a validar a autenticidade de uma certidão de matrícula de imóvel e não cair em documento falso.", pergunta: "Seja sincero: você confere a origem de um documento, ou confia no print que chega no WhatsApp? 👇" },
  CARROSSEL_004_RECRIADO_INTEGRADO: { abertura: "Pegar a chave dá aquela emoção de 'conquistei'. Mas, sem registro, no papel a casa ainda pode não ser sua.", seo: "Entenda por que só o registro no cartório transfere a propriedade do imóvel — a posse da chave não basta.", pergunta: "Qual foi a maior emoção que você sentiu ao pegar a chave de um imóvel — e você chegou a conferir o registro depois? 👇" },
  CARROSSEL_005_RECRIADO_INTEGRADO: { abertura: "Pagar o IPTU todo ano dá a sensação de dono. Só que IPTU é cobrança — não é prova de que o imóvel é seu.", seo: "Saiba a diferença entre estar no carnê do IPTU e ser o dono registrado do imóvel na matrícula.", pergunta: "Você paga IPTU de algum imóvel que talvez não esteja no seu nome? Isso te preocupa? 👇" },
  CARROSSEL_006_RECRIADO_INTEGRADO: { abertura: "Você vive dentro dela todos os dias, criou seus filhos ali… mas, na matrícula, essa casa pode simplesmente não existir.", seo: "Como saber se a construção está averbada na matrícula do imóvel e por que a averbação é essencial.", pergunta: "Sua casa tem a sua história em cada canto — mas o que você faria se descobrisse que ela não existe na matrícula? 👇" },
  CARROSSEL_007_RECRIADO_INTEGRADO: { abertura: "Construir no terreno da família parece o caminho seguro… até o dia em que você precisa provar que a casa é sua.", seo: "Entenda os riscos de construir em terreno de terceiros e como proteger o seu patrimônio na família.", pergunta: "Você construiria (ou já construiu) no terreno da sua família confiando só na palavra? Conta sua experiência 👇" },
  CARROSSEL_008_RECRIADO_INTEGRADO: { abertura: "O muro está no mesmo lugar há 30 anos — e mesmo assim a divisa de verdade pode ser outra bem diferente.", seo: "Saiba como conferir a divisa e a área do terreno na matrícula antes que vire briga com o vizinho.", pergunta: "Já viu uma amizade de anos entre vizinhos acabar por causa de um metro de divisa? Conta essa história 👇" },
  CARROSSEL_009_RECRIADO_INTEGRADO: { abertura: "O banco aprovou o SEU crédito, você já comemorou… só que o financiamento ainda pode travar por causa do imóvel.", seo: "Entenda por que o banco reprova o imóvel no financiamento mesmo com o seu crédito aprovado.", pergunta: "Já sentiu a frustração de ter o crédito aprovado e ver o sonho travar na última hora? Como foi? 👇" },
  CARROSSEL_010_RECRIADO_INTEGRADO: { abertura: "Você compra o apartamento dos sonhos… e a dívida de condomínio do antigo dono pode vir de brinde, no seu nome.", seo: "Saiba como a dívida de condomínio acompanha o imóvel e como se proteger antes de comprar um apartamento.", pergunta: "Você já herdou (ou quase herdou) uma dívida que não era sua ao comprar algo? Conta 👇" },
  CARROSSEL_011_RECRIADO_INTEGRADO: { abertura: "Duas casas, dois portões, duas famílias — e uma única matrícula no papel. Isso trava venda, financiamento e herança.", seo: "Entenda o desmembramento de imóvel e por que duas casas em uma matrícula só travam a venda.", pergunta: "Você mora ou conhece um imóvel que é 'dois em um' na mesma matrícula? Como isso complicou a vida de alguém? 👇" },
  CARROSSEL_012_RECRIADO_INTEGRADO: { abertura: "O Pix do sinal caiu na hora e bateu aquele alívio. Mas quem recebeu pode simplesmente não ter poder pra vender aquele imóvel.", seo: "Saiba como confirmar se quem vende o imóvel realmente pode vender antes de pagar o sinal.", pergunta: "Já deu um sinal no impulso, no calor da emoção, antes de conferir tudo? Conta essa 👇" },
  CARROSSEL_013_RECRIADO_INTEGRADO: { abertura: "A visita encanta, o sonho fala mais alto… e é a matrícula que revela o problema que ninguém te contou.", seo: "Aprenda a ler a matrícula do imóvel para não comprar um problema disfarçado de sonho.", pergunta: "Você já se apaixonou por um imóvel a ponto de quase ignorar os sinais de alerta? 👇" },
  CARROSSEL_014_RECRIADO_INTEGRADO: { abertura: "Vinte anos morando no mesmo lugar não colocam, sozinhos, o seu nome na matrícula do imóvel.", seo: "Entenda o usucapião e por que morar por muitos anos não transfere automaticamente o imóvel pro seu nome.", pergunta: "Você conhece uma família que mora há décadas num imóvel que ainda não é dela no papel? O que impede? 👇" },
  CARROSSEL_017_RECRIADO_INTEGRADO: { abertura: "A matrícula é verdadeira, autêntica, assinada… e ainda assim pode estar mostrando uma realidade que já mudou.", seo: "Saiba por que você precisa de uma certidão de matrícula atualizada antes de comprar ou financiar um imóvel.", pergunta: "De quando é a última vez que você olhou a matrícula do seu imóvel? Tem coragem de conferir hoje? 👇" },
  CARROSSEL_018: { abertura: "'Falta a escritura' é o que todo mundo repete. Mas esse pode ser o diagnóstico errado — e te fazer gastar à toa.", seo: "Entenda a diferença entre escritura, registro e matrícula na regularização de um imóvel.", pergunta: "Já te disseram que o seu problema era 'falta de escritura'? Você acreditou de primeira? 👇" },
  CARROSSEL_019: { abertura: "O imóvel existe, você mora nele há anos — mas, pro sistema, o endereço pode simplesmente não aparecer no mapa.", seo: "Saiba o que fazer quando o endereço do imóvel diverge entre a matrícula e o cadastro da prefeitura.", pergunta: "O endereço do seu imóvel bate igual em todos os documentos, ou já te deu dor de cabeça? 👇" },
  CARROSSEL_020: { abertura: "Aquele papel velho e amassado esquecido na gaveta pode ser exatamente o que leva até a matrícula do seu imóvel.", seo: "Aprenda a encontrar o número da matrícula do imóvel a partir de documentos e escrituras antigas.", pergunta: "Você sabe onde estão os documentos antigos do seu imóvel — ou eles somem quando você mais precisa? 👇" },
  CARROSSEL_021: { abertura: "Você comprou aquele lote, pisou no terreno… mas a matrícula pode estar apontando pra um pedaço de terra diferente.", seo: "Saiba como conferir se o lote comprado corresponde à matrícula e à área realmente registrada.", pergunta: "Você confere no chão o que está no papel, ou confia no que te mostram na hora da venda? 👇" },
  CARROSSEL_022: { abertura: "Tem documento que, se você perde hoje, pode travar a venda do seu imóvel lá na frente — quando você mais precisar.", seo: "Descubra quais documentos do imóvel você não pode perder e como guardá-los com segurança.", pergunta: "Se um documento do seu imóvel sumisse hoje, você saberia recuperar? Isso te dá aflição? 👇" },
  CARROSSEL_023: { abertura: "O golpe imobiliário mais perigoso não parece golpe: ele começa num anúncio bonito e num site perfeitinho.", seo: "Aprenda a identificar um golpe imobiliário e a verificar um imóvel antes de pagar qualquer valor.", pergunta: "Você, um amigo ou um familiar já foi vítima (ou quase) de um golpe imobiliário? Conta pra alertar outras pessoas 👇" },
  CARROSSEL_024: { abertura: "O primeiro nome que aparece na matrícula pode não ser o dono de hoje. Parar de ler ali é terminar com a resposta errada.", seo: "Entenda a cadeia de proprietários na matrícula e como descobrir quem é o dono atual do imóvel.", pergunta: "Você leria a matrícula até o último ato, ou pararia no primeiro nome? Seja honesto 👇" },
  CARROSSEL_025: { abertura: "Assinou a escritura e sentiu que finalmente acabou? Ainda falta o passo que de verdade coloca o imóvel no seu nome.", seo: "Saiba por que a escritura só transfere o imóvel depois do registro no cartório de registro de imóveis.", pergunta: "Você achava que assinar a escritura era o fim da história? O que ninguém te contou? 👇" },
  CARROSSEL_026: { abertura: "O IPTU diz 180 m². A matrícula diz 120. No fim das contas, qual área você realmente comprou?", seo: "Entenda a divergência de área entre IPTU e matrícula e o que isso muda na compra do imóvel.", pergunta: "Você já comparou a metragem do seu IPTU com a da matrícula? Tem medo do que vai encontrar? 👇" },
  CARROSSEL_027: { abertura: "Seu contrato prova que você comprou. Mas comprar não é a mesma coisa que ser o dono lá no registro.", seo: "Entenda a diferença entre contrato de compra e venda e registro de propriedade do imóvel.", pergunta: "Você guardaria um contrato achando que já é dono? Quantas pessoas você conhece que fazem isso? 👇" },
  CARROSSEL_028: { abertura: "A casa está pronta, habitada, cheia de memórias… e mesmo assim pode simplesmente não existir nos documentos.", seo: "Saiba como regularizar uma construção e averbar a casa na matrícula do imóvel.", pergunta: "Sua casa está cheia de vida — mas está regularizada no papel? O que te impede de regularizar? 👇" },
  CARROSSEL_029: { abertura: "A planta aprovada mostra 2 quartos. A casa real tem 4. Essa diferença pode virar uma baita dor de cabeça na hora de vender.", seo: "Entenda por que a diferença entre a planta aprovada e a construção real trava a venda do imóvel.", pergunta: "A sua casa é igual à planta aprovada, ou foi 'crescendo' com o tempo? Conta 👇" },
  CARROSSEL_030: { abertura: "A planta mostra o desenho, o memorial descreve os detalhes. Quando os dois se contradizem, o problema acaba sendo seu.", seo: "Entenda a relação entre planta e memorial descritivo na regularização e no registro do imóvel.", pergunta: "Você sabia que a planta e o memorial descritivo precisam contar a mesma história? Já tinha parado pra pensar nisso? 👇" },
  CARROSSEL_031: { abertura: "Ter uma assinatura na planta não é a mesma coisa que ter alguém que, de verdade, assumiu a responsabilidade técnica pela obra.", seo: "Entenda a importância da ART e da RRT e da responsabilidade técnica na construção de um imóvel.", pergunta: "Você sabe o nome de quem assumiu a responsabilidade técnica da sua obra — ou nunca perguntou? 👇" },
  CARROSSEL_032: { abertura: "Vinte anos morando no mesmo lugar não colocam, sozinhos, o seu nome na matrícula do imóvel.", seo: "Entenda o usucapião e por que morar por muitos anos não transfere automaticamente o imóvel pro seu nome.", pergunta: "Você conhece uma família que mora há décadas num imóvel que ainda não é dela no papel? O que impede? 👇" },
  CARROSSEL_033: { abertura: "Pagar IPTU por 15 anos dá aquela forte sensação de dono… mas será que isso, sozinho, torna o imóvel seu?", seo: "Saiba se pagar IPTU dá direito à propriedade e o que realmente conta para o usucapião de um imóvel.", pergunta: "Você acreditava que pagar IPTU por anos já te tornava dono? De onde veio essa ideia? 👇" },
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
  const seo = conteudo.seo || "";                  // frase-chave evergreen (SEO/busca)
  const pergunta = conteudo.pergunta || "Você já passou por algo parecido? Conta aqui nos comentários 👇";
  const site = info.site ? `🔗 ${info.site}` : "";

  function bloco(rede) {
    const c = CONTAS[rede];
    const p = [];
    p.push(abertura);                              // conexão emocional (dor/sonho)
    if (seo) p.push(seo);                          // palavra-chave que a pessoa PESQUISA (evergreen)
    p.push("");
    p.push(pergunta);                              // pergunta profunda → comentário/história
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
