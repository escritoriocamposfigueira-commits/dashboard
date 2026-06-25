---
name: pesquisar-docs-atuais
description: Pesquisa documentação oficial atualizada do Claude Code, Meta API, n8n e ferramentas relacionadas. Verifica versões, depreciações e mudanças recentes. Use quando precisar confirmar se uma funcionalidade ainda existe ou como algo funciona na versão atual.
---
# /pesquisar-docs-atuais — Pesquisar Documentação Atual

## Fontes Oficiais por Categoria

### Claude Code / Anthropic
- Skills: https://docs.anthropic.com/en/docs/claude-code/skills
- Subagents: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Hooks: https://docs.anthropic.com/en/docs/claude-code/hooks-guide
- MCP: https://docs.anthropic.com/en/docs/claude-code/mcp
- SDK: https://docs.anthropic.com/en/docs/claude-code/sdk

### Meta / Facebook
- Marketing API: https://developers.facebook.com/docs/marketing-apis
- Graph API: https://developers.facebook.com/docs/graph-api
- Instagram Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing
- Meta Ads CLI: https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-cli
- Changelog: https://developers.facebook.com/docs/graph-api/changelog

### n8n
- Documentação: https://docs.n8n.io
- Integrações Meta: https://n8n.io/integrations/facebook-graph-api

## Protocolo de Pesquisa
1. Tentar WebFetch na URL oficial
2. Se falhar, usar WebSearch com "site:developers.facebook.com [tópico]"
3. Verificar data da última atualização
4. Registrar versão da API encontrada
5. Documentar em knowledge/official-docs/

## Regra
Documentação oficial sempre prevalece sobre vídeos ou tutoriais externos.
