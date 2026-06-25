# V21 — How to Set Up Meta Ads API in n8n Complete Guide

- Canal/Autor: Não identificado via pesquisa (provavelmente canal de automação/n8n no YouTube)
- URL: Não encontrado via pesquisa
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

Este vídeo é um guia completo para configurar a integração entre a Meta Ads API e o n8n, plataforma de automação de workflows. O n8n funciona como uma "cola" que conecta diferentes aplicações e serviços por meio de um editor visual baseado em nós (nodes), permitindo construir automações complexas sem escrever código extensivo.

A integração Meta Ads + n8n abre um leque de possibilidades: puxar métricas de campanhas automaticamente, criar relatórios em Google Sheets, disparar ações baseadas em performance, gerenciar criativos e muito mais. O n8n tem uma biblioteca crescente de templates para Meta Ads, incluindo análise de performance com IA, conversão server-side (CAPI), e criação de campanhas de forma automatizada.

O n8n suporta tanto a abordagem via nó nativo do Facebook Graph API quanto chamadas HTTP diretas, dando flexibilidade para casos de uso avançados não cobertos pelos nós prontos. A plataforma pode ser hospedada na nuvem (n8n.cloud) ou auto-hospedada (self-hosted), sendo a versão self-hosted ideal para equipes que precisam de controle total e redução de custos.

## Procedimento / Conceitos Principais

1. **Instalar/acessar n8n**: Criar conta em n8n.cloud ou instalar via Docker (`docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n docker.n8n.io/n8nio/n8n`).
2. **Criar App no Meta for Developers**: Acessar developers.facebook.com → Criar App do tipo "Business" → Adicionar produto "Marketing API".
3. **Configurar permissões**: No App, adicionar permissões `ads_management`, `ads_read`, `business_management`, `pages_read_engagement`.
4. **Gerar Access Token**: Usar o Graph API Explorer para gerar token com as permissões necessárias. Para produção, usar System User Token.
5. **Adicionar credencial no n8n**: Settings → Credentials → New → Facebook Graph API → inserir Access Token.
6. **Nó Facebook Graph API**: Arrastar nó para o canvas, selecionar operação (GET/POST), inserir endpoint e parâmetros.
7. **Puxar insights de campanhas**: `GET /act_{account_id}/insights` com campos: `campaign_name,spend,impressions,clicks,actions,cost_per_action_type`.
8. **Conectar Google Sheets**: Adicionar nó Google Sheets após o nó Meta para salvar métricas automaticamente.
9. **Agendar execução**: Usar nó Schedule Trigger para executar workflow diariamente (ex: toda manhã às 8h).
10. **Configurar alertas**: Adicionar lógica condicional — se CPC acima de X, enviar mensagem no Telegram ou email.
11. **Testar workflow**: Usar o botão "Test Workflow" no n8n para executar manualmente antes de ativar o agendamento.
12. **Server-Side Conversions (CAPI)**: Template dedicado no n8n para enviar conversões diretamente ao Meta via Conversions API, melhorando rastreamento pós-iOS 14.

## Conhecimentos Úteis

- O n8n tem templates prontos para Meta Ads disponíveis em n8n.io/workflows — buscar por "Meta Ads" ou "Facebook Ads".
- A abordagem DIY com n8n + Meta API exige familiaridade com APIs, JSON e construção de prompts de IA.
- O nó HTTP Request do n8n permite chamar qualquer endpoint da API que não tenha nó nativo.
- Credenciais no n8n são criptografadas e podem ser compartilhadas entre workflows da mesma instância.
- O n8n tem execução de workflows em paralelo; usar `Split in Batches` para processar grandes volumes de dados.
- Error handling: usar nó `Error Trigger` para capturar falhas e notificar a equipe via WhatsApp ou email.
- Versão self-hosted do n8n suporta variáveis de ambiente para configurações sensíveis (tokens, IDs).
- O n8n mantém histórico de execuções com inputs/outputs de cada nó, facilitando debugging.
- Para análise com IA, integrar nó OpenAI/Claude após coletar dados da Meta para gerar insights automáticos.
- Templates comunitários: `Automation of creative testing and campaign launching for Meta ads` (n8n #6038).

## Aplicação no Campos Figueira

- **Dashboard de campanhas automatizado**: Workflow n8n que roda toda manhã, puxando métricas do Meta e salvando em Google Sheets para análise dos sócios da Campos Figueira.
- **Alertas de performance**: Se o custo por lead de alguma campanha ultrapassar R$30,00, o workflow automaticamente notifica via WhatsApp os responsáveis.
- **Relatório semanal**: Toda sexta-feira às 18h, n8n gera e envia por email um resumo de performance da semana — leads, investimento, ROAS.
- **Rastreamento server-side**: Configurar CAPI no n8n para melhorar a atribuição de leads, problema crescente com bloqueadores de cookies e iOS 14+.
- **Sincronização com CRM**: Novos leads captados pelo Meta são automaticamente inseridos no CRM da imobiliária via n8n.
- **Controle de orçamento**: Workflow monitora gasto diário e pausa campanhas que atingirem o limite orçamentário mensal.

## Validação

- **Aprovado**: A integração n8n + Meta Ads API é sólida e amplamente usada em produção.
- **Aprovado**: Templates prontos no n8n.io poupam tempo de desenvolvimento significativo.
- **Confirmar**: Custo do n8n.cloud vs. benefício de auto-hospedar para o porte da Campos Figueira.
- **Atenção**: Rate limits da Meta API — evitar chamadas muito frequentes que possam bloquear o token.
- **Aprovar**: CAPI (server-side conversions) é essencial para melhorar atribuição em 2025/2026.

## Decisão por Ensinamento

APROVADO — Setup Meta Ads API no n8n é tecnicamente acessível e com alto ROI para a operação da Campos Figueira. Priorizar templates prontos antes de construir workflows do zero.
