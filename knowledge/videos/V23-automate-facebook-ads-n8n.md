# V23 — How to Automate Facebook Ads with n8n

- Canal/Autor: Não identificado via pesquisa (possivelmente Madgicx ou canal de automação)
- URL: Não encontrado via pesquisa
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

O vídeo mostra como usar o n8n para automatizar o gerenciamento de Facebook Ads, indo além da simples coleta de dados para incluir ações automáticas baseadas em regras de performance. A automação de anúncios com n8n funciona em dois eixos: (1) análise e relatórios — puxar dados, processar com IA e enviar insights; (2) ações automáticas — pausar anúncios underperformers, aumentar orçamento de vencedores, criar novas variações.

O n8n se conecta à Meta Marketing API via Graph API e pode combinar dados de múltiplas fontes: Meta Ads + Google Analytics + CRM, criando uma visão consolidada da jornada do lead. Com nós de IA (OpenAI, Claude, Gemini), é possível gerar análises narrativas dos dados, não apenas números brutos.

A abordagem mais comum em 2025/2026 é o pipeline de creative testing automatizado: o n8n cria múltiplas variações de anúncios com criativos diferentes, monitora performance nos primeiros dias e escala automaticamente os vencedores, pausando os perdedores — replicando o trabalho que um especialista de mídia faria, mas de forma contínua e sem intervenção humana.

## Procedimento / Conceitos Principais

1. **Estruturar o workflow de relatório**:
   - Schedule Trigger (diário) → GET insights por campanha → filtrar/transformar dados → salvar no Sheets.
2. **Pipeline de creative testing**:
   - Trigger manual ou agendado → criar 3-5 variações de ad set com criativos diferentes → aguardar 3-7 dias.
3. **Regras de performance automatizadas**:
   - IF CTR < 1% AND gasto > R$50 → POST status: PAUSED para o ad set.
   - IF ROAS > 3x AND gasto < orçamento máximo → POST budget aumentado em 20%.
4. **Integração com IA para análise**:
   - Coletar métricas → nó Claude/OpenAI → prompt analítico → enviar relatório por email/Telegram.
5. **Alertas de anomalias**:
   - Comparar CPC hoje vs. média dos últimos 7 dias → se variação > 30%, enviar alerta via WhatsApp.
6. **Sincronização com CRM**:
   - Facebook Lead Ads trigger → n8n → inserir lead no CRM com UTMs e dados da campanha de origem.
7. **Gerenciamento de criativos cansados**:
   - Monitorar frequência de anúncio → se > 3, pausar e criar variação com novo criativo.
8. **Relatório de atribuição**:
   - Cruzar dados do Meta com dados do site (via Pixel ou GA4) para calcular atribuição real de conversões.
9. **Automação de aprovações**:
   - Quando n8n propõe mudança de orçamento, enviar aprovação via Telegram — aceitar ou rejeitar pelo bot.
10. **Backup de configurações**:
    - Exportar estrutura de campanhas periodicamente via API e salvar no Google Drive como backup.

## Conhecimentos Úteis

- A Meta não permite regras automáticas via API da mesma forma que o Ads Manager — toda ação automática precisa ser implementada na lógica do workflow n8n.
- O campo `insights` da API aceita `date_preset` (ex: `last_7d`, `last_30d`) ou datas específicas com `time_range`.
- Campos mais úteis para análise: `spend`, `impressions`, `reach`, `clicks`, `ctr`, `cpc`, `cpm`, `actions`, `cost_per_action_type`, `roas`.
- Para obter ROAS, precisa configurar conversões com valor no Pixel/CAPI antes de ter esse dado via API.
- O n8n tem nó "Filter" e "IF" para lógica condicional — essenciais para regras de otimização automática.
- Usar `Split in Batches` quando processar muitos ad sets de uma vez para evitar timeout e rate limits.
- Workflows complexos se beneficiam de subworkflows (n8n suporta chamada de workflow dentro de workflow).
- O Madgicx.com tem um guia específico sobre automação de Meta Ads com n8n documentando boas práticas.
- Combinar automação n8n com aprovação humana (ex: bot Telegram que pede confirmação) é o equilíbrio ideal.
- Templates recomendados do n8n: #6038 (creative testing), #2714 (insights → Sheets), #7957 (relatório conversacional com GPT).

## Aplicação no Campos Figueira

- **Gestão automatizada de campanhas**: Regras automáticas que pausam campanhas de imóveis já vendidos e ativam campanhas de novos imóveis captados.
- **Orçamento dinâmico**: Aumentar budget automaticamente nas semanas com mais buscas por imóveis em Mogi das Cruzes (ex: início de mês, sazonalidade).
- **Alerta de lead frio**: Se custo por lead superar R$40,00, alertar imediatamente via WhatsApp para revisão da campanha.
- **Creative testing para imóveis**: Testar automaticamente diferentes abordagens — foto do imóvel vs. vídeo tour vs. infográfico de preço/m².
- **Relatório executivo**: Todo domingo às 19h, enviar por WhatsApp para os sócios um resumo da semana: leads, investimento, imóveis com melhor performance.
- **Cruzamento com calendário**: Integrar com Google Calendar — em datas de plantão, aumentar orçamento automaticamente.

## Validação

- **Aprovado**: Automação de regras de performance via n8n é tecnicamente viável e amplamente usada.
- **Aprovado**: Templates prontos no n8n.io para Meta Ads poupam semanas de desenvolvimento.
- **Confirmar**: Limites de rate da API Meta para o volume de operações automáticas planejadas.
- **Aprovar com cuidado**: Ações automáticas de escala de orçamento devem ter teto máximo definido para evitar gastos excessivos.
- **Confirmar**: Como lidar com aprovação de anúncios (Review) que pode atrasar automações.

## Decisão por Ensinamento

APROVADO COM ADAPTAÇÕES — Automação de Facebook Ads com n8n é altamente recomendada para a Campos Figueira. Implementar com aprovação humana obrigatória para ações que aumentem gastos, e automação total para ações que pausem ou reduzam orçamento.
