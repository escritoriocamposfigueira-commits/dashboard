# V20 — Create and Update Facebook Ads with an API Graph API

- Canal/Autor: Não identificado via pesquisa
- URL: Não encontrado via pesquisa
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

O vídeo é um guia técnico sobre como criar e atualizar anúncios no Facebook diretamente via Graph API (Marketing API). A Marketing API da Meta é uma coleção de endpoints do Graph API que permite gerenciar anúncios programaticamente — criando, atualizando e excluindo campanhas, conjuntos de anúncios e anúncios individuais.

A versão atual é a v25.0 (2026), que trouxe mudanças relevantes em relação a versões anteriores. O Graph API segue uma arquitetura de grafo onde cada objeto publicitário (campanha, conjunto, anúncio, criativo) é um nó com propriedades e relacionamentos acessíveis via requisições HTTP padrão (GET, POST, DELETE).

Em 2025, a Meta realizou mudanças significativas: Advantage+ Shopping Campaigns (ASC) e Advantage App Campaigns (AAC) não podem mais ser criadas ou atualizadas via API na v25.0, exigindo migração para fluxos alternativos. A partir de setembro de 2025, o campo `media_type_automation` para anúncios Advantage+ catalog passou a ter OPT_IN como padrão. Até o final de junho de 2026, a Meta planeja introduzir novas métricas e descontinuar outras (Post/Page Reach, Video Impressions, Story Impressions).

## Procedimento / Conceitos Principais

1. **Autenticação**: Obter App ID, App Secret e Access Token no Meta for Developers. Usar `fb_exchange_token` para converter token de curta duração em token de 60 dias.
2. **Identificar Ad Account**: Todo endpoint começa com `/act_{AD_ACCOUNT_ID}/`. Encontrar o Account ID no Ads Manager em Configurações da Conta.
3. **Criar Campanha**:
   ```
   POST /act_{ad_account_id}/campaigns
   {
     "name": "Nome da Campanha",
     "objective": "OUTCOME_LEADS",
     "status": "PAUSED",
     "special_ad_categories": []
   }
   ```
4. **Criar Ad Set**: Definir público, orçamento, posicionamentos e pixel de rastreamento.
5. **Criar Criativo**: Upload de imagem/vídeo e definição de texto, título, URL de destino.
6. **Criar Anúncio**: Associar Ad Set + Creative para criar o anúncio final.
7. **Atualizar objeto existente**: `POST /{object_id}` com os campos a alterar (status, budget, bid_amount, etc.).
8. **Ler métricas**: `GET /{campaign_id}/insights` com parâmetros de período e campos desejados.
9. **Pausar/Ativar**: `POST /{object_id}` com `{"status": "PAUSED"}` ou `{"status": "ACTIVE"}`.
10. **Excluir**: `DELETE /{object_id}` — preferir `ARCHIVED` para manter histórico.
11. **Paginação**: Resultados de listas usam cursor-based pagination; iterar via `next` no campo `paging`.
12. **Webhooks**: Configurar Real-time Updates para receber notificações de eventos na conta (leads, aprovações).

## Conhecimentos Úteis

- O Graph API Explorer (developers.facebook.com/tools/explorer) é indispensável para testar chamadas antes de implementar em código.
- Todos os objetos têm um ID único global no grafo do Facebook — campaigns, ad sets, ads, creatives, imagens.
- O objetivo da campanha define quais otimizações de ad set estão disponíveis. Para imóveis: `OUTCOME_LEADS` ou `OUTCOME_TRAFFIC`.
- `special_ad_categories` é um campo array obrigatório. Para imóveis: `["HOUSING"]`. Para crédito: `["CREDIT"]`.
- O campo `daily_budget` é especificado em centavos da moeda local (ex: R$50,00 = 5000 para BRL).
- Versões da API têm ciclo de vida de 2 anos; migrar antes da depreciação é crítico para evitar interrupções.
- O Business Manager é necessário para acesso a Ad Accounts de clientes — nunca usar tokens pessoais em produção.
- A API tem rate limits diferenciados: Development (baixo) vs Production (alto). Solicitar acesso avançado quando necessário.
- Erro `#200` (Permissions error) é o mais comum — verificar escopos do token: `ads_management`, `ads_read`.
- Logs de auditoria ficam disponíveis no Business Manager em Registros de Atividade da conta.

## Aplicação no Campos Figueira

- **Integração com CRM**: Quando um imóvel é cadastrado no sistema, acionar automaticamente a API para criar campanha correspondente com dados do imóvel.
- **Gerenciamento de status**: Script automático pausa campanhas de imóveis vendidos/locados via API, evitando desperdício de verba.
- **Atualização de orçamento**: Aumentar budget programaticamente em datas estratégicas (plantões, feirões, lançamentos em Mogi das Cruzes).
- **Leitura de performance**: Dashboard interno que puxa métricas da API diariamente — leads, custo por lead, alcance por campanha.
- **Categoria HOUSING**: Implementar corretamente `special_ad_categories: ["HOUSING"]` em todas as campanhas imobiliárias para evitar penalizações e bloqueios de conta.
- **Auditoria de gastos**: Relatório mensal automático comparando orçamento planejado vs. gasto real por tipo de imóvel.

## Validação

- **Aprovado**: A estrutura fundamental do Graph API para criação de campanhas está bem documentada e estável.
- **Atenção**: Advantage+ Shopping e App Campaigns depreciadas na v25.0 — não implementar esses formatos via API.
- **Confirmar**: Impacto das mudanças de métricas previstas para junho 2026 nos relatórios existentes.
- **Aprovado**: Uso de `special_ad_categories: ["HOUSING"]` para campanhas imobiliárias no Brasil.
- **Confirmar**: Rate limits em produção para o volume de chamadas necessário na operação da Campos Figueira.

## Decisão por Ensinamento

APROVADO COM ADAPTAÇÕES — Conhecimento essencial para qualquer automação de anúncios. Requer atenção às depreciações da v25.0 e implementação correta de categorias especiais para o mercado imobiliário brasileiro.
