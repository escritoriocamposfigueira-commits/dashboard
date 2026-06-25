---
description: Audita conta Meta Ads em modo estritamente leitura — NUNCA modifica, pausa, cria ou altera qualquer dado. Gera relatório completo de campanhas, orçamentos e performance.
---

# Skill: Auditar Conta Meta (READ-ONLY)

## Objetivo
Esta skill realiza uma auditoria completa da conta Meta Ads do Escritório Campos Figueira em modo exclusivamente leitura. Utiliza o MCP Windsor.ai ou a Meta Marketing API para ler dados de campanhas ativas, orçamentos, métricas de performance e configurações de segmentação. Produz um relatório estruturado em markdown com diagnóstico do estado atual da conta. É a skill de diagnóstico — deve ser executada antes de qualquer ação de criação ou modificação para garantir que as decisões sejam baseadas em dados reais e atuais.

**AVISO CRÍTICO: Esta skill NUNCA executa ações de escrita. Se qualquer chamada de API retornar erro de permissão de escrita, isso confirma que está operando corretamente em modo read-only.**

## Gatilhos
- `/auditar-conta-meta`
- `/auditar-conta-meta [período]` (ex: últimos 30 dias)
- `/auditar-conta-meta [campanha específica]`
- "auditar conta Meta"
- "ver estado das campanhas Meta"
- "relatório de campanhas ativas"
- "como estão as campanhas?"

## Entradas
- **Opcional:** Período de análise (padrão: últimos 30 dias)
- **Opcional:** Nome ou ID de campanha específica para foco detalhado
- **Opcional:** Métricas específicas de interesse (ex: "foco em CPL", "foco em orçamento")
- **Opcional:** Nível de detalhe (resumo / completo / detalhado)

## Saídas
- Relatório completo em markdown com:
  - Lista de todas as campanhas ativas com status e objetivo
  - Orçamentos diários e totais por campanha
  - Métricas de performance: impressões, cliques, CTR, CPC, CPL, gasto total
  - Segmentação configurada por campanha (sem revelar dados sensíveis)
  - Verificação de conformidade com Special Ad Category HOUSING
  - Alertas sobre campanhas com performance abaixo da média
  - Campanhas pausadas recentemente (últimos 7 dias)
  - Resumo de gastos do período

## Modo Dry-Run
Esta skill é SEMPRE em modo leitura. Não existe modo de escrita. Antes de executar qualquer chamada de API, exibe ao usuário: "Vou executar uma auditoria em MODO LEITURA. Nenhuma modificação será feita na conta. Confirma? (sim/não)"

## Validações
**ANTES de executar qualquer chamada:**
1. Confirmar com o usuário que o objetivo é apenas leitura
2. Verificar que o MCP Windsor.ai está conectado e autenticado
3. Confirmar que apenas ações de leitura serão utilizadas (get_data, get_fields)
4. Verificar que o Ad Account ID está configurado corretamente
5. Confirmar período de análise desejado

**NUNCA executar:**
- execute_action com qualquer parâmetro de criação ou modificação
- Chamadas de API com método POST, PUT, PATCH ou DELETE
- Qualquer função que contenha "create", "update", "delete", "pause", "enable" no nome

## Fontes
- MCP Windsor.ai: ferramentas `get_data` e `get_fields` para Meta Ads
- Meta Marketing API v22.0 (leitura via Windsor.ai)
- Dados do Ad Account configurado no projeto
- Métricas: impressões, cliques, gasto, CPM, CPC, CTR, CPL, ROAS, frequência

## Limitações
- Acesso somente leitura — não pode modificar nada
- Dados podem ter delay de 24-48h para métricas de conversão
- Não acessa dados de contas de outras agências
- Não acessa dados históricos além de 37 meses
- Criativas (imagens/vídeos) não são baixadas, apenas referenciadas
- Dados de atribuição dependem das configurações de pixel da conta

## Exemplos de Uso

### Exemplo 1: Auditoria Completa Mensal
**Comando:** `/auditar-conta-meta`
**Contexto:** Revisão mensal de todas as campanhas antes de reunião de resultados com o cliente

Dados coletados via Windsor.ai MCP:
- Todas as campanhas ativas e pausadas (últimos 30 dias)
- Gasto total do período por campanha
- CTR, CPC e CPL de cada campanha
- Alcance e frequência por campanha
- Status de conformidade HOUSING

Relatório gerado:
```
## Auditoria Meta Ads — Campos Figueira
**Data:** 2026-06-25 | **Período:** 01/06 a 25/06/2026

### Campanhas Ativas (3)
| Campanha | Objetivo | Status | Gasto | CPL |
|----------|----------|--------|-------|-----|
| Apartamentos Centro | Lead Gen | ATIVO | R$1.847 | R$42 |
| Casas Bairro Junção | Lead Gen | ATIVO | R$923 | R$67 |
| Terrenos Mogi | Awareness | ATIVO | R$412 | — |

### Alertas
⚠️ Campanha "Casas Bairro Junção": CPL 60% acima da meta
✅ Todas as campanhas imobiliárias com HOUSING configurado
```

### Exemplo 2: Auditoria de Campanha Específica
**Comando:** `/auditar-conta-meta "Apartamentos Centro"`
**Contexto:** Análise detalhada de uma campanha específica antes de ajuste de orçamento

Dados coletados: todos os ad sets da campanha, performance por criativo, horários de melhor performance, breakdown demográfico permitido (sem dados protegidos pela HOUSING policy).

### Exemplo 3: Auditoria de Orçamentos
**Comando:** `/auditar-conta-meta últimos 7 dias orçamentos`
**Contexto:** Verificação semanal de orçamentos para evitar gastos excessivos

Relatório focado em: gasto diário vs orçamento diário, projeção de gasto para o fim do mês, campanhas próximas de esgotar orçamento.

## Instruções para o Claude

Quando esta skill for invocada, siga estes passos rigorosamente:

1. **CONFIRMAÇÃO OBRIGATÓRIA ANTES DE QUALQUER AÇÃO:** Exibir a seguinte mensagem ao usuário e aguardar resposta: "Vou executar uma auditoria em MODO ESTRITAMENTE LEITURA da conta Meta Ads da Campos Figueira. Nenhuma campanha será criada, modificada ou pausada. Confirma? (sim/não)". Só prosseguir se a resposta for afirmativa.

2. **Verificar autenticação do MCP:** Confirmar que o MCP Windsor.ai está disponível e autenticado. Se não estiver, informar ao usuário como configurá-lo antes de prosseguir.

3. **Identificar o Ad Account:** Usar `get_fields` do Windsor.ai para identificar o Ad Account ID da Campos Figueira. Confirmar com o usuário que é a conta correta antes de prosseguir.

4. **Registrar escopo da auditoria:** Anotar: período selecionado (padrão 30 dias), campanhas específicas de interesse (se fornecidas), métricas de foco (se especificadas).

5. **Coletar lista de campanhas:** Usar `get_data` com o conector `facebook` para listar TODAS as campanhas do período. Coletar: campaign_id, campaign_name, status, objective, created_time, start_time.

6. **Verificar conformidade HOUSING:** Para cada campanha ativa, verificar se a propriedade `special_ad_categories` inclui "HOUSING". Campanhas imobiliárias sem HOUSING devem ser marcadas como ALERTA CRÍTICO no relatório — mas NÃO modificadas por esta skill.

7. **Coletar métricas de performance:** Para cada campanha, usar `get_data` para coletar: impressions, clicks, spend, ctr, cpc, cpp, cpm, reach, frequency. Filtrar pelo período selecionado.

8. **Coletar dados de Ad Sets:** Para campanhas relevantes, coletar: número de ad sets ativos, orçamentos individuais, segmentação configurada (verificar ausência de targeting proibido).

9. **Coletar dados de Ads individuais:** Para campanhas de destaque (melhor e pior performance), coletar dados dos anúncios individuais para identificar criativos mais eficientes.

10. **Calcular métricas agregadas:** Calcular totais e médias do período: gasto total, CPC médio, CTR médio, CPL médio (se lead gen), alcance total, frequência média.

11. **Identificar anomalias:** Campanhas com CPL > 2x a média, campanhas com CTR < 0,5%, campanhas que pararam de entregar sem serem pausadas, campanhas com frequência > 3 (possível fadiga de audiência).

12. **Gerar seção de alertas:** Priorizar alertas em: CRÍTICO (conformidade legal, orçamento esgotado), ALTO (performance muito abaixo da meta), MÉDIO (oportunidade de otimização), INFORMATIVO (observações gerais).

13. **Formatação do relatório:** Estruturar o relatório em markdown com:
    - Cabeçalho: data, período, conta auditada
    - Resumo executivo (5 linhas máximo)
    - Alertas (do mais crítico ao menos crítico)
    - Tabela de campanhas ativas com métricas principais
    - Detalhamento por campanha (se solicitado)
    - Gasto do período e projeção
    - Conformidade HOUSING: status de cada campanha
    - Recomendações (sem executar nada)

14. **Seção de recomendações (sem executar):** Listar as 3-5 ações recomendadas com base na auditoria. Para cada recomendação, indicar qual skill deve ser usada para executá-la e pedir aprovação explícita antes de qualquer ação.

15. **Apresentar relatório completo:** Exibir o relatório completo no terminal. Não salvar automaticamente.

16. **Perguntar sobre salvamento:** "Quer salvar este relatório de auditoria? Posso salvar em `/knowledge/auditorias/[data]-auditoria-meta.md`"

17. **Perguntar sobre próximas ações:** "Com base nesta auditoria, quer que eu: (a) analise os insights em detalhe com `/analisar-insights-meta`, (b) crie um plano de otimização, ou (c) apenas use estes dados como contexto?"

18. **NUNCA oferecer executar ações de escrita:** Se o usuário sugerir modificar algo durante a auditoria, responder: "Esta skill é somente leitura. Para fazer alterações, use as skills `/criar-campanha-habitacao` (novas campanhas) ou `/analisar-insights-meta` seguido de aprovação explícita."

19. **Registrar timestamp:** Sempre incluir data e hora exata da auditoria no relatório para rastreabilidade.

20. **Verificação final de segurança:** Antes de encerrar, confirmar ao usuário: "Auditoria concluída em modo READ-ONLY. Nenhuma modificação foi feita na conta Meta Ads."
