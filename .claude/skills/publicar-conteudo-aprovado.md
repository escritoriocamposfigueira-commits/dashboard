---
name: publicar-conteudo-aprovado
description: Executa a publicação de conteúdo que já recebeu aprovação explícita. Usa Meta Graph API para agendar no Facebook ou publicar no Instagram. NUNCA executa sem "APROVADO" registrado.
---
# /publicar-conteudo-aprovado — Publicar Conteúdo Aprovado

## Pré-requisito Absoluto
Esta skill SÓ executa se houver registro explícito de "APROVADO" na conversa.
Se não houver aprovação, execute `/criar-pacote-aprovacao` primeiro.

## Fluxo de Execução

### Facebook (agendamento)
1. Verificar token válido (`/api/meta/verificar-token`)
2. Calcular timestamp Unix da data/hora programada
3. POST /{page-id}/feed com `published: false + scheduled_publish_time`
4. Registrar ID do post agendado no log

### Instagram (publicação imediata com imagem)
1. Criar container: POST /{ig-user-id}/media com `image_url + caption`
2. Aguardar status FINISHED (polling a cada 3s, max 30s)
3. Publicar: POST /{ig-user-id}/media_publish com `creation_id`
4. Registrar ID do post publicado no log

## Log Obrigatório
```
[DATA/HORA] PUBLICADO — REF:[ref] — PLATAFORMA:[FB/IG] — ID:[post-id]
```

## Limitações
- Instagram: máximo 25 posts/24h
- Facebook scheduling: mínimo 10 minutos no futuro, máximo 75 dias
- Imagem Instagram: URL pública e acessível (não local)
