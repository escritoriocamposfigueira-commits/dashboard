---
name: criar-calendario-conteudo
description: >
  Cria calendário editorial completo para Instagram e Facebook do Escritório
  Campos Figueira. Define datas, horários, formatos, temas e captions para
  o período solicitado. Use para: planejar posts, calendário mensal, agenda
  de conteúdo, programação de publicações.
---

# /criar-calendario-conteudo — Calendário Editorial

## Objetivo
Montar calendário de conteúdo equilibrado entre venda, locação, conteúdo
educativo e institucional — com horários e formatos otimizados.

## Mix de Conteúdo Recomendado (por semana)
- 40% VENDA — imóveis à venda com copy emocional
- 25% LOCAÇÃO — imóveis para alugar
- 20% CONTEÚDO EDUCATIVO — dicas, processos, regularização, engenharia
- 15% INSTITUCIONAL — bastidores, equipe, conquistas, depoimentos

## Horários de Melhor Desempenho (Instagram/Facebook)
- 🕘 09:00 — maior alcance orgânico (segunda a sexta)
- 🕕 18:00 — segundo melhor horário (todos os dias)
- 🕙 20:00 — opcional para reels e stories

## Formatos por Dia
- Segunda: Imóvel Destaque (imagem + copy longo)
- Terça: Conteúdo Educativo (carrossel ou reel)
- Quarta: Imóvel à Venda (imagem única ou vídeo)
- Quinta: Dica/Processo (carrossel informativo)
- Sexta: Imóvel Locação + CTA fim de semana
- Sábado: Bastidores / Institucional (opcional)
- Domingo: Reels motivacional / história de cliente (opcional)

## Coleta de Informações
1. Período: quantas semanas / mês específico?
2. Imóveis disponíveis: lista ou puxar do calendário existente?
3. Fotos disponíveis por imóvel?
4. Eventos locais relevantes no período?
5. Promoções ou condições especiais?

## Saída
Tabela markdown + JSON exportável:
```
| Data | Hora | Formato | Tipo | Ref | Imóvel | Caption | Status |
```

## Exemplos de Uso
1. "cria calendário de agosto" → gera 40+ posts para agosto
2. "planejamento de conteúdo para as próximas 2 semanas" → 14 posts detalhados
3. "quanto conteúdo devo postar por semana?" → recomendação com justificativa

## Limitações
- Calendário criado para aprovação — não publica automaticamente
- Requer lista de imóveis disponíveis para posts de venda/locação
