---
name: criar-pacote-aprovacao
description: >
  Gera pacote completo de aprovação antes de qualquer ação externa no Meta Ads
  ou publicação de conteúdo. Lista exatamente o que será executado, impacto
  financeiro, riscos e plano de reversão. OBRIGATÓRIO antes de publicar,
  pausar, criar campanha ou alterar orçamento.
---

# /criar-pacote-aprovacao — Pacote de Aprovação

## Objetivo
Garantir que o usuário veja e aprove TUDO antes de qualquer ação que:
- Gaste dinheiro (campanhas, orçamentos)
- Publique conteúdo (posts, anúncios)
- Altere estado (pausar, ativar, excluir)
- Envie mensagens (WhatsApp, e-mail)

## Template do Pacote

```markdown
═══════════════════════════════════════════════
   PACOTE DE APROVAÇÃO — [AÇÃO] — [DATA]
═══════════════════════════════════════════════

## 🎯 Objetivo
[O que esta ação vai alcançar]

## 📋 O Que Será Executado
[Lista exata de cada ação, na ordem em que será executada]
1. [Ação 1]
2. [Ação 2]
...

## 💰 Impacto Financeiro
- Orçamento diário: R$ [valor]
- Duração: [X] dias
- Gasto máximo total: R$ [valor]
- Impacto em campanhas existentes: [nenhum / descrever]

## 👥 Público Afetado
- Estimativa de alcance: [faixa]
- Segmentação: [descrever]
- Special Ad Category: [se aplicável]

## 📝 Conteúdo / Textos
[Exatamente o que será publicado]

## ⚠️ Riscos Identificados
- [Risco 1]: [mitigação]
- [Risco 2]: [mitigação]

## ✅ Checklist de Conformidade
☐ Special Ad Category verificada (se imóvel)
☐ LGPD: dados usados com base legal
☐ Textos sem informações falsas
☐ Orçamento dentro do aprovado
☐ Meta Policies verificadas

## 🔄 Plano de Reversão
Se algo der errado:
1. [Como desfazer ação 1]
2. [Como desfazer ação 2]
Tempo estimado para reversão: [X minutos]

## 📌 Comandos que Serão Executados
\`\`\`
[código / API calls que serão feitos]
\`\`\`

═══════════════════════════════════════════════
⏳ AGUARDANDO APROVAÇÃO EXPLÍCITA
   Responda: APROVAR para executar | CANCELAR para abortar
═══════════════════════════════════════════════
```

## Exemplos de Uso
1. "quero ativar a campanha de vendas" → gera pacote antes de ativar
2. "aumenta o orçamento para R$100/dia" → gera pacote com impacto financeiro
3. "publica todos os posts agendados" → lista cada post antes de publicar

## Limitações
- Sem aprovação explícita ("APROVAR"), nada é executado
- Aprovação vale apenas para a ação específica descrita
- Nova ação = novo pacote de aprovação
