---
name: criar-campanha-habitacao
description: >
  Cria plano completo de campanha Meta Ads para imóveis com Special Ad Category
  HOUSING obrigatória. Inclui objetivo, público permitido, criativos, textos,
  orçamento e pacote de aprovação. Use para: venda de imóvel, locação,
  lançamento, captação. NUNCA publica sem aprovação explícita.
---

# /criar-campanha-habitacao — Campanha Imobiliária Meta Ads

## Objetivo
Montar pacote completo de campanha para imóvel específico, já com
Special Ad Category HOUSING configurada e textos persuasivos aprovados.

## Regra Obrigatória
Toda campanha imobiliária DEVE usar `special_ad_categories: ["HOUSING"]`.
Isso limita segmentação por idade, gênero e raio geográfico mínimo.
Nunca tente contornar — é política da Meta e lei (Fair Housing Act / Brasil).

## Coleta de Informações

Antes de montar a campanha, confirme:
1. Tipo: Venda / Locação / Captação de proprietário
2. Imóvel: endereço, bairro, cidade
3. Valor ou faixa de valor
4. Diferenciais: quartos, garagem, área, churrasqueira etc.
5. Objetivo principal: leads via WhatsApp / formulário / ligação
6. Orçamento diário disponível (R$)
7. Duração da campanha (dias)
8. Foto(s) disponível(is)? URL(s) públicas?

## Estrutura da Campanha

```
CAMPANHA
├── Nome: "CF — [TIPO] — [BAIRRO] — [MÊS/ANO]"
├── Objetivo: OUTCOME_LEADS
├── Special Ad Category: HOUSING
├── Orçamento diário: R$ [valor]
└── Status inicial: PAUSADA

CONJUNTO DE ANÚNCIOS
├── Nome: "CF — [TIPO] — Mogi das Cruzes — [PÚBLICO]"
├── Localização: Mogi das Cruzes + 40km
├── Idade: sem restrição (obrigatório com HOUSING)
├── Gênero: todos (obrigatório com HOUSING)
├── Interesses: imóveis, financiamento, mudança, família
├── Otimização: LEAD_GENERATION
└── Orçamento: herdado da campanha

ANÚNCIO
├── Formato: imagem única ou carrossel
├── Texto principal: [copy persuasivo — dor/desejo/urgência]
├── Título: [chamada direta]
├── CTA: WHATSAPP_MESSAGE ou LEARN_MORE
└── Destino: WhatsApp (11) 2378-5643 ou formulário Lead Ads
```

## Template de Copy

**Hook (1ª linha — dor ou desejo):**
Opções por tipo:
- Venda: "Você ainda paga aluguel todo mês sem nada para mostrar?"
- Locação: "Precisa de um espaço que caiba sua família de verdade?"
- Captação: "Seu imóvel parado pode render dinheiro todo mês."

**Desenvolvimento (benefícios reais do imóvel):**
✅ [característica 1]
✅ [característica 2]
✅ [característica 3]

**Urgência real (sem inventar):**
Apenas se houver: "Última unidade disponível" / "Preço válido até [data confirmada]"

**CTA:**
"Manda '[PALAVRA-CHAVE]' no WhatsApp agora: 📱 (11) 2378-5643"

## Pacote de Aprovação (gerado ao final)

```markdown
# PACOTE DE APROVAÇÃO — [NOME DA CAMPANHA]
- Objetivo: [...]
- Special Ad Category: HOUSING ✅
- Público: Mogi das Cruzes +40km, todos os públicos
- Orçamento diário: R$ [valor]
- Duração: [dias] dias — Total máximo: R$ [total]
- CTA: [WhatsApp/Formulário]
- Textos: [listados abaixo]
- Imagem: [URL confirmada]
- Riscos: [identificados]
- Checklist: [itens verificados]
AGUARDA APROVAÇÃO EXPLÍCITA ANTES DE CRIAR
```

## Exemplos de Uso
1. "cria campanha para o sobrado do Jardim Ivete R$ 550mil" → monta pacote completo
2. "quero anunciar locação do apartamento" → coleta dados e monta campanha
3. "campanha de captação de proprietários" → adapta copy e público

## Limitações
- Não publica sem aprovação humana explícita
- Não inventa preços, condições ou características
- Não promete aprovação de financiamento
