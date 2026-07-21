# 🤖 ENTREGA COMPLETA — Robô de Publicação Escritório Campos Figueira

> Documento de transição para o **Codex** (ou qualquer agente) assumir o projeto.
> Escritório Campos Figueira — imobiliária + engenharia, Mogi das Cruzes/SP.
> Última atualização deste doc: gerado pelo Claude (nuvem).

---

## 1. O QUE É ESTE PROJETO

Um **robô que publica sozinho 24h** (com o PC desligado) nos perfis do escritório.
Roda no **GitHub Actions** (servidor grátis do GitHub), 2x/dia (09h e 18h BRT),
publicando 1 imóvel por execução em vários canais.

**Canais que ele publica hoje (funcionando, ~100% de sucesso):**
- Facebook Feed (imagem 4:5 + legenda)
- Facebook Story (VÍDEO 12s Ken Burns + música)
- Instagram Feed (imagem 4:5 ou CARROSSEL de fotos)
- Instagram Story (VÍDEO 12s + música)
- Instagram Reel + Facebook Reel (quando há fotos suficientes)
- Posts de CAPTAÇÃO em rotação (CAPT-1, 2, 3…)

**Canais preparados mas inativos (faltam Secrets):** TikTok e YouTube.
**Impossível por regra da Meta (2024):** postar em Grupos do Facebook e Status do
WhatsApp via API — só manual. (Existe `scripts/gerar-grupos.js` que gera uma
página de 3 cliques para os grupos.)

---

## 2. ARQUITETURA (como funciona)

```
GitHub Actions (cron 2x/dia)
   └─ roda: node scripts/publicar-servidor.js
         ├─ lê a FILA:      src/content/imagens-urls.json  (ordem + URLs das imagens)
         ├─ lê as LEGENDAS: src/content/captions-imoveis.json
         ├─ lê o ESTADO:    controle/estado-publicacao.json (índice do próximo)
         ├─ gera VÍDEO story (FFmpeg) a partir da imagem 9:16 + trilha de TRILHAS/
         ├─ hospeda o vídeo via GitHub Contents API → raw.githubusercontent.com
         ├─ publica nos canais via Meta Graph API v22.0
         └─ salva o estado de volta (commit [skip ci]) e avança o índice
```

- **Imagens são hospedadas no próprio GitHub** (repo é público → `raw.githubusercontent.com`
  serve como CDN grátis). Feed usa `public/anuncios-feed/` (4:5), Story usa
  `public/anuncios/` (9:16). Vídeos gerados vão para `public/videos/`.
- O **estado** garante que não repete nem pula imóvel. Quando a fila acaba, reinicia.

---

## 3. INVENTÁRIO DE ARQUIVOS

| Arquivo | Função |
|---|---|
| `scripts/publicar-servidor.js` | **Coração.** Publica o próximo imóvel em todos os canais. |
| `.github/workflows/publicar.yml` | Agenda (cron) + roda o script no servidor 24h. |
| `PREPARAR-SERVIDOR.js` | Roda no PC: copia imagens das pastas → repo + gera o manifesto. |
| `scripts/gerar-video-story.js` | Gera vídeo 9:16 (Ken Burns + música) de uma imagem. |
| `scripts/gerar-grupos.js` | Gera `GRUPOS-COMPARTILHAR.html` (3 cliques p/ grupos). |
| `scripts/alertar.js` | Alertas (ntfy.sh). |
| `src/content/imagens-urls.json` | **Manifesto:** ordem da fila + `urls` (9:16) + `urls_feed` (4:5). |
| `src/content/captions-imoveis.json` | Legendas (1 por código de imóvel). |
| `src/content/captacao.json` | Posts de captação (rotação). |
| `src/content/fotos-imoveis.json` | Fotos extras por imóvel (para carrossel/reel). |
| `controle/estado-publicacao.json` | Índice atual + histórico do que foi publicado. |
| `TRILHAS/` | Músicas royalty-free + `catalogo.json` (emoção→trilha). |
| `public/anuncios/` | Imagens 9:16 (STORY). |
| `public/anuncios-feed/` | Imagens 4:5 (FEED). |
| `public/videos/` | Vídeos gerados. |
| `.env.local` | **NÃO versionado.** Guarda o token localmente. |

---

## 4. ACESSOS E CREDENCIAIS (onde estão — NÃO colar valores aqui!)

> ⚠️ **O REPOSITÓRIO É PÚBLICO.** NUNCA escreva o token, senha ou chave dentro de
> nenhum arquivo versionado. Se colar, vaza para a internet inteira. Sempre use
> GitHub Secrets (servidor) e `.env.local` gitignored (PC).

| O quê | Onde fica | Como acessar |
|---|---|---|
| **Token da Meta (Page Access Token)** | GitHub Secret `META_PAGE_TOKEN` (servidor) e `.env.local` no PC | Settings → Secrets and variables → Actions |
| **GITHUB_TOKEN** | Injetado automático pelo Actions | já disponível no workflow |
| **TikTok / YouTube** | Secrets ainda NÃO criados | criar `YT_CLIENT_ID/SECRET/REFRESH_TOKEN`, `TIKTOK_CLIENT_KEY/SECRET/REFRESH_TOKEN` |

**IDs fixos da Meta (podem ficar no código, não são segredo):**
- PAGE_ID (Facebook): `512040582222121`
- IG_USER_ID (Instagram): `17841461388445580`
- Página: facebook.com/Escritorio.figueira · Instagram: @escritorio.figueira
- WhatsApp do escritório (nas legendas): `https://wa.me/551123785643`
- CRECI: 043649-J

**Validade do token:** Page Tokens da Meta expiram. Se as publicações começarem a
falhar com erro de permissão/OAuth, gerar novo token (ver `TROCA-DE-TOKEN.md`) e
atualizar o Secret `META_PAGE_TOKEN`.

---

## 5. DIAGNÓSTICO ATUAL

- **Fila:** 76 imóveis + posts de captação em rotação. Quando acaba, reinicia sozinha.
- **Taxa de sucesso:** ~100% nos últimos ~15 posts (0 falhas).
- **Formatos ativos:** feed 4:5, story em vídeo, carrossel, reels, captação.
- **Falhas históricas** (já resolvidas): token expirado gerava erro de permissão
  (#200 / #10) — resolvido atualizando o Secret. Carrossel muito grande deu
  "reduce the amount of data" no FB feed uma vez.
- Para o diagnóstico ao vivo: ver `controle/estado-publicacao.json` (campo `indice`
  e array `publicados`) e a aba **Actions** do GitHub.

---

## 6. COMO OPERAR

**Disparar manualmente:** GitHub → Actions → "Publicar imóveis (servidor 24h)" →
Run workflow. (Ou via API: `POST /repos/{owner}/{repo}/actions/workflows/publicar.yml/dispatches`.)

**Ver o que foi publicado:** `controle/estado-publicacao.json`.

**Pausar tudo:** desabilitar o workflow em Actions, ou remover os crons do `.yml`.

---

## 7. COMO ADICIONAR NOVOS IMÓVEIS / IMAGENS (fluxo atual)

1. Colocar as imagens do imóvel nas pastas de origem no PC:
   - `...\IMAGENS ANUNCIOS\PROPORÇÃO 4.5\CF - <codigo>.png`  (feed)
   - `...\IMAGENS ANUNCIOS\proporção 9.16\CF - <codigo>.png` (story)
2. Escrever a legenda desse `<codigo>` em `src/content/captions-imoveis.json`.
3. Rodar `node PREPARAR-SERVIDOR.js` (copia imagens → repo + atualiza manifesto + push).
4. O robô inclui o novo imóvel no fim da fila automaticamente.

---

## 8. ⭐ REGRAS DE IMAGEM POR REDE (para CRIAR novas imagens)

> O Codex deve gerar **2 versões de cada peça**: uma 4:5 (feed) e uma 9:16 (story/reel).

### Instagram
| Formato | Proporção | Tamanho ideal (px) | Observações |
|---|---|---|---|
| Feed (foto/carrossel) | **4:5** | **1080 × 1350** | Melhor alcance. Aceita 1:1 (1080×1080) e 1.91:1 (1080×566). Carrossel: TODAS na mesma proporção, 2–20 imagens. Máx 8 MB. |
| Story | **9:16** | **1080 × 1920** | Deixar **~250px no topo e ~420px na base** livres de texto/logo (UI do app cobre). |
| Reel | **9:16** | **1080 × 1920** | Capa também 1080×1920. Vídeo H.264 + AAC. |

### Facebook
| Formato | Proporção | Tamanho ideal (px) | Observações |
|---|---|---|---|
| Feed | **4:5** ou 1:1 | **1080 × 1350** | Retrato funciona bem. Link/anúncio: 1.91:1 (1200×628). |
| Story | **9:16** | **1080 × 1920** | Mesma zona segura da story do IG. |
| Reel | **9:16** | **1080 × 1920** | Igual reel do IG. |

### Regras gerais de arte (ambas as redes)
- **Formato de arquivo:** PNG ou JPG (imagem); MP4 (H.264 + AAC) para vídeo.
- **Texto na imagem:** manter enxuto (prática dos "≤20% de texto" ainda ajuda no alcance).
- **Legibilidade:** fonte grande, contraste alto; informação principal (tipo, bairro,
  valor) sempre visível na versão de feed.
- **Marca:** logo do escritório + CRECI 043649-J discretos; rodapé com site/WhatsApp.
- **Zona segura da story/reel:** nada essencial nos 250px de cima nem nos ~420px de baixo.
- **Nomear o arquivo:** `CF - <codigo>.png` (mesmo código nas duas pastas/proporções).

---

## 9. O QUE FALTA / PRÓXIMOS PASSOS

- [ ] Ativar **TikTok** e **YouTube** (criar os Secrets — o código já está pronto).
- [ ] Gerar **novas artes** (4:5 + 9:16) quando o escritório pedir novos imóveis.
- [ ] Renovar o token da Meta antes de expirar (evita cair a publicação).
- [ ] (Opcional) rotação seg–sex garantindo todas as locações 1x/semana.

---

## 10. REGRAS DE SEGURANÇA (obrigatórias)

- Repositório é **PÚBLICO** → NUNCA commitar token, senha, cookie ou chave.
- Segredos só em **GitHub Secrets** e **`.env.local`** (que está no `.gitignore`).
- Nunca automatizar login no Facebook/Instagram por robô de navegador (viola os
  Termos da Meta e pode **banir a conta/página** do escritório).
- Não postar em grupos por API (a Meta removeu isso em 2024).
