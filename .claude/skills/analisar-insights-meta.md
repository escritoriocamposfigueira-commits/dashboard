---
description: Analisa CTR, CPC, CPL, ROAS e outras métricas de campanhas Meta Ads, identifica melhores e piores resultados e gera recomendações acionáveis para o Escritório Campos Figueira
---

# Skill: Analisar Insights Meta

## Objetivo
Esta skill busca e analisa métricas de desempenho das campanhas Meta Ads da Campos Figueira. Vai além da simples listagem de dados: aplica benchmarks do setor imobiliário brasileiro, identifica padrões de performance, destaca os criativos e audiências com melhor custo-benefício e gera recomendações priorizadas para otimização. O objetivo é transformar números brutos em decisões estratégicas — saber não apenas como está, mas o que fazer a seguir para reduzir CPL e aumentar a qualidade dos leads para imóveis em Mogi das Cruzes.

## Gatilhos
- `/analisar-insights-meta [período] [campanha]`
- `/insights-meta [período]`
- "analisar performance das campanhas Meta"
- "como estão os anúncios? últimos [N] dias"
- "qual campanha está performando melhor?"
- "comparar CPC das campanhas"
- "qual criativo está gerando mais leads?"

## Entradas
- **Opcional:** Período de análise (padrão: últimos 7 dias | aceita: 7d, 14d, 30d, mês específico)
- **Opcional:** Nome ou ID de campanha específica
- **Opcional:** Nível de análise (campanha / ad set / criativo)
- **Opcional:** Métrica de foco (ex: "foco em CPL", "foco em ROAS")
- **Opcional:** Comparação de período (ex: "comparar com mês anterior")

## Saídas
- Dashboard de métricas formatado em markdown
- Ranking de campanhas por CPL (custo por lead)
- Ranking de criativos por CTR e taxa de conversão
- Comparação com benchmarks do setor imobiliário
- Análise de tendência: melhorando ou piorando vs período anterior
- Top 3 oportunidades de otimização identificadas
- Top 3 problemas que precisam de ação imediata
- Estimativa de impacto das recomendações

## Modo Dry-Run
Esta skill é exclusivamente de leitura e análise. Não executa nenhuma ação na conta Meta Ads. Apresenta análise e recomendações, mas aguarda aprovação explícita antes de sugerir executar qualquer modificação via outras skills.

## Validações
- Confirmar que o período solicitado tem dados disponíveis (Meta retorna até 37 meses)
- Verificar que pelo menos uma campanha ativa existe no período
- Confirmar acesso ao MCP Windsor.ai antes de iniciar
- Alertar se o volume de dados for insuficiente para análise estatística confiável (menos de 1.000 impressões)
- Identificar campanhas com zero gasto no período mas marcadas como ativas

## Fontes
- MCP Windsor.ai: `get_data` com conector `facebook`
- Métricas disponíveis: impressions, clicks, spend, ctr, cpc, cpm, cpp, reach, frequency, leads, cost_per_lead, actions, action_values, roas
- Benchmarks do setor: CPL imobiliário Brasil R$30-R$120, CTR Meta 0,9%-2,5%, CPC Facebook R$1,50-R$6,00

## Limitações
- Dados de conversão têm delay de até 48h (especialmente conversões offline)
- Atribuição padrão Meta: 7-day click, 1-day view (pode não refletir funil real)
- Dados de audiência são anonimizados (HOUSING policy restringe breakdowns demográficos)
- Métricas de qualidade de lead (se lead virou cliente) precisam de CRM externo
- ROAS só disponível se pixel e conversões estiverem configurados corretamente

## Exemplos de Uso

### Exemplo 1: Análise Semanal Geral
**Comando:** `/analisar-insights-meta 7d`
**Contexto:** Reunião semanal de resultados — visão geral de todas as campanhas ativas

Métricas coletadas e analisadas:
- Gasto total: R$2.847 nos últimos 7 dias
- Leads gerados: 43 leads totais
- CPL médio: R$66,20
- CTR médio: 1,23%
- Campanha destaque: "Apartamentos 2Q Centro" — CPL R$38 (benchmark: ótimo)
- Campanha problema: "Casas Condomínio Leste" — CPL R$142 (benchmark: ruim)

Recomendação gerada: Realocar 30% do orçamento de "Casas Condomínio Leste" para "Apartamentos 2Q Centro" — projeção de economia de R$45 por lead mantendo mesmo volume.

### Exemplo 2: Comparar CPC Entre Ad Sets
**Comando:** `/analisar-insights-meta 30d "Apartamentos 2Q Centro" ad-set`
**Contexto:** Entender qual segmentação está gerando melhor custo por clique para otimizar o ad set

Análise por ad set:
- Ad Set "Interesse em imóveis": CPC R$2,10, CTR 1,8%, CPL R$35
- Ad Set "Lookalike 1% compradores": CPC R$3,20, CTR 2,4%, CPL R$29
- Ad Set "Retargeting visitantes site": CPC R$1,80, CTR 3,1%, CPL R$22

Recomendação: Aumentar budget do ad set de retargeting (menor CPL), pausar ad set de interesse amplo.

### Exemplo 3: Identificar Melhor Criativo
**Comando:** `/analisar-insights-meta 14d criativo`
**Contexto:** Descobrir qual imagem ou vídeo gera mais engajamento e leads

Análise por criativo:
- Vídeo tour apartamento 3Q: CTR 2,8%, CPL R$31 — MELHOR PERFORMER
- Imagem estática fachada: CTR 0,9%, CPL R$89 — PIOR PERFORMER
- Carrossel fotos internas: CTR 1,6%, CPL R$54 — MÉDIO

Recomendação: Criar mais vídeos de tour. Pausar imagens estáticas de fachada.

## Instruções para o Claude

Quando esta skill for invocada, siga estes passos:

1. **Confirmar parâmetros:** Identificar período (padrão 7 dias se não especificado), campanha específica ou todas, nível de análise (campanha/ad set/criativo), e métrica de foco se fornecida.

2. **Verificar autenticação:** Confirmar que o MCP Windsor.ai está disponível. Se não estiver, informar como configurar.

3. **Coletar métricas do período atual:** Usar `get_data` do Windsor.ai com conector `facebook` para coletar todas as métricas disponíveis do período solicitado. Especificar o date_range correto.

4. **Coletar métricas do período anterior:** Para comparação, coletar o mesmo período imediatamente anterior (ex: se pediu últimos 7 dias, coletar os 7 dias anteriores a esses). Isso permite calcular tendência.

5. **Organizar dados por nível:** Estruturar dados no nível solicitado: campanha, ad set ou criativo. Calcular totais e médias para cada nível.

6. **Calcular métricas derivadas:** Além das métricas brutas, calcular:
   - Taxa de conversão (cliques → leads)
   - Custo por resultado (CPL ou CPC conforme objetivo)
   - Variação percentual vs período anterior
   - Eficiência de orçamento (% do orçamento utilizado)

7. **Aplicar benchmarks do setor imobiliário:** Para cada métrica, classificar a performance em relação a benchmarks conhecidos do mercado imobiliário brasileiro:
   - CPL Excelente: < R$40 | Bom: R$40-70 | Regular: R$70-100 | Ruim: > R$100
   - CTR Excelente: > 2% | Bom: 1-2% | Regular: 0,5-1% | Ruim: < 0,5%
   - CPC Excelente: < R$2 | Bom: R$2-4 | Regular: R$4-7 | Ruim: > R$7
   - Frequência Ideal: 2-4 | Alta: > 5 (possível fadiga)

8. **Identificar top performers:** Listar as 3 campanhas/ad sets/criativos com melhor performance nas métricas mais relevantes. Para cada um, identificar o que está funcionando.

9. **Identificar problemas:** Listar as 3 campanhas/ad sets/criativos com pior performance. Para cada um, identificar a provável causa do problema.

10. **Analisar tendências:** Comparar período atual vs anterior. Identificar: melhorando, estável ou piorando. Calcular variação percentual nas métricas principais.

11. **Verificar gasto de orçamento:** Identificar campanhas que estão entregando abaixo de 80% do orçamento disponível (possível problema de aprovação de anúncios, audiência muito restrita, ou lance muito baixo).

12. **Verificar fadiga de audiência:** Campanhas com frequência > 5 estão possivelmente sofrendo fadiga de audiência. Recomendar expansão de audiência ou novos criativos.

13. **Gerar recomendações priorizadas:** Com base na análise, gerar 3-5 recomendações ordenadas por impacto esperado. Cada recomendação deve incluir: ação específica, métrica que vai melhorar, estimativa de impacto, e qual skill usar para executar.

14. **Formatar o dashboard de métricas:** Estruturar em markdown com:
    - Resumo executivo (3 linhas)
    - Tabela de campanhas com métricas e classificação de performance
    - Gráfico textual de tendência (↑ ↓ → com percentual)
    - Seção de alertas (campanhas problemáticas)
    - Seção de destaques (campanhas com excelente performance)
    - Recomendações priorizadas

15. **Apresentar análise completa:** Exibir todo o dashboard no terminal.

16. **Perguntar sobre ações:** "Com base nesta análise, posso: (a) criar um plano de otimização detalhado com `/criar-plano-campanha-meta`, (b) pausar campanhas com baixa performance (requer aprovação), ou (c) gerar um relatório para compartilhar com o cliente?"

17. **Se solicitar otimização:** Não executar nenhuma ação diretamente. Detalhar o plano, mostrar o impacto estimado, e só então perguntar se pode executar usando as skills apropriadas.

18. **Formatar para compartilhamento:** Se o usuário quiser compartilhar com o cliente, gerar versão simplificada do relatório sem dados sensíveis de configuração (sem IDs internos, sem detalhes de bid strategy).

19. **Salvar análise:** Perguntar se quer salvar a análise em `/knowledge/analises/[data]-insights-meta.md`.

20. **Agendar próxima análise:** Sugerir periodicidade de análise baseada no volume de gasto: gasto > R$5.000/mês → análise semanal; R$1.000-5.000 → quinzenal; < R$1.000 → mensal.
