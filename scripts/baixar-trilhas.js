/**
 * Compatibilidade com o comando antigo.
 *
 * A biblioteca ativa não baixa mais música de terceiros. Ela gera 60 faixas
 * instrumentais originais, sem samples externos.
 */

"use strict";

const gerador = require("./gerar-trilhas-originais");

if (require.main === module) {
  console.warn("baixar-trilhas.js foi substituído por gerar-trilhas-originais.js.");
  gerador.main();
}

module.exports = gerador;
