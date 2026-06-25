# V27 — How to Post to Facebook via n8n

- Canal/Autor: Não identificado via pesquisa (provavelmente GrowwStacks ou similar)
- URL: Não encontrado via pesquisa
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

Este vídeo cobre a automação de publicações em Páginas do Facebook usando o n8n e o Facebook Graph API. Diferente do Instagram, o Facebook permite posts de texto puro (sem imagem), links com preview automático, imagens, vídeos e documentos — dando mais flexibilidade editorial.

Para postar em uma Página do Facebook via API, é necessário ter um Page Access Token (diferente do User Access Token) com a permissão `pages_manage_posts`. O workflow é mais simples que o do Instagram: não há processo assíncrono de dois passos — uma única chamada POST publica o conteúdo diretamente.

O n8n tem templates prontos para automatizar posts no Facebook e Instagram simultaneamente, usando System User Tokens para evitar expiração. A principal vantagem de automatizar via n8n é poder integrar com outras fontes de dados: publicar automaticamente quando um novo imóvel é cadastrado no CRM, quando um blog post é publicado no site, ou de acordo com um calendário editorial no Google Sheets.

## Procedimento / Conceitos Principais

1. **Pré-requisito**: Ser Administrador da Página do Facebook que receberá as publicações.
2. **Permissões necessárias**: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`.
3. **Obter Page Access Token**: `GET /me/accounts` → encontrar a página desejada → copiar `access_token` do objeto da página (é o Page Access Token).
4. **Post de texto simples**:
   ```
   POST /{page_id}/feed
   {
     "message": "Texto da publicação",
     "access_token": "{page_token}"
   }
   ```
5. **Post com link** (preview automático do Facebook):
   ```
   POST /{page_id}/feed
   {
     "message": "Texto da publicação",
     "link": "https://url-do-link.com",
     "access_token": "{page_token}"
   }
   ```
6. **Post com imagem**:
   - Primeiro fazer upload: `POST /{page_id}/photos` com `url` ou `source` (arquivo binário).
   - Ou incluir `attached_media` com photo_id previamente uploaded.
7. **Agendar publicação**: Incluir `published: false` e `scheduled_publish_time` (Unix timestamp) para agendar.
8. **Configurar no n8n**: Usar nó HTTP Request com Method POST, URL `https://graph.facebook.com/v25.0/{page_id}/feed`, Body com os campos.
9. **Integrar com Google Sheets**: Nó Schedule Trigger → Sheets (leitura de calendário) → HTTP Request (post no Facebook).
10. **Post simultâneo no Facebook e Instagram**: Template n8n #5457 automatiza os dois simultaneamente com System User Token.
11. **Tratar erros**: Adicionar nó "Error Trigger" para capturar falhas e notificar via WhatsApp ou email.
12. **Verificar publicação**: Após POST, salvar `post_id` retornado para verificar métricas futuramente via API.

## Conhecimentos Úteis

- Page Access Tokens têm vida longa (geralmente não expiram) quando obtidos via token de usuário de longa duração ou System User Token.
- O System User Token é o mais recomendado para automações — não vinculado a um usuário específico, não expira por inatividade.
- Para posts programados, o `scheduled_publish_time` deve ser entre 10 minutos e 75 dias no futuro.
- O Facebook tem limites de publicação por Página — evitar mais de 20-30 posts/dia para não ser penalizado pelo algoritmo.
- Publicações via API ficam visíveis no Gerenciador de Publicações da Página — facilita monitoramento.
- O campo `link` faz o Facebook buscar o Open Graph da URL e gerar preview automático (título, descrição, imagem).
- Para vídeos, usar o endpoint `/videos` em vez de `/feed`, com processo de upload assíncrono similar ao Instagram.
- A API retorna o ID do post publicado — salvar para correlacionar com métricas futuras.
- Template n8n #5457 é amplamente recomendado pela comunidade para posts Facebook + Instagram com um único workflow.
- Verificar o Gerenciador de Conformidade de Conteúdo da Página para garantir que posts automatizados seguem as políticas da Meta.

## Aplicação no Campos Figueira

- **Página da imobiliária**: Manter a Página do Facebook da Campos Figueira ativa com publicações regulares sem esforço manual.
- **Posts de imóveis em destaque**: Toda semana, publicar automaticamente os 3 imóveis mais visitados do site, com foto, descrição e link para a ficha completa.
- **Conteúdo educativo**: Publicar semanalmente artigos sobre financiamento, documentação e dicas para quem vai comprar imóvel em Mogi das Cruzes.
- **Integração com blog**: Quando um novo post é publicado no blog da Campos Figueira, n8n automaticamente cria post no Facebook com link e chamada para ação.
- **Resultado de vendas**: Posts comemorando imóveis vendidos/locados — "Mais um apartamento no Centro de Mogi das Cruzes entregue!" — conteúdo de prova social automático.
- **Sincronização Facebook + Instagram**: Um único workflow publica simultaneamente nas duas plataformas, dobrando o alcance com o mesmo esforço.

## Validação

- **Aprovado**: Endpoint `/feed` do Facebook Graph API é um dos mais estáveis e bem documentados.
- **Aprovado**: System User Token para automações de longa duração.
- **Confirmar**: Política da Meta sobre publicações automatizadas — garantir que o conteúdo tem valor real e não é spam.
- **Confirmar**: Impacto no alcance orgânico de posts publicados via API vs. posts publicados nativamente no Meta Business Suite.
- **Aprovar**: Template n8n #5457 para posts simultâneos Facebook + Instagram.

## Decisão por Ensinamento

APROVADO — Automatizar posts no Facebook via n8n é simples de implementar e de alto impacto para a presença digital da Campos Figueira. Combinar com o V26 (Instagram) para publicação simultânea nas duas plataformas.
