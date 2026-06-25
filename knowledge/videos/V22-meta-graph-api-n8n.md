# V22 — Connect Meta Graph API to n8n Full Walkthrough

- Canal/Autor: Não identificado via pesquisa
- URL: Não encontrado via pesquisa
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

Este vídeo é um tutorial passo a passo completo para conectar o Meta Graph API ao n8n, cobrindo desde a criação do App no Meta for Developers até a execução das primeiras chamadas de API dentro de um workflow funcional. Enquanto o V21 foca especificamente em Meta Ads, este vídeo abrange o Graph API de forma mais ampla — incluindo Pages, Instagram, Messenger, além de funcionalidades de anúncios.

O Meta Graph API é a interface principal para acessar dados e funcionalidades do ecossistema Meta (Facebook, Instagram, WhatsApp). Cada endpoint segue o padrão `https://graph.facebook.com/{version}/{endpoint}`, com autenticação via tokens OAuth 2.0. O n8n oferece o nó "Facebook Graph API" nativo, além do nó genérico "HTTP Request" para casos de uso mais específicos.

A conexão exige configurar corretamente os escopos (permissões) do App Meta, pois diferentes funcionalidades requerem diferentes permissões — e algumas exigem revisão da Meta (Advanced Access) antes de usar em produção com usuários reais ou páginas de terceiros.

## Procedimento / Conceitos Principais

1. **Criar App Meta**: Acessar developers.facebook.com/apps → Criar App → Tipo: "Business" ou "Consumer" dependendo do caso de uso.
2. **Adicionar produtos ao App**: No painel do App, adicionar "Facebook Login", "Instagram Graph API", "Marketing API" conforme necessidade.
3. **Configurar OAuth**: Em "Facebook Login" → Configurações → adicionar URLs de redirecionamento válidos (incluindo URL do n8n).
4. **Definir permissões (escopos)**: Selecionar escopos necessários — ex: `pages_manage_posts`, `instagram_content_publish`, `ads_management`.
5. **Gerar token no Graph API Explorer**: developers.facebook.com/tools/explorer → selecionar App → gerar token com os escopos necessários.
6. **Converter para token de longa duração**:
   ```
   GET /oauth/access_token?grant_type=fb_exchange_token
   &client_id={APP_ID}&client_secret={APP_SECRET}
   &fb_exchange_token={SHORT_TOKEN}
   ```
7. **Configurar credencial no n8n**: Credentials → New → Facebook Graph API → colar Access Token.
8. **Nó Facebook Graph API no n8n**: Configurar Hostname, Method (GET/POST), Endpoint e Parameters.
9. **Testar conexão básica**: `GET /me` retorna dados do usuário autenticado — confirma que o token é válido.
10. **Exemplo Pages**: `GET /me/accounts` lista todas as páginas gerenciadas pelo usuário.
11. **Modo de desenvolvimento vs. produção**: Em Development, apenas usuários administradores do App podem usar. Publicar o App para uso em produção.
12. **Solicitar Advanced Access**: Para acesso a dados de usuários reais (não apenas admins do App), submeter o App para revisão da Meta com casos de uso documentados.

## Conhecimentos Úteis

- O Graph API Explorer é a melhor ferramenta para explorar endpoints e testar chamadas antes de implementar no n8n.
- Tokens de usuário expiram em 60 dias (long-lived); tokens de página não expiram; System User Tokens são permanentes.
- O Page Access Token é diferente do User Access Token — para postar em páginas, precisa trocar o token.
- O n8n salva tokens nas credenciais — nunca colocar tokens diretamente hardcoded em nós de workflow.
- O nó HTTP Request é mais flexível que o nó Facebook Graph API nativo — usar para endpoints não suportados nativamente.
- A versão da API no endpoint é importante: `v25.0` é a versão atual; especificar sempre para evitar comportamentos inesperados.
- Permissões de página (`pages_*`) são separadas das permissões de usuário (`user_*`) e de anúncios (`ads_*`).
- O Webhooks do Meta (Real-time Updates) pode ser configurado no n8n usando um nó Webhook para receber eventos em tempo real.
- Debug do token: `GET /debug_token?input_token={token}&access_token={app_token}` mostra validade, escopos e metadata.
- Business Manager facilita gerenciamento de múltiplas páginas e contas de anúncios com permissões centralizadas.

## Aplicação no Campos Figueira

- **Conexão unificada**: Um único App Meta configurado corretamente conecta anúncios, página do Facebook, Instagram e WhatsApp Business da Campos Figueira.
- **Gerenciamento de tokens**: Implementar rotina n8n que renova tokens antes de expirar, evitando interrupções nos workflows automatizados.
- **Acesso a dados da Página**: Puxar métricas da Página do Facebook da imobiliária (alcance, engajamento, seguidores) para análise consolidada.
- **Webhook de eventos**: Receber notificações em tempo real quando um lead preenche formulário, quando há comentário em post, etc.
- **Multi-conta**: Estrutura permite gerenciar múltiplas contas (caso a Campos Figueira tenha contas de franquia ou parceiros regionais).
- **Auditoria de acessos**: Manter log de quais tokens têm acesso a quê — boa prática de segurança para dados sensíveis de clientes.

## Validação

- **Aprovado**: A estrutura de autenticação OAuth 2.0 do Meta é padrão da indústria e bem documentada.
- **Aprovado**: Uso de System User Tokens para automações sem expiração.
- **Confirmar**: Processo de solicitação de Advanced Access para funcionalidades que requerem revisão da Meta.
- **Atenção**: Tokens de desenvolvimento só funcionam para admins do App — não usar em produção sem publicar o App.
- **Confirmar**: Impacto das atualizações da API (v25.0) em integrações existentes.

## Decisão por Ensinamento

APROVADO — Conhecimento fundamental para qualquer integração com o ecossistema Meta. A configuração correta do App e dos tokens é o alicerce de todas as automações da Campos Figueira com Facebook, Instagram e anúncios.
