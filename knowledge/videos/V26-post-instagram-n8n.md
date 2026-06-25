# V26 — How to Post to Instagram via n8n

- Canal/Autor: Não identificado via pesquisa (provavelmente WebSensePro ou similar)
- URL: Não encontrado via pesquisa
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

O vídeo ensina como automatizar publicações no Instagram usando o n8n e o Instagram Graph API (acessado via Meta Graph API). A automação de posts no Instagram via API é uma das funcionalidades mais procuradas por agências e negócios que mantêm presença ativa na plataforma, e o n8n simplifica significativamente o processo técnico.

A API do Instagram exige que a conta seja uma conta Business ou Creator, vinculada a uma Página do Facebook. Sem essa configuração, não é possível usar a Graph API para publicar. O processo de publicação no Instagram via API é assíncrono: primeiro faz-se upload da mídia criando um "container", depois publica-se o container.

Os tipos de conteúdo suportados incluem: posts de imagem única, carrosséis (múltiplas imagens), Reels, Stories e vídeos. Cada tipo tem requisitos específicos de formato, resolução e duração. Uma limitação importante: não é possível publicar texto sem imagem — toda publicação precisa de mídia.

## Procedimento / Conceitos Principais

1. **Pré-requisito**: Conta Instagram Business/Creator vinculada a uma Página do Facebook gerenciada pelo usuário.
2. **Permissões necessárias no token**: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`.
3. **Obter Instagram Business Account ID**: `GET /me/accounts` → pegar Page ID → `GET /{page_id}?fields=instagram_business_account` → obter IG Account ID.
4. **Fazer upload da imagem** (para imagem hospedada em URL pública):
   ```
   POST /{ig_user_id}/media
   {
     "image_url": "https://url-publica-da-imagem.jpg",
     "caption": "Texto do post #hashtags",
     "access_token": "{token}"
   }
   ```
   Retorna `{id: "creation_id"}`.
5. **Publicar o container**:
   ```
   POST /{ig_user_id}/media_publish
   {
     "creation_id": "{id_do_passo_anterior}",
     "access_token": "{token}"
   }
   ```
6. **Carrossel**: Criar um container por imagem (step 4 para cada), depois criar container de carrossel com array de IDs, depois publicar.
7. **Reel**: Similar à imagem, mas usando `video_url` e `media_type: REELS`. Inclui etapa de verificação de status de processamento do vídeo.
8. **Verificar status de processamento** (para vídeos/Reels):
   ```
   GET /{creation_id}?fields=status_code
   ```
   Aguardar status `FINISHED` antes de publicar.
9. **Agendamento no n8n**: Usar Schedule Trigger + nó para ler de Google Sheets (calendário editorial) + nós de upload e publicação.
10. **Imagens públicas**: A URL da imagem precisa ser acessível publicamente. Usar Google Drive (com link público), Cloudinary, S3 ou similar.
11. **Limites da API**: Máximo de 50 posts de imagem/vídeo por dia por conta; Reels e Stories têm limites separados.
12. **Nó n8n nativo ou HTTP Request**: Usar HTTP Request para chamadas diretas à Graph API; template n8n #5457 automatiza posts no Instagram e Facebook.

## Conhecimentos Úteis

- O Instagram Graph API é completamente diferente da API básica do Instagram (que foi descontinuada) — requer conta Business.
- Imagens devem ter no mínimo 320px e máximo 1440px de largura; proporção entre 4:5 e 1.91:1 é recomendada.
- Para Reels: duração entre 3 e 90 segundos, formato MP4/MOV, resolução mínima 720p.
- O processo assíncrono de publicação (criar container → publicar) permite verificar e aprovar antes de publicar.
- Tokens de sistema não expiram, mas permissões de conta Instagram precisam ser re-autorizadas periodicamente.
- Permissões `instagram_content_publish` requer que o App Meta passe por revisão para uso com múltiplos usuários.
- O n8n tem template #4498: "Schedule & publish all Instagram content types with Facebook Graph API" — cobre todos os tipos de mídia.
- Para texto nas imagens/Reels, gerar imagem com texto via Canva API ou ferramentas similares antes de postar.
- Hashtags no caption: incluir no texto do caption normal, sem endpoint especial — limite de 30 hashtags por post.
- Localização e tags de produto são funcionalidades avançadas disponíveis na API para contas Business.

## Aplicação no Campos Figueira

- **Calendário editorial automatizado**: Google Sheets com planejamento mensal de posts (imagem, caption, data/hora) → n8n lê e publica automaticamente no horário programado.
- **Posts de imóveis novos**: Quando imóvel é cadastrado no CRM com fotos, n8n cria automaticamente post no Instagram com fotos do imóvel, descrição e CTA para contato.
- **Reels de tour virtual**: Automatizar upload de vídeos curtos de visitas filmadas — fundamental para o algoritmo do Instagram em 2026.
- **Carrossel de mercado**: Post semanal automático com dados do mercado imobiliário de Mogi das Cruzes em formato carrossel (múltiplas imagens com dados).
- **Stories de lançamentos**: Automatizar stories anunciando novos imóveis disponíveis toda segunda-feira.
- **Consistência sem esforço**: Manter frequência de 4-6 posts/semana sem depender da disponibilidade manual da equipe.

## Validação

- **Aprovado**: O Instagram Graph API para publicação é estável e amplamente documentado.
- **Aprovado**: Template n8n #5457 e #4498 são pontos de partida sólidos.
- **Confirmar**: Processo de revisão do App Meta para `instagram_content_publish` — tempo e requisitos.
- **Atenção**: Conta Instagram deve ser Business/Creator e vinculada à Página do Facebook — verificar configuração atual da Campos Figueira.
- **Confirmar**: URL pública das imagens dos imóveis — onde hospedar para a API acessar.

## Decisão por Ensinamento

APROVADO — Automatizar posts no Instagram via n8n é altamente recomendado para a Campos Figueira manter presença consistente sem sobrecarregar a equipe. Implementar após configurar corretamente o App Meta e a conta Business no Instagram.
