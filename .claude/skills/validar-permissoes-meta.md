---
name: validar-permissoes-meta
description: Verifica se o token Meta tem todas as permissões necessárias para as operações planejadas. Identifica permissões faltando e como obtê-las.
---
# /validar-permissoes-meta — Validar Permissões Meta

## Permissões por Operação

| Operação | Permissão Necessária |
|----------|---------------------|
| Publicar post Facebook | pages_manage_posts |
| Ler insights Facebook | pages_read_engagement |
| Publicar no Instagram | instagram_content_publish |
| Ler dados Instagram | instagram_basic |
| Gerenciar Lead Ads | leads_retrieval |
| Criar campanhas pagas | ads_management |
| Ler campanhas pagas | ads_read |
| Gerenciar página | pages_show_list |

## Como Verificar Token Atual
```
GET https://graph.facebook.com/v22.0/me/permissions
    ?access_token={TOKEN}
```

## Permissões Mínimas para o Dashboard Campos Figueira
- `pages_manage_posts` — agendar posts orgânicos
- `instagram_content_publish` — publicar no Instagram
- `instagram_basic` — ler perfil Instagram
- `pages_read_engagement` — ver métricas da página
- `leads_retrieval` — receber leads de formulários

## Como Obter
1. Meta Developers → Graph API Explorer
2. Selecionar App → Add Permissions
3. Gerar token → estender para 60 dias
4. Trocar por Page Token permanente
