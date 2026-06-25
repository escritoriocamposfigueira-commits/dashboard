---
name: criar-alertas-diarios
description: Configura e dispara alertas diários automáticos para anomalias nas campanhas Meta Ads — gasto acima do previsto, CTR caindo, CPL aumentando, leads parando.
---
# /criar-alertas-diarios — Alertas Diários

## Alertas Críticos (WhatsApp imediato)
🔴 Gasto diário > 120% do orçamento previsto
🔴 Zero leads em 24h com campanha ativa
🔴 CTR < 0,3% por 2 dias consecutivos
🔴 Campanha pausada inesperadamente (pela Meta)

## Alertas de Atenção (relatório diário)
🟡 CPL > R$ 50 (meta: < R$ 30)
🟡 Frequência > 3,5 (fadiga de criativo)
🟡 Nenhum post orgânico publicado no dia
🟡 Score de qualidade do lead Ads caindo

## Alertas Positivos (celebrar)
🟢 Dia com mais de 5 leads
🟢 Post orgânico com alcance > 500
🟢 CPL abaixo de R$ 20

## Configuração via n8n
Cron: todo dia às 08:00
→ Buscar métricas do dia anterior via Meta API
→ Comparar com limites configurados
→ Gerar mensagem formatada
→ Enviar WhatsApp para (11) 2378-5643
