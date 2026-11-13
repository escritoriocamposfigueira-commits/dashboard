import test from "node:test";
import assert from "node:assert/strict";
import {
  aplicarDescadastro,
  chaveDedupe,
  estaBloqueado,
  linhaEhEmpresa,
  normalizarEmail,
  normalizarTelefoneBR,
  podeReceberConteudo,
  respostaAutomaticaSegura,
  validarLead,
} from "../supabase/functions/_shared/core.mjs";
import { prepararImportacao } from "../scripts/importar-mailerfind.mjs";

test("normaliza telefone brasileiro e e-mail", () => {
  assert.equal(normalizarTelefoneBR("(11) 98765-4321"), "+5511987654321");
  assert.equal(normalizarEmail(" HENRIQUE@EXEMPLO.COM "), "henrique@exemplo.com");
  assert.equal(normalizarTelefoneBR("123"), null);
});

test("deduplica por operação e telefone", () => {
  const lead = { operacao: "imobiliaria", telefone_e164: "+5511987654321" };
  assert.equal(chaveDedupe(lead), "imobiliaria|tel:+5511987654321");
});

test("bloqueio global e bloqueio da operação impedem contato", () => {
  const lead = { operacao: "imobiliaria", telefone_e164: "+5511987654321" };
  assert.equal(estaBloqueado(lead, [{ operacao: null, telefone_e164: "+5511987654321" }]), true);
  assert.equal(estaBloqueado(lead, [{ operacao: "engenharia", telefone_e164: "+5511987654321" }]), false);
});

test("descadastro remove canais e muda a etapa", () => {
  const lead = aplicarDescadastro({ etapa: "novo", canal_autorizado: ["whatsapp"] });
  assert.equal(lead.nao_contatar, true);
  assert.equal(lead.etapa, "nao_contatar");
  assert.deepEqual(lead.canal_autorizado, []);
});

test("importação B2B recusa pessoa física", () => {
  assert.equal(linhaEhEmpresa({ nome: "Sr. João", empresa: "João", categoria: "particular" }), false);
  assert.equal(linhaEhEmpresa({ nome: "Maria", empresa: "Construtora Alfa", cnpj: "12.345.678/0001-90" }), true);
});

test("advocacia exige consentimento e nunca recebe conteúdo automático", () => {
  const validado = validarLead({
    operacao: "advocacia", fonte: "formulario", nome: "Ana", telefone: "11999998888",
    interesse: "guia educativo", consentimento: true, consentimento_texto: "Solicitei o guia",
  });
  assert.equal(validado.ok, true);
  assert.match(respostaAutomaticaSegura(validado.lead), /advogado responsável/i);
  assert.equal(podeReceberConteudo({ ...validado.lead, etapa: "novo", nao_contatar: false }, "whatsapp"), false);
});

test("lead sem consentimento é recusado", () => {
  const resultado = validarLead({
    operacao: "imobiliaria", fonte: "formulario", nome: "José", telefone: "11999998888",
    interesse: "comprar", consentimento: false,
  });
  assert.equal(resultado.ok, false);
  assert.ok(resultado.erros.includes("consentimento obrigatório"));
});

test("lead imobiliário autorizado pode receber conteúdo solicitado", () => {
  const lead = { operacao: "imobiliaria", nao_contatar: false, etapa: "contato_autorizado", canal_autorizado: ["whatsapp"] };
  assert.equal(podeReceberConteudo(lead, "whatsapp"), true);
});

test("CSV B2B limita a 30 empresas e preserva apenas linhas empresariais", () => {
  const linhas = ["empresa,nome,telefone,categoria"];
  for (let i = 0; i < 35; i += 1) {
    linhas.push(`Empresa ${i},Contato ${i},119${String(90000000 + i)},Construtora`);
  }
  linhas.push("Particular,Sr. João,11999998888,particular");
  const resultado = prepararImportacao(linhas.join("\n"), "engenharia");
  assert.equal(resultado.aceitos.length, 30);
  assert.ok(resultado.aceitos.every((lead) => lead.base_legal === "legitimo_interesse_b2b"));
});
