---
description: Cria plano detalhado de campanha Meta Ads para imóveis da Campos Figueira, incluindo objetivo, público-alvo, orçamento, criativos, textos e configuração de Special Ad Category HOUSING. Produz documento para aprovação humana — não executa nada.
---

# Skill: Criar Plano de Campanha Meta

## Objetivo
Estruturar um plano completo de campanha Meta Ads antes de qualquer execução na API. Garante que todas as decisões estratégicas sejam tomadas e documentadas, que a Special Ad Category HOUSING esteja incluída (obrigatório para imóveis), e que o plano passe por aprovação humana antes de qualquer criação.

## Gatilhos
- `/criar-plano-campanha-meta [tipo-imovel] [objetivo]`
- "Planejar campanha para apartamentos"
- "Criar plano de anúncio para casas em Mogi"
- "Estruturar campanha de captação de proprietários"

## Entradas
- **Tipo de imóvel:** casa, apartamento, comercial, terreno/lote, empreendimento
- **Objetivo:** leads (formulário), WhatsApp, conversão, awareness, tráfego
- **Orçamento diário:** em R$
- **Público-alvo:** descrição demográfica/psicográfica
- **Período:** data início e fim ou contínua
- **Criativos disponíveis:** fotos, vídeo, nenhum ainda

## Saídas
Documento markdown salvo em `campaigns/plano-[slug]-[data].md` com:
- Resumo executivo
- Configuração de campanha (objective, special_ad_categories)
- Configuração de conjunto de anúncios (público, posicionamento, orçamento)
- Configuração dos anúncios (criativos, textos, CTAs)
- Checklist de conformidade HOUSING
- Estimativas de performance
- Próximos passos para aprovação e execução

## Modo Dry-Run
Esta skill é sempre read-only — produz documento de plano, nunca executa API.

## Validações
1. Confirmar que Special Ad Category HOUSING está incluída
2. Verificar que targeting não usa parâmetros proibidos para housing
3. Confirmar orçamento mínimo Meta (R$6/dia por conjunto de anúncio)
4. Verificar que objetivo é compatível com tipo de imóvel

## Limitações
- Não cria campanhas — apenas o plano
- Estimativas de CPL são baseadas em benchmarks, não garantidas
- Criativos precisam ser criados separadamente

## Exemplos de Uso

### Exemplo 1: Campanha de leads para casas residenciais
```
/criar-plano-campanha-meta "casas" "leads" orçamento=R$50/dia público="compradores potenciais Mogi das Cruzes"
```

### Exemplo 2: Campanha WhatsApp para proprietários
```
/criar-plano-campanha-meta "proprietários" "whatsapp" orçamento=R$30/dia
```

### Exemplo 3: Campanha awareness para novo empreendimento
```
/criar-plano-campanha-meta "empreendimento lançamento" "awareness" orçamento=R$100/dia
```

## Estrutura do Plano de Campanha

### Seção 1: Resumo Executivo
- Nome da campanha
- Objetivo de negócio
- Período
- Orçamento total estimado
- KPIs principais (meta de CPL, leads esperados)

### Seção 2: Configuração da Campanha (nível Campaign)
```json
{
  "name": "CF - [Tipo] - [Objetivo] - [Mês/Ano]",
  "objective": "OUTCOME_LEADS" ou "OUTCOME_TRAFFIC" ou "OUTCOME_AWARENESS",
  "special_ad_categories": ["HOUSING"],
  "status": "PAUSED",
  "daily_budget": [valor em centavos]
}
```

### Seção 3: Conjuntos de Anúncios (Ad Sets)
- Público-alvo detalhado (respeitando restrições HOUSING)
- Posicionamentos recomendados
- Orçamento por conjunto
- Schedule (se aplicável)

### Seção 4: Anúncios (Ads)
- Criativos (especificações para imagem/vídeo)
- Texto principal (primary text)
- Título (headline)
- CTA
- URL de destino ou configuração de lead form/WhatsApp

### Seção 5: Checklist HOUSING
- [ ] special_ad_categories inclui "HOUSING"
- [ ] Sem targeting por raça, etnia, religião, gênero
- [ ] Sem targeting por CEP específico ou raio < 15 milhas
- [ ] Sem targeting por estado civil ou composição familiar
- [ ] Textos sem linguagem discriminatória
- [ ] Revisão de conformidade concluída

## Instruções para o Claude

1. Coletar todas as entradas necessárias — perguntar se faltarem
2. Definir nome padronizado: "CF - [Tipo Imóvel] - [Objetivo] - [MMM/AAAA]"
3. Selecionar objetivo Meta compatível:
   - Leads → OUTCOME_LEADS com Instant Form
   - WhatsApp → OUTCOME_LEADS com Message
   - Tráfego site → OUTCOME_TRAFFIC
   - Awareness → OUTCOME_AWARENESS ou OUTCOME_REACH
4. SEMPRE incluir special_ad_categories: ["HOUSING"] — sem exceção
5. Definir público respeitando restrições HOUSING:
   - Permitido: interesse em imóveis, comportamento de compra, idade mínima 18+
   - PROIBIDO: raça, religião, gênero, CEP, estado civil, situação familiar
   - Para Mogi das Cruzes: usar cidade + cidades vizinhas relevantes (Suzano, Poá, Guararema, Biritiba Mirim)
6. Calcular orçamento por conjunto: mínimo R$10/dia para testes, R$30-50/dia para escala
7. Estimar performance baseado em benchmarks: CTR ~1%, CPL ~R$30-50 para imóveis
8. Criar 2-3 variações de texto (para teste A/B)
9. Especificar criativos necessários com medidas corretas:
   - Feed Facebook/Instagram: 1080x1080px ou 1200x628px
   - Stories/Reels: 1080x1920px
   - Headline: máximo 40 caracteres
   - Primary text: máximo 125 caracteres para não ser cortado
10. Listar checklist de conformidade HOUSING completo
11. Adicionar estimativa de resultados com intervalo de confiança
12. Salvar plano em `campaigns/plano-[slug-campanha]-[YYYY-MM-DD].md`
13. Concluir com: "Este plano requer aprovação humana antes de qualquer execução via API"
14. Sugerir usar skill `/criar-pacote-aprovacao` como próximo passo
15. Não chamar nenhuma função de escrita na Meta API
