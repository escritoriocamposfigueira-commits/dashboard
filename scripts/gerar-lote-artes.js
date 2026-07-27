#!/usr/bin/env node
/* Gera um lote de artes determinísticas a partir de um arquivo JSON. */

"use strict";

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const {
  carregarFoto,
  gerarArte,
  validarConfig,
} = require("./gerar-artes-imovel");

async function main() {
  const lotePath = path.resolve(process.argv[2] || "");
  const outputRoot = path.resolve(
    process.argv[3] || path.join("arte-gerada", "lote")
  );
  const onlyCodes = new Set(
    String(process.argv[4] || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  if (!lotePath || !fs.existsSync(lotePath)) {
    throw new Error("Informe o arquivo JSON do lote.");
  }
  const lote = JSON.parse(fs.readFileSync(lotePath, "utf8"));
  if (!Array.isArray(lote) || lote.length === 0) {
    throw new Error("O lote precisa ser um array não vazio.");
  }

  for (const raw of lote.filter(
    (item) => onlyCodes.size === 0 || onlyCodes.has(String(item.codigo))
  )) {
    const config = validarConfig(raw);
    const pasta = path.join(outputRoot, config.codigo);
    fs.mkdirSync(pasta, { recursive: true });
    const fotos = await Promise.all(
      config.fotos.slice(0, 3).map((foto) => carregarFoto(foto, path.dirname(lotePath)))
    );
    const formats = [];
    if (raw.gerar_feed !== false) formats.push("feed");
    if (raw.gerar_story !== false) formats.push("story");
    for (const format of formats) {
      const suffix = format === "feed" ? "FEED" : "STORY";
      const out = path.join(pasta, `CF - ${config.codigo} - ${suffix}.png`);
      await gerarArte(config, format, fotos, out);
      console.log(`✅ ${config.codigo} ${suffix}: ${out}`);
    }
  }
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
