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

const MENC = {
  instagram: "@escritorio.figueira @henriquefigueiraoficial @gravataafiada",
  facebook: "@eng.henriquefigueira @gravataafiada @Escritorio.figueira",
  tiktok: "@henriquesfigueira @camposfigueira @gravataafiada",
  youtube: "@gravataafiada",
};

const TAGS_BASE = "#gravataafiada #imoveis #mogidascruzes #engenharia #regularizacao #registrodeimoveis #cartorio #documentos #direitoimobiliario #casapropria";

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
// Títulos definidos à mão quando não há roteiro no arquivo.
const OVERRIDES = {};

function montar(info, fallback) {
  const t = info.titulo || fallback || GENERICOS[0];
  const apoio = info.apoio ? `\n\n${info.apoio}` : "";
  const site = info.site ? `\n🔗 ${info.site}` : "";
  const salvar = `📌 SALVE • ENVIE pra quem precisa • SIGA`;

  return {
    _titulo: t,
    instagram:
      `🔥 ${t}${apoio}\n\n${salvar}\n💬 Comente "QUERO" ou chama no direct que a gente te orienta.${site}\n\n${MENC.instagram}\n\n#viral #fyp ${TAGS_BASE}`,
    facebook:
      `🔥 ${t}${apoio}\n\n${salvar}\n💬 Comente "QUERO" que a gente te chama no particular.${site}\n\n${MENC.facebook}\n\n#viral ${TAGS_BASE}`,
    tiktok:
      `🔥 ${t} 👀\n\n👔 Gravata Afiada — imóveis, engenharia e regularização em Mogi das Cruzes e região.${site}\n\n${MENC.tiktok}\n\n#viral #fyp #foryou #foryoupage #mogidascruzes #imoveis #engenharia #regularizacao`,
    youtube:
      `🔥 ${t} #Shorts\n\nEscritório Campos Figueira — imóveis, engenharia e regularização com quem entende de verdade.${site}\n${MENC.youtube}\n\n#viral #Shorts #imoveis #mogidascruzes #engenharia #regularizacao`,
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
    if (OVERRIDES[c]) info.titulo = OVERRIDES[c];
    const fallback = GENERICOS[idx % GENERICOS.length];
    out[c] = montar(info, fallback);
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
