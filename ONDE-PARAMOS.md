# 📍 ONDE PARAMOS — Checkpoint do Robô (03/07/2026)

> Ponto de retomada. Robô publicando sozinho. Continuar pelo que falta (fim do arquivo).

## ✅ PRONTO E RODANDO (automático, sem depender do PC)

- **Robô automático** via GitHub Actions, 09h e 18h (BRT), todo dia. Branch: `claude/campos-figueira-growth-qmjsux`.
- **Token Meta PERMANENTE** ("Expira: Nunca") no Secret `META_PAGE_TOKEN`. Renovar ~out/2026 (ver `TROCA-DE-TOKEN.md`).
- **4 canais por post:** Facebook Feed + Story, Instagram Feed + Story.
- **Story em VÍDEO com música** (9:16, Ken Burns + trilha royalty-free). FB e IG. (Fix da URL do IG aplicado.)
- **Feed 4:5** com a arte premium. No IG vira **CARROSSEL** (arte + fotos reais do imóvel, das 73 fichas com foto).
- **Legendas:** link individual do imóvel (61) + WhatsApp com mensagem pronta (76). Número: (11) 2378-5643.
- **Rotação INFINITA (sem data de fim):** 6 locações 1x/semana (seg–sex) + vendas + captação, misturadas. Ao esgotar, recomeça sozinho. Provado com 300 posts simulados.
- **A lista cresce sozinha:** adicionar imóvel em `src/content/imagens-urls.json` (+ legenda em `captions-imoveis.json`) → entra no rodízio na hora.
- **Captação:** 4 artes na rotação (~2x/semana) com o link do grupo do WhatsApp.
- **Alertas (ntfy):** código pronto (canal `escritorio-cf-alertas`).

### 6 locações fixas (repetem 1x/semana)
584, 607, 609, 609B, CASA INDAIA BERTIOGA, CASA JARDIM ARMENIA
(definidas em `LOCACAO_CODES` no `scripts/publicar-servidor.js`)

### Arquivos-chave do robô
- `scripts/publicar-servidor.js` — motor (rotação, vídeo, carrossel, captação, alertas)
- `.github/workflows/publicar.yml` — agendador 9h/18h + FFmpeg
- `src/content/imagens-urls.json` — lista/ordem dos imóveis (arte feed 4:5 + story 9:16)
- `src/content/captions-imoveis.json` — legendas
- `src/content/fotos-imoveis.json` — fotos reais p/ carrossel
- `src/content/captacao.json` — 4 artes de captação
- `controle/estado-publicacao.json` — memória da fila (quem já saiu)
- `public/captacao/` — imagens das artes de captação
- `TRILHAS/` — 5 músicas + catálogo

### Links importantes
- Grupo WhatsApp: https://chat.whatsapp.com/LKdWAV8S8fIHALaUgC2WMn
- Site: https://www.escritoriocamposfigueira.com.br (repo `campos-figueira-rebuild`)
- Bios novas prontas: ver `REGRAS-MARKETING.md` (branch da doc)

## ⏳ FALTA (retomar por aqui)

1. **📱 Ativar alerta no celular:** instalar app **ntfy** (iOS/Android) → assinar canal `escritorio-cf-alertas`. + ligar a chamada do alertar.js no fluxo (verificar se já está ativa).
2. **🖼️ Colar a BIO nova** no Instagram e Facebook + link do WhatsApp na bio + botão WhatsApp no perfil (textos prontos em REGRAS-MARKETING.md).
3. **🎠 Confirmar o carrossel ao vivo** na próxima VENDA (imóvel com fotos) — ainda não estreou porque a semana fechou com locações.
4. **📹 TikTok e YouTube:** montar publicação (precisa de app/chave nova de cada plataforma — cadastro à parte que o dono gera).
5. **➕ Facilitar cadastro de novos imóveis** (modelo pronto p/ o dono adicionar sozinho) — opcional.
6. **(Opcional)** carrossel/álbum também no Facebook (hoje FB feed é imagem única).

## ▶️ Como retomar
- Robô continua rodando sozinho enquanto isso.
- Para publicar na hora (sem esperar 9h/18h): disparar o workflow `publicar.yml` (branch acima).
- Sessão na nuvem audita pelas APIs; Claude PC faz builds locais.

## ⚠️ Limites honestos (não são bugs)
- Sticker de WhatsApp clicável no Story: a Meta NÃO libera via robô (só manual). Número vai na arte + botão do perfil.
- Link na legenda do IG não é clicável (regra Meta) — clicável só na bio e sticker de story.
