---
name: criar-relatorio-semanal
description: Gera relatório semanal de marketing digital com métricas de Instagram, Facebook orgânico, Meta Ads, leads gerados e ações recomendadas para a próxima semana.
---
# /criar-relatorio-semanal — Relatório Semanal

## Estrutura do Relatório

```markdown
# Relatório de Marketing — Semana [X] — [DATA]
## Escritório Campos Figueira

### 📱 Instagram
- Alcance: [N] (+/-X% vs semana anterior)
- Impressões: [N]
- Seguidores novos: +[N] (total: [N])
- Post com melhor desempenho: [título] — [alcance]
- Taxa de engajamento: [X]%

### 📘 Facebook Orgânico
- Impressões: [N]
- Cliques: [N] (CTR: [X]%)
- Reações: [N]

### 📣 Meta Ads (Campanhas Pagas)
- Gasto total: R$ [valor]
- Impressões: [N]
- Leads gerados: [N]
- CPL médio: R$ [valor]
- Campanha com melhor CPL: [nome]

### 🏠 Leads e Negócios
- Total de leads: [N]
- Leads qualificados: [N]
- Visitas agendadas: [N]
- Negócios em andamento: [N]

### 🔴🟡🟢 Diagnóstico
[semáforo por área com principais alertas]

### 📋 Ações para Próxima Semana
1. [ação prioritária]
2. [ação 2]
3. [ação 3]
```

## Fontes de Dados
- Windsor.ai: Instagram e Facebook orgânico
- Meta Ads Manager: campanhas pagas
- CRM/Sheets: leads e negócios

## Frequência
Todo domingo às 20h ou segunda-feira às 08h.
Automação via n8n + Windsor.ai + notificação WhatsApp.
