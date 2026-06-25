---
name: qualificar-lead-imovel
description: >
  Define o roteiro de qualificação de leads imobiliários via WhatsApp ou
  formulário. Classifica por interesse, urgência e capacidade financeira.
  Use para: triagem de leads, qualificar interessado, script de atendimento,
  perguntas de qualificação.
---

# /qualificar-lead-imovel — Qualificação de Lead Imobiliário

## Objetivo
Criar roteiro estruturado para qualificar leads rapidamente e direcionar
o atendimento humano com contexto completo.

## Critérios de Qualificação (BANT adaptado para imóveis)

```
B — Budget (Orçamento): faixa de valor que pode investir?
A — Authority (Autoridade): é o decisor? cônjuge/sócio precisam participar?
N — Need (Necessidade): comprar, alugar, investir, regularizar?
T — Timeline (Prazo): urgência — imediato, 3 meses, 6 meses, 1 ano?
```

## Script WhatsApp (resposta ao lead)

**Mensagem de boas-vindas (automática):**
```
Olá! Recebemos seu interesse. Sou do Escritório Campos Figueira 🏠

Para te ajudar melhor, me conta:

1. O imóvel é para morar ou investir?
2. Qual região de Mogi das Cruzes prefere?
3. Você já tem aprovação de crédito ou prefere simular?

Estou aqui! 😊
```

**Qualificação por tipo de lead:**

VENDA:
- "Você já tem entrada disponível?"
- "Prefere financiar pela Caixa ou banco privado?"
- "Tem algum imóvel para dar como parte do pagamento?"

LOCAÇÃO:
- "Quantas pessoas vão morar?"
- "Precisa de vaga de garagem?"
- "Qual data pretende entrar?"

CAPTAÇÃO (proprietário):
- "O imóvel está ocupado ou vazio?"
- "Prefere vender, alugar ou as duas opções?"
- "Tem documentação completa e atualizada?"

## Classificação do Lead

```
🟢 QUENTE: orçamento definido + prazo curto + decisor confirmado
🟡 MORNO: interesse claro mas prazo longo ou orçamento indefinido
🔴 FRIO: apenas pesquisa, sem urgência, sem capacidade confirmada
⚪ INVÁLIDO: número errado, sem resposta, concorrente
```

## Handoff para Atendimento Humano
Quando encaminhar:
- Lead QUENTE → atendimento imediato (< 5 minutos)
- Lead com pergunta técnica (financiamento, regularização)
- Lead que pede visita
- Lead MORNO após 2ª mensagem automática

**Formato de handoff:**
```
LEAD: [nome]
TELEFONE: [número]
INTERESSE: [venda/locação/captação]
IMÓVEL REF: [se especificou]
SCORE: [QUENTE/MORNO/FRIO]
CONTEXTO: [resumo da conversa]
PRÓXIMO PASSO: [ação recomendada]
```

## Exemplos de Uso
1. "como qualificar leads do formulário do Facebook?" → roteiro completo
2. "script de WhatsApp para leads de imóvel" → mensagens prontas
3. "como classificar se o lead é bom?" → matriz de qualificação

## Limitações
- Automação de WhatsApp requer integração adicional (n8n + WhatsApp Business)
- Este script é para atendimento humano ou semi-automático
