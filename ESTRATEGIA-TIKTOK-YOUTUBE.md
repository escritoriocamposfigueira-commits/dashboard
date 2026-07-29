# 📈 ESTRATÉGIA — Crescer TikTok + YouTube junto com FB/IG
### Guia para o Codex expandir o robô (Escritório Campos Figueira)

> Objetivo: publicar os anúncios também no **TikTok** e no **YouTube Shorts**,
> reaproveitando o vídeo 9:16 que o robô já gera. Crescimento consistente e
> SEGURO (sem queimar alcance com spam).

---

## 1. O ATIVO UNIVERSAL (já existe)

O robô já gera `public/videos/CF-<codigo>-story.mp4` — vídeo **9:16, 1080×1920,
Ken Burns + música**. Esse MESMO arquivo serve para:
- Instagram: Story + Reel (já faz)
- Facebook: Story + Reel (já faz)
- **TikTok: post de vídeo** (a fazer)
- **YouTube: Short** (vertical < 60s → categorizado como Short automaticamente) (a fazer)

👉 Cross-postar o mesmo vídeo. Não precisa criar mídia nova.
Recomendação: alongar o vídeo para **~20–30s** (mostrar 3–5 fotos do imóvel em vez de 1)
— TikTok/Shorts/Reels performam melhor com 20–30s do que com 12s.

---

## 2. TIPOS DE POST POR PLATAFORMA (para estes anúncios)

**TikTok (Content Posting API):**
- ✅ **Vídeo (feed)** — 9:16, MP4. Modo "Direct Post" (vai ao ar) ou "Draft".
- ⚠️ Foto/carrossel — suporte de API instável; não usar por ora.
- ❌ Stories do TikTok — não há API.

**YouTube (Data API v3 — Videos.insert):**
- ✅ **Shorts** — vídeo vertical 9:16 < 60s (vira Short sozinho). Usar `#Shorts` no título/descrição.
- ▫️ Vídeo 16:9 — só para tour longo do imóvel (fase futura).
- ⚠️ Community posts — precisa elegibilidade do canal; API limitada.

---

## 3. LIMITES REAIS (respeitar — senão o alcance cai)

| Plataforma | Limite técnico | Cadência SAUDÁVEL recomendada |
|---|---|---|
| YouTube | ~6 uploads/dia (cota 10.000 u; Videos.insert = 1.600 u). Pode pedir aumento no Google Cloud. | 1–2 Shorts/dia |
| TikTok | 6 posts/min por token; token expira 24h (usar refresh_token). Precisa AUDIT do app. | 1–3 vídeos/dia |
| Instagram | ~50 posts/dia (feed+story). | Feed 1–2/dia, Story 2–4/dia, Reel 1/dia |
| Facebook | Alto. | Igual ao IG |

> ⚠️ **NÃO poste "ilimitado, um atrás do outro".** As plataformas leem isso como spam de
> bot e **derrubam o alcance** (shadowban). Crescimento vem de **consistência + qualidade**,
> não de volume bruto. Melhor 2–3 posts fortes/dia, todo dia, do que 50 de uma vez.

---

## 4. CADÊNCIA IDEAL (estratégia de crescimento)

**Mesmo imóvel, distribuído no dia (o robô já roda 2x/dia; expandir para isto):**
1. **09h** — Imóvel A: FB Feed + IG Feed (4:5) · FB/IG Story (vídeo) · **TikTok vídeo** · **YT Short**
2. **13h** — Story extra / bastidor / captação
3. **18h** — Imóvel B: mesmo pacote de canais

**Regras de conteúdo por plataforma (adaptar a legenda):**
- **TikTok/YouTube:** o link não é clicável no post → CTA = "**link na bio**" + WhatsApp
  escrito. Usar **hashtags**: `#imoveis #mogidascruzes #casapropria #imovelavenda
  #corretor #realestate`. Primeiros 2s do vídeo têm que prender (gancho forte).
- **Instagram/Facebook:** mantém o rodapé atual (WhatsApp `wa.me/551123785643`).
- Som/música: no TikTok, música em alta ajuda o alcance (mas cuidar de direitos —
  usar as trilhas royalty-free de `TRILHAS/` ou sons livres do próprio TikTok).

**Mix semanal (não só anúncio):** 70% imóveis, 20% captação/educativo
(dicas, financiamento, regularização), 10% bastidores/depoimentos. Isso cresce
seguidor de verdade (só anúncio satura).

---

## 5. O QUE O CODEX PRECISA IMPLEMENTAR (código)

O workflow já tem os placeholders de Secrets (`YT_*`, `TIKTOK_*`). Falta:

**TikTok:**
1. App no TikTok for Developers → produto "Content Posting API" → passar pela **auditoria**.
2. OAuth → gerar `client_key`, `client_secret`, `refresh_token` (renova o access_token 24h).
3. Publisher: `POST /v2/post/publish/video/init/` (Direct Post) → upload do MP4 → status.
4. Legenda adaptada + hashtags. Reusar `public/videos/CF-<codigo>-story.mp4`.

**YouTube:**
1. Projeto no Google Cloud → ativar **YouTube Data API v3** → tela de consentimento OAuth
   (modo "testing" com o próprio Henrique como test user já basta para o canal dele).
2. Gerar `client_id`, `client_secret`, `refresh_token` (via OAuth Playground).
3. Publisher: `videos.insert` (resumable upload) com `snippet` (título + `#Shorts` +
   descrição + tags) e `status.privacyStatus="public"`. Vertical < 60s = Short automático.
4. Respeitar a cota (implementar backoff; no máx ~6/dia sem pedir aumento).

**Geral:**
- Cada canal com `try/catch` isolado (padrão do robô) — se TikTok/YT falharem, os outros publicam.
- Registrar `tiktok` e `yt_short` no `estado-publicacao.json`.
- Só ativar quando os Secrets existirem (o robô ignora se faltar — já é assim).

---

## 6. 🔑 PRÉ-REQUISITOS QUE SÓ O HENRIQUE FAZ (cliques dele)

1. **TikTok:** criar conta em developers.tiktok.com, registrar o app, pedir acesso ao
   Content Posting API e passar pela auditoria (pode levar alguns dias). Depois autorizar
   e cadastrar os 3 Secrets no GitHub.
2. **YouTube:** ter um canal no YouTube; criar projeto no Google Cloud, ativar a API,
   autorizar com a conta do canal, cadastrar os 3 Secrets.
3. Colocar o **link do site + WhatsApp na BIO** do TikTok e do YouTube (o CTA "link na bio").

Secrets: github.com/escritoriocamposfigueira-commits/dashboard/settings/secrets/actions

---

## 7. FONTES (APIs — consultar se mudar)
- TikTok Content Posting API: developers.tiktok.com/doc/content-posting-api-get-started
- YouTube Data API v3 (videos.insert): developers.google.com/youtube/v3/docs/videos/insert
