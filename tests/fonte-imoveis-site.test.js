"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  indexarCatalogo,
  normalizarCodigo,
  obterImovel,
  parseListingsXml,
  resolverCodigoFonte,
  separarChavePublicacao,
  validarMetadadosImovel,
} = require("../scripts/fonte-imoveis-site");
const {
  codigoEhLocacao,
  codigoPublicavelNaFonte,
} = require("../scripts/publicar-servidor");
const {
  caption584,
  substituir584NoManifesto,
} = require("../scripts/sincronizar-base-imoveis");

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<Listings>
  <Listing>
    <ListingID>CF - 584-venda</ListingID>
    <TransactionType>Venda</TransactionType>
    <Title>Casa no Parque das Figueiras</Title>
    <DetailViewUrl>https://www.escritoriocamposfigueira.com.br/imovel/CF-584</DetailViewUrl>
    <ListPrice>1400000</ListPrice>
    <Media>${Array.from({ length: 6 }, (_, i) => `<Item>https://www.escritoriocamposfigueira.com.br/uploads/imoveis/584-${i}.jpg</Item>`).join("")}</Media>
  </Listing>
  <Listing>
    <ListingID>CF - 584-locacao</ListingID>
    <TransactionType>Locação</TransactionType>
    <Title>Casa no Parque das Figueiras</Title>
    <DetailViewUrl>https://www.escritoriocamposfigueira.com.br/imovel/CF-584</DetailViewUrl>
    <RentalPrice>8500</RentalPrice>
    <Media>${Array.from({ length: 6 }, (_, i) => `<Item>https://www.escritoriocamposfigueira.com.br/uploads/imoveis/584-${i}.jpg</Item>`).join("")}</Media>
  </Listing>
  <Listing>
    <ListingID>CF - 620-locacao</ListingID>
    <TransactionType>Locação</TransactionType>
    <Title>Imóvel sem fotos suficientes</Title>
    <DetailViewUrl>https://www.escritoriocamposfigueira.com.br/imovel/CF-620</DetailViewUrl>
    <RentalPrice>2500</RentalPrice>
    <Media><Item>https://www.escritoriocamposfigueira.com.br/uploads/imoveis/620-1.jpg</Item></Media>
  </Listing>
</Listings>`;

test("normaliza códigos do XML sem perder letras", () => {
  assert.equal(normalizarCodigo("CF - 618"), "CF-618");
  assert.equal(normalizarCodigo("CF- 607"), "CF-607");
  assert.equal(normalizarCodigo("CF - 619 "), "CF-619");
  assert.equal(normalizarCodigo("CF - 609 B"), "CF-609B");
  assert.equal(normalizarCodigo("CF-FD1FEFC4"), "CF-FD1FEFC4");
  assert.equal(separarChavePublicacao("584-LOCACAO").finalidade, "locacao");
});

test("interpreta venda e locação do mesmo imóvel como anúncios distintos", () => {
  const listings = parseListingsXml(XML);
  const indice = indexarCatalogo(listings);
  assert.equal(listings.length, 3);
  assert.equal(obterImovel(indice, "584-VENDA", "").preco, 1_400_000);
  assert.equal(obterImovel(indice, "584-LOCACAO", "").preco, 8_500);
  assert.equal(codigoEhLocacao("584-LOCACAO", indice), true);
  assert.equal(codigoEhLocacao("584-VENDA", indice), false);
});

test("resolve aliases e bloqueia imóvel sem seis fotos reais", () => {
  const indice = indexarCatalogo(parseListingsXml(XML));
  const aliases = { "CASA TESTE": "CF-620" };
  assert.equal(resolverCodigoFonte("CASA TESTE", aliases), "CF-620");
  assert.equal(validarMetadadosImovel(indice.get("CF-620|locacao"), 6).ok, false);
  assert.equal(codigoPublicavelNaFonte("CASA TESTE", indice, aliases), false);
});

test("desdobra o CF-584 no manifesto e na legenda", () => {
  const manifest = {
    ordem: ["583", "584", "585"],
    urls: { 584: "story.png" },
    urls_feed: { 584: "feed.png" },
  };
  substituir584NoManifesto(manifest);
  assert.deepEqual(manifest.ordem, ["583", "584-VENDA", "584-LOCACAO", "585"]);
  assert.equal(manifest.urls["584-LOCACAO"], "story.png");
  const base = "🏡 Casa em condomínio fechado — Vila Moraes, Mogi das Cruzes\n💰 R$ 1.400.000 (ou locação R$ 8.500/mês)\n👇 Manda \"FIGUEIRAS 584\" no WhatsApp agora:\nhttps://wa.me/551123785643?text=Tenho%20interesse%20no%20FIGUEIRAS%20584";
  assert.match(caption584(base, "venda"), /R\$ 1\.400\.000/);
  assert.doesNotMatch(caption584(base, "venda"), /8\.500/);
  assert.match(caption584(base, "locacao"), /R\$ 8\.500\/mês/);
  assert.match(caption584(base, "locacao"), /ALUGAR 584/);
});
