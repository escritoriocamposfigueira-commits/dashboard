# 🔑 GUIA DE TOKENS — como pegar sem expirar (TikTok, YouTube, Meta)

> Quem pega: **o Henrique** (dono das contas). Depois cadastra como GitHub Secrets em
> github.com/escritoriocamposfigueira-commits/dashboard/settings/secrets/actions

## Verdade sobre expiração
- **YouTube:** o `refresh_token` NÃO expira **se o app OAuth estiver em "Produção"**
  (em "Testing" expira em 7 dias). → É o mais próximo de "eterno".
- **TikTok:** não há token eterno. O `refresh_token` dura 365 dias e é **renovado a
  cada uso** (o robô roda todo dia → nunca vence). ⚠️ O código deve SALVAR o novo
  refresh_token a cada renovação (rotação) — senão vence em 1 ano.
- **Meta:** token de System User (Business Manager) nunca expira.

---

## 1) YOUTUBE — refresh_token que NÃO expira

1. Acesse **console.cloud.google.com** (logado na conta do **canal do YouTube**).
2. **Criar projeto** (ex.: "Robo Campos Figueira").
3. Menu → "APIs e serviços" → **Ativar APIs** → procure **YouTube Data API v3** → Ativar.
4. "APIs e serviços" → **Tela de consentimento OAuth**:
   - Tipo: **Externo** → preencher nome do app, e-mail de suporte.
   - Em "Escopos", adicionar: `.../auth/youtube.upload`.
   - **PUBLICAR O APP** (botão "Publicar app" / mudar status para **"Em produção"**).
     ⚠️ É isto que faz o refresh_token **não expirar**. Como você é o dono, pode
     publicar sem verificação completa do Google (aceite o aviso "app não verificado").
5. "Credenciais" → **Criar credenciais** → **ID do cliente OAuth** → tipo
   **App para computador (Desktop)** → copie **client_id** e **client_secret**.
6. Pegar o **refresh_token** em **developers.google.com/oauthplayground**:
   - Clique na **engrenagem** (canto sup. direito) → marque **"Use your own OAuth
     credentials"** → cole client_id e client_secret.
   - No campo de escopos, cole: `https://www.googleapis.com/auth/youtube.upload`
     → **Authorize APIs** → faça login com a conta do canal.
   - Clique **"Exchange authorization code for tokens"** → copie o **refresh_token**.
     (Como o app está "Em produção", esse refresh_token não expira.)
7. Cadastre os Secrets: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`.

---

## 2) TIKTOK — refresh_token que se renova sozinho (roda pra sempre)

1. Acesse **developers.tiktok.com** (logado na conta TikTok do escritório) → **Manage apps**
   → **Connect an app** / criar app.
2. Preencha os dados do app. Em **Products**, adicione **Login Kit** e **Content Posting API**.
3. Em Content Posting API → habilite **Direct Post**. Escopos necessários:
   `user.info.basic`, `video.publish` (para vídeo e foto/carrossel).
4. **URL properties** → **verifique o domínio** `raw.githubusercontent.com`
   (baixa o arquivo TXT que eles pedem e... como o repo é público, use o método de
   verificação por URL/arquivo). ⚠️ Sem isso o PULL_FROM_URL é recusado.
5. **Redirect URI**: adicione uma (ex.: `https://www.escritoriocamposfigueira.com.br/`
   ou `https://localhost/`).
6. **Submeta para AUDITORIA** (obrigatório para postar público). Aguarde aprovação
   (alguns dias). Enquanto não aprovar, só dá para postar como `SELF_ONLY` (privado).
7. Copie **client_key** e **client_secret** do painel do app.
8. Pegue o **refresh_token** fazendo o login OAuth uma vez:
   a. Abra no navegador (troque CLIENT_KEY e REDIRECT):
      `https://www.tiktok.com/v2/auth/authorize/?client_key=CLIENT_KEY&scope=user.info.basic,video.publish&response_type=code&redirect_uri=REDIRECT&state=cf`
   b. Autorize → você é redirecionado com `?code=XXXX` na URL. Copie o `code`.
   c. Troque o code por tokens (pode usar curl/Postman):
      `POST https://open.tiktokapis.com/v2/oauth/token/`
      body x-www-form-urlencoded: `client_key`, `client_secret`,
      `grant_type=authorization_code`, `code`, `redirect_uri`.
   d. A resposta traz `access_token` (24h) e **`refresh_token`** (365 dias).
9. Cadastre os Secrets: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`,
   `TIKTOK_REFRESH_TOKEN` (e opcional `TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE`).

⚠️ **Para o Codex:** o TikTok devolve um **novo refresh_token** a cada renovação.
O robô deve **persistir** esse novo valor (ex.: atualizar o Secret via API ou salvar
em arquivo/estado) para não vencer em 1 ano. Implementar a rotação do refresh_token.

---

## 3) META (já feito) — deixar 100% permanente (opcional)

Para nunca mais renovar: criar um **System User** no **Business Manager**
(business.facebook.com → Configurações → Usuários do sistema → Adicionar → gerar token
com as permissões `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`,
`instagram_content_publish`). Esse token **não expira**. Atualizar o Secret
`META_PAGE_TOKEN` com ele.

---

## Depois de pegar tudo
Cadastre os Secrets e o robô ativa TikTok + YouTube automaticamente (os módulos
`scripts/publicar-tiktok.js` e `scripts/publicar-youtube.js` só precisam ser plugados
no fluxo — 2 linhas cada, o Codex faz).
