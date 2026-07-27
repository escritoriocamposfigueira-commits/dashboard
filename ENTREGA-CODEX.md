# 🤖📖 MANUAL MESTRE DO ROBÔ — Escritório Campos Figueira
### Documento de transição TOTAL para o Codex assumir o projeto

> **Para o Codex:** este é o seu manual definitivo. Leia do início ao fim, estude
> cada seção e torne-se o **especialista máximo** deste robô. A partir de agora,
> **este projeto é seu**: manter no ar, publicar todo dia, e CRIAR as novas artes
> quando o Henrique pedir. Nunca quebre as regras de segurança da Seção 12.
>
> Escritório Campos Figueira — imobiliária + engenharia, Mogi das Cruzes/SP.
> Repositório: `escritoriocamposfigueira-commits/dashboard`
> Branch: `claude/campos-figueira-growth-qmjsux`

---

## ÍNDICE
1. Visão geral
2. Arquitetura e fluxo completo
3. Inventário de todos os arquivos
4. ACESSOS, TOKENS e CREDENCIAIS (onde estão e como pegar)
5. Meta Graph API — como cada canal é publicado
6. Estrutura dos dados (manifesto, legendas, estado, captação, fotos, trilhas)
7. Vídeo (FFmpeg) — story/reel com Ken Burns + música
8. Regras de imagem por rede (proporções exatas)
9. ⭐ IDENTIDADE VISUAL — como criar as artes (o Codex vai gerar imagens)
10. Copywriting — o estilo dos textos (sonho, dor, emoção)
11. Como adicionar um novo imóvel / anúncio (passo a passo)
12. 🔒 Regras de segurança e compliance (invioláveis)
13. Operação: disparar, monitorar, pausar
14. Solução de problemas (erros conhecidos)
15. O que falta / roadmap
16. Glossário

---

## 1. VISÃO GERAL

Robô que **publica sozinho em grade semanal (venda diária, locação diária e captação 2x/semana), com o PC desligado**, nos perfis
do escritório. Roda no **GitHub Actions** (servidor grátis do GitHub). Cada execução
pega o próximo imóvel da fila e publica em vários canais.

**Canais ativos (funcionando, ~100% de sucesso nos últimos posts):**
- Facebook Feed — imagem 4:5 + legenda
- Facebook Story — VÍDEO 12s (Ken Burns + música)
- Instagram Feed — imagem 4:5 OU carrossel de fotos
- Instagram Story — VÍDEO 12s + música
- Instagram Reel + Facebook Reel — quando há fotos suficientes
- Posts de CAPTAÇÃO em rotação (CAPT-1, 2, 3, 4)

**Preparados, faltam Secrets:** TikTok e YouTube.
**Proibido por regra da Meta (2024):** Grupos do Facebook e Status do WhatsApp via API
(só manual). Existe `scripts/gerar-grupos.js` que gera página de 3 cliques para grupos.

**Números do negócio (podem aparecer nas artes/textos — não são segredo):**
- Facebook: facebook.com/Escritorio.figueira · PAGE_ID `512040582222121`
- Instagram: @escritorio.figueira · IG_USER_ID `17841461388445580`
- Instagram do dono: @henriquefigueiraoficial
- Site: www.escritoriocamposfigueira.com.br
- WhatsApp: `https://wa.me/551123785643` (fixo (11) 2378-5643)
- E-mail: escritoriocamposfigueira@gmail.com
- CRECI: 043649-J · Horário: Seg a Sex, 10h às 18h

---

## 1.1 ENDEREÇOS E FONTES DE DADOS (decorar — é tudo que o Codex precisa)

**📂 Projeto no PC (onde o Codex roda):**
```
C:\Users\Henrique\Documents\GitHub\dashboard
```

**🖼️ Pasta das artes/imagens (origem, no PC):**
```
D:\01 - ESCRITÓRIO IMOBILIÁRIO\04- REDE SOCIAL\IMAGENS ANUNCIOS\
   ├─ PROPORÇÃO 4.5\    → imagens 4:5 (FEED)   → arquivos "CF - <codigo>.png"
   └─ proporção 9.16\   → imagens 9:16 (STORY) → arquivos "CF - <codigo>.png"
```
Toda arte nova vai nessas 2 subpastas (uma 4:5 + uma 9:16, mesmo nome).

**🌐 GitHub (onde tudo é versionado e o robô roda):**
- Repositório: https://github.com/escritoriocamposfigueira-commits/dashboard
- Clonar: `git clone https://github.com/escritoriocamposfigueira-commits/dashboard.git`
- Branch de trabalho: `claude/campos-figueira-growth-qmjsux`
- Servidor 24h (Actions): https://github.com/escritoriocamposfigueira-commits/dashboard/actions
- Secrets (tokens): https://github.com/escritoriocamposfigueira-commits/dashboard/settings/secrets/actions
- CDN das imagens (raw): `https://raw.githubusercontent.com/escritoriocamposfigueira-commits/dashboard/refs/heads/claude/campos-figueira-growth-qmjsux/public/...`

**🏠 Site do escritório = FONTE das fotos reais dos imóveis:**
- https://www.escritoriocamposfigueira.com.br
- O Codex deve **ABRIR o site**, procurar o imóvel pelo **CÓDIGO/REF** (ex: 493),
  e **PUXAR as fotos reais** daquele imóvel para montar a arte e o carrossel.
- Sempre criar a arte no **mesmo esquema persuasivo** (Seção 9), incluindo:
  - o **WhatsApp** (`https://wa.me/551123785643`), e
  - o **link específico daquele imóvel** (a página dele no site) na legenda.
- O Codex descobre o padrão de URL de cada imóvel navegando no site (ex.:
  `escritoriocamposfigueira.com.br/imovel/<ref>` ou a busca por código). Se o site
  não tiver página individual, usar o link da busca por aquele código.

---

## 2. ARQUITETURA E FLUXO COMPLETO

```
GitHub Actions (.github/workflows/publicar.yml)
  cron: "0 12 * * *" (09h BRT) e "0 21 * * *" (18h BRT) + workflow_dispatch (manual)
     │
     ├─ checkout do repo + Node 20 + garante FFmpeg
     └─ node scripts/publicar-servidor.js
           1. lê META_PAGE_TOKEN (Secret) e resolve a Página via /me/accounts
           2. lê a FILA (src/content/imagens-urls.json → ordem[])
           3. pega o índice atual (controle/estado-publicacao.json → indice)
           4. monta a legenda (src/content/captions-imoveis.json)
           5. gera o VÍDEO story (FFmpeg: imagem 9:16 + trilha de TRILHAS/)
           6. hospeda o vídeo via GitHub Contents API → raw.githubusercontent.com
           7. publica em cada canal (Meta Graph API v22.0)
           8. grava o resultado no estado, avança o índice, faz commit [skip ci] + push
```

**Por que as imagens ficam no GitHub:** o repo é **público**, então
`raw.githubusercontent.com/<owner>/<repo>/refs/heads/<branch>/public/...` funciona
como CDN grátis. A Meta baixa a imagem/vídeo dessa URL na hora de publicar.
- Feed (4:5): `public/anuncios-feed/CF - <codigo>.png`
- Story (9:16): `public/anuncios/CF - <codigo>.png`
- Vídeos gerados: `public/videos/CF-<codigo>-story.mp4`

**Fila e estado:** o `indice` garante que não repete nem pula. Quando a fila acaba,
reinicia do zero. Se todos os canais falham, tenta de novo até 3x antes de pular.

---

## 3. INVENTÁRIO DE TODOS OS ARQUIVOS

**Scripts:**
| Arquivo | Função |
|---|---|
| `scripts/publicar-servidor.js` | ⭐ CORAÇÃO. Publica o próximo imóvel em todos os canais. |
| `.github/workflows/publicar.yml` | Agenda (cron) + roda o script no servidor. |
| `PREPARAR-SERVIDOR.js` | No PC: copia imagens das 2 pastas → repo + gera manifesto + push. |
| `scripts/gerar-video-story.js` | Gera vídeo 9:16 (Ken Burns + música). |
| `scripts/publicar-story-video.js` | Publica vídeo story avulso (teste). |
| `scripts/gerar-grupos.js` | Gera `GRUPOS-COMPARTILHAR.html` (3 cliques p/ grupos). |
| `scripts/baixar-trilhas.js` | Baixa músicas royalty-free para `TRILHAS/`. |
| `scripts/alertar.js` | Alertas via ntfy.sh. |
| `trocar-token.js` | Troca token curto → longo → permanente (ver TROCA-DE-TOKEN.md). |

**Conteúdo (src/content):**
| Arquivo | Estrutura |
|---|---|
| `imagens-urls.json` | `{ ordem:[codigos], urls:{codigo:URL_9x16}, urls_feed:{codigo:URL_4x5} }` |
| `captions-imoveis.json` | `[ { codigo_imovel, arquivo, caption } ]` — 76 imóveis |
| `captacao.json` | lista de 4 posts de captação (rotação) |
| `fotos-imoveis.json` | `{ codigo: [urls de fotos extras] }` — usado p/ carrossel e reel |

**Controle:** `controle/estado-publicacao.json` (`indice` + `publicados[]`).
**Trilhas:** `TRILHAS/catalogo.json` (`[{nome, emocao, descricao, url}]`) + os `.mp3`.
**Imagens:** `public/anuncios/` (9:16), `public/anuncios-feed/` (4:5), `public/videos/`.
**Docs de apoio já existentes:** `META_AUTOMATION_ARCHITECTURE.md`,
`PROJETO-ROBO-POSTAGENS.md`, `GUIA-NOVO-IMOVEL.md`, `TROCA-DE-TOKEN.md`,
`MASTER_MARKETING_PLAYBOOK.md`, `COMPLIANCE_MATRIX.md`, `CLAUDE.md`, `AGENTS.md`.
**Não versionado:** `.env.local` (guarda o token localmente).

---

## 4. ACESSOS, TOKENS E CREDENCIAIS

> 🔒 **O REPOSITÓRIO É PÚBLICO.** Por isso os VALORES dos tokens **NÃO estão escritos
> neste arquivo** — se estivessem, qualquer pessoa na internet roubaria a conta.
> Abaixo está EXATAMENTE onde cada credencial vive e como você (Codex) a obtém.

| Credencial | Onde está | Como o Codex obtém |
|---|---|---|
| **META_PAGE_TOKEN** (Page Token) | (a) GitHub Secret `META_PAGE_TOKEN` (servidor); (b) `.env.local` na raiz do projeto no PC | No PC: leia `.env.local` (`META_PAGE_TOKEN=...`). O `publicar-servidor.js` já carrega esse arquivo sozinho. |
| **GITHUB_TOKEN** | Injetado automático pelo Actions | Já disponível (`${{ secrets.GITHUB_TOKEN }}`). |
| **Acesso git (push)** | Credencial do git já configurada no PC | Você roda no PC → `git push` já funciona. |
| **TikTok** (opcional) | Secrets NÃO criados | Criar `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN`. |
| **YouTube** (opcional) | Secrets NÃO criados | Criar `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`. |

**Cadastrar/atualizar Secrets** (só pela web, por segurança):
`github.com/escritoriocamposfigueira-commits/dashboard/settings/secrets/actions`

**Validade do token Meta:** Page Tokens expiram. Se falhar com `(#200)`,
`(#10) Requires ... permission` ou `OAuth`, o token venceu → gerar novo (siga
`TROCA-DE-TOKEN.md`) e atualizar o Secret + o `.env.local`.

**Permissões necessárias no token:** `pages_manage_posts`, `pages_read_engagement`,
`instagram_basic`, `instagram_content_publish`, `pages_show_list`.

---

## 5. META GRAPH API — COMO CADA CANAL É PUBLICADO (v22.0)

Base: `https://graph.facebook.com/v22.0/`. Sempre `access_token=<PAGE_TOKEN>`.

- **FB Feed (foto):** `POST /{PAGE_ID}/photos` com `url` (4:5) + `caption`.
- **FB Story (foto):** `POST /{PAGE_ID}/photos` `published=false` → `photo_id`
  → `POST /{PAGE_ID}/photo_stories` com `photo_id`.
- **FB Story (vídeo):** `POST /{PAGE_ID}/video_stories` `upload_phase=start` →
  upload binário em `rupload.facebook.com/video-upload/v22.0/{video_id}`
  (header `Authorization: OAuth <token>`, `offset:0`, `file_size`) → `upload_phase=finish`.
- **IG Feed (1 imagem):** `POST /{IG_ID}/media` `image_url` (4:5) + `caption`
  → poll `status_code=FINISHED` → `POST /{IG_ID}/media_publish` `creation_id`.
- **IG Feed (carrossel):** cada filho `POST /{IG_ID}/media` `is_carousel_item=true` +
  `image_url` → pai `media_type=CAROUSEL` + `children=[ids]` + `caption` →
  `media_publish` (2 a 20 imagens, mesma proporção).
- **IG Story:** `POST /{IG_ID}/media` `media_type=STORIES` + `image_url` OU `video_url`
  → poll → `media_publish`.
- **IG Reel:** `POST /{IG_ID}/media` `media_type=REELS` + `video_url` + `caption`
  → poll → `media_publish`.
- **FB Reel:** `POST /{PAGE_ID}/video_reels` `start` → upload em `rupload.facebook.com`
  → `finish` com `description`.

**Regra de ouro:** container de vídeo/imagem do IG leva alguns segundos pra ficar
`FINISHED` — sempre fazer poll antes do `media_publish`. Cada canal tem `try/catch`
isolado (se um falha, os outros publicam).

---

## 6. ESTRUTURA DOS DADOS

**`imagens-urls.json`** (manifesto / fila):
```json
{
  "ordem": ["429","458","476","...","CAPT-1"],
  "urls":      { "429": "https://raw.githubusercontent.com/.../public/anuncios/CF%20-%20429.png" },
  "urls_feed": { "429": "https://raw.githubusercontent.com/.../public/anuncios-feed/CF%20-%20429.png" }
}
```
- `ordem` = sequência. `urls` = 9:16 (story). `urls_feed` = 4:5 (feed). Novos vão no fim.

**`captions-imoveis.json`**: `[{ "codigo_imovel":"429", "arquivo":"CF - 429.png", "caption":"texto..." }]`
**`captacao.json`**: lista de posts de captação (rotação a cada N imóveis).
**`fotos-imoveis.json`**: `{ "604": ["url1","url2",...] }` — fotos extras p/ carrossel/reel.
**`estado-publicacao.json`**: `{ "indice":61, "publicados":[{codigo,data,fb_feed,fb_story,ig_feed,ig_story,...}], "tentativas":0 }`

---

## 7. VÍDEO (FFmpeg) — STORY/REEL COM MOVIMENTO + MÚSICA

- Entrada: imagem 9:16 (1080×1920). Saída: MP4 12s, H.264 + AAC.
- Efeito **Ken Burns** (zoom suave `zoompan`) + `format=yuv420p` + `faststart`.
- **Música por EMOÇÃO** detectada na legenda (`detectarEmocao`): urgência / familiar /
  conquista / confiança / sonho → busca no `TRILHAS/catalogo.json`. Fade nos últimos 2s.
- FFmpeg vem no runner (e em `C:\Users\Henrique\ffmpeg\bin` no PC).
- O vídeo sobe ao repo (GitHub Contents API) → vira URL pública que a Meta baixa.

---

## 8. REGRAS DE IMAGEM POR REDE (proporções exatas)

> Toda peça precisa de 2 versões: **4:5 (feed)** e **9:16 (story/reel)**.

### Instagram
| Formato | Proporção | Tamanho (px) | Observações |
|---|---|---|---|
| Feed / Carrossel | **4:5** | **1080 × 1350** | Também 1:1 (1080×1080). Carrossel: TODAS mesma proporção, 2–20 imagens. Máx 8 MB. |
| Story | **9:16** | **1080 × 1920** | ~250px topo e ~420px base LIVRES (UI do app cobre). |
| Reel | **9:16** | **1080 × 1920** | Vídeo H.264+AAC, 3–90s. |

### Facebook
| Formato | Proporção | Tamanho (px) | Observações |
|---|---|---|---|
| Feed | **4:5** ou 1:1 | **1080 × 1350** | Retrato tem melhor alcance. |
| Story / Reel | **9:16** | **1080 × 1920** | Mesma zona segura. |

Arquivo: PNG/JPG (imagem), MP4 H.264+AAC (vídeo). Nomear sempre `CF - <codigo>.png`.

---

## 9. ⭐ IDENTIDADE VISUAL — COMO CRIAR AS ARTES

> O Codex gera imagem (via ChatGPT/DALL-E). As artes do escritório têm estilo
> **premium dourado sobre preto**, MUITO consistente. Replique fielmente.

**Paleta:** fundo preto/grafite (#0A0A0A a #1A1A1A) · dourado gradiente (#C9A24B →
#E5C36A) · texto branco. Brilhos/partículas douradas sutis.
**Tipografia:** logo serifado ("CAMPOS FIGUEIRA"); manchetes sans-serif **bold
condensada, CAIXA ALTA**, palavras-chave em dourado.

**Layout padrão da arte de imóvel (topo → base):**
1. Monograma "CF" dourado + "ESCRITÓRIO CAMPOS FIGUEIRA · Negócios Imobiliários".
2. Badges dourados: `CÓDIGO: CF-XXX` e `FINALIDADE: VENDA` (ou LOCAÇÃO).
3. Manchete grande persuasiva ("ESPAÇO PARA TODA A FAMÍLIA E CONFORTO EM CADA DETALHE!").
4. Foto capa grande + tira de 2–3 miniaturas legendadas ("SALA AMPLA", "ÁREA GOURMET").
5. Linha: "TIPO À VENDA NO BAIRRO" + `📍 BAIRRO, MOGI DAS CRUZES`.
6. Caixa dourada grande com o PREÇO: `R$ 450.000,00`.
7. Grade de ícones dourados dos diferenciais (dorm., suíte, banheiros, garagem, gourmet…).
8. Faixa dourada com a condição: `ACEITA FINANCIAMENTO BANCÁRIO` / `SOMENTE À VISTA` / `ACEITA PERMUTA`.
9. CTA de sonho: "VIVA BEM. RECEBA QUEM VOCÊ AMA. REALIZE SEU SONHO!" + "AGENDE UMA VISITA".
10. Rodapé: logo + www.escritoriocamposfigueira.com.br (+ CRECI 043649-J discreto).

**Versões:** Feed 4:5 (1080×1350) com layout completo; Story 9:16 (1080×1920) mesmo
estilo, info no MEIO, foto maior, topo/base livres.

**Prompt-modelo para o gerador de imagem (ajuste os dados):**
```
Crie uma arte de anúncio imobiliário premium, proporção 4:5 (1080x1350), fundo preto
grafite com detalhes em dourado metálico e brilhos sutis. Topo: logo "ESCRITÓRIO
CAMPOS FIGUEIRA — Negócios Imobiliários" em dourado. Badges dourados "CÓDIGO: CF-XXX"
e "FINALIDADE: VENDA". Manchete caixa alta branca com palavras em dourado: "<MANCHETE>".
Foto grande do imóvel + 3 miniaturas legendadas. Caixa dourada com "R$ XXX.XXX,00".
Grade de ícones dourados: <DIFERENCIAIS>. Faixa dourada: "<CONDIÇÃO>". Rodapé com
"AGENDE UMA VISITA" e www.escritoriocamposfigueira.com.br. Estilo elegante,
sofisticado, alto contraste, texto legível. Sem marca d'água.
```
Depois gerar a 9:16 trocando "proporção 9:16 (1080x1920), informação central, topo e
base livres para a interface do story".

⚠️ **Fotos REAIS, sempre.** Puxe as fotos do imóvel no site
https://www.escritoriocamposfigueira.com.br (busque pelo CÓDIGO/REF). A IA monta o
LAYOUT/moldura dourada; as FOTOS do imóvel são reais (nunca invente foto de imóvel).

**Toda arte/legenda que o Codex criar deve ter, sem exceção:**
- o **mesmo esquema persuasivo** dourado sobre preto (layout acima);
- o **WhatsApp** `https://wa.me/551123785643`;
- o **link específico daquele imóvel** no site (a página dele) na legenda;
- o CÓDIGO/REF do imóvel, o valor e a condição corretos daquele imóvel.

---

## 10. COPYWRITING — ESTILO DOS TEXTOS

- Gancho 1–3 linhas em **sonho** / **dor do aluguel** / **medo de perder** / **emoção**. Varie.
- Depois: tipo + bairro + cidade, `💰 R$ valor`, diferenciais com ✅, condição.
- **NUNCA invente** valor/bairro/característica. Máx ~300 palavras.
- **Rodapé obrigatório** (troque só a PALAVRA-CHAVE):
```
👇 Manda "PALAVRA" no WhatsApp agora:
📲 https://wa.me/551123785643

Conheça nossas redes sociais!
📃 escritoriocamposfigueira@gmail.com
📲 instagram.com/escritorio.figueira
📲 instagram.com/henriquefigueiraoficial
📮 facebook.com/Escritorio.figueira
✅ escritoriocamposfigueira.com.br
⏰ Seg a Sex · 10h às 18h
CRECI: 043649-J
```

---

## 11. COMO ADICIONAR UM NOVO IMÓVEL / ANÚNCIO

1. Obter/gerar as 2 artes: `CF - <codigo>.png` em **4:5** e em **9:16**.
2. Colocar nas pastas de origem no PC: `...\IMAGENS ANUNCIOS\PROPORÇÃO 4.5\` e
   `...\IMAGENS ANUNCIOS\proporção 9.16\`.
3. Escrever a legenda em `captions-imoveis.json`.
4. (Opcional) fotos extras em `fotos-imoveis.json` (carrossel/reel).
5. `node PREPARAR-SERVIDOR.js` → copia p/ repo + atualiza manifesto + push.
6. Testar: disparar o workflow manualmente.

---

## 12. 🔒 REGRAS DE SEGURANÇA E COMPLIANCE (INVIOLÁVEIS)

- Repo **PÚBLICO** → NUNCA commite token/senha/chave. Segredos só em Secrets e `.env.local`.
- NUNCA faça robô que loga no Facebook/Instagram simulando humano — viola os Termos da
  Meta e pode **BANIR a conta/página**.
- NÃO poste em Grupos por API (removido em 2024) nem Status do WhatsApp (não há API).
- Não invente dados de imóvel. CRECI 043649-J deve constar. Não imite outra marca.

---

## 13. OPERAÇÃO

- **Disparar manual:** GitHub → Actions → "Publicar imóveis (servidor 24h)" → Run workflow.
- **Ver o que saiu:** `controle/estado-publicacao.json` + aba Actions.
- **Pausar:** desabilitar o workflow (ou comentar os `cron`).

---

## 14. SOLUÇÃO DE PROBLEMAS

| Sintoma | Causa | Solução |
|---|---|---|
| `(#200)` / `(#10) Requires permission` / `OAuth` | Token vencido/sem permissão | Novo token (TROCA-DE-TOKEN.md) + atualizar Secret e `.env.local`. |
| `Please reduce the amount of data` (FB feed) | Carrossel/foto grande | Reduzir nº de imagens/tamanho. |
| `write ECONNRESET` | Rede/host temporário | Repete na próxima execução. Usar GitHub raw (não catbox). |
| IG nunca fica FINISHED | Imagem/vídeo inacessível ou proporção inválida | Conferir URL raw (HTTP 200) e proporção. |
| Vídeo não gera | FFmpeg ausente | Workflow instala; no PC está em `C:\Users\Henrique\ffmpeg`. |

---

## 15. O QUE FALTA / ROADMAP

- [ ] Ativar TikTok e YouTube (criar Secrets — código pronto).
- [ ] Gerar novas artes (4:5 + 9:16) sob demanda.
- [ ] Renovar token da Meta antes de vencer.
- [ ] (Opcional) rotação seg–sex das locações; variações A/B de copy.

---

## 16. GLOSSÁRIO

- **Manifesto** = `imagens-urls.json` (fila + URLs). **Estado** = `estado-publicacao.json`.
- **Feed** = post 4:5. **Story** = 9:16 que some em 24h. **Reel** = vídeo curto 9:16.
- **Carrossel** = várias imagens no IG. **Captação** = post p/ atrair proprietários.
- **Ken Burns** = zoom/pan suave numa foto (vira vídeo). **Page Token** = credencial da
  Página do Facebook (dá acesso a FB + IG Business).

---

**FIM DO MANUAL.** Codex: confirme que leu tudo, dê um diagnóstico do estado atual
(quantos publicados, próximos da fila, erros recentes) e assuma o projeto. 🚀
