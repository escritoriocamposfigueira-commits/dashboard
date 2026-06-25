---
name: criar-carrossel-e-publicar
description: >
  Fluxo completo: cria carrossel visual para um imóvel ou tema, exporta os slides
  como PNG, e publica automaticamente no Instagram + Facebook Page + Grupos.
  Use quando o usuário disser "cria carrossel", "faz post do imóvel", "publica no
  Instagram", "cria e posta", "faz carrossel do [imóvel]", "posta nos grupos",
  ou qualquer combinação de criar conteúdo visual e publicar nas redes.
  O usuário fornece apenas os dados do imóvel — Claude faz o resto.
---

# Criar Carrossel e Publicar — Fluxo Completo

Workflow de 5 etapas: briefing → design → export → aprovação → publicar.

---

## ETAPA 0 — Verificar pré-requisitos

Antes de tudo, verificar rapidamente:

```bash
# Verificar se tokens estão configurados
grep -E "META_PAGE_TOKEN|META_USER_TOKEN" /home/user/dashboard/.env.local 2>/dev/null | head -2
```

- Se não existir `.env.local` com os tokens → instruir usuário a configurar (`/setup-instagram`)
- Se existir → prosseguir

---

## ETAPA 1 — Briefing do imóvel (mínimo necessário)

Pedir APENAS o essencial. Não bombardear com perguntas.

> "Me passa os dados do imóvel (pode ser bem resumido):"

Coletar:
- **Tipo**: Venda ou Locação?
- **Descrição**: apartamento/casa/terreno, quartos, m², bairro/cidade
- **Valor**: preço de venda ou aluguel
- **Diferencial**: o que faz esse imóvel se destacar (vista, posição do sol, reforma, etc.)
- **Foto disponível?** (URL pública ou arquivo) — se não tiver, o carrossel usa design sem foto

Se o usuário já der essas informações na mensagem inicial, pular direto para ETAPA 2.

---

## ETAPA 2 — Criar o carrossel visual

Usar a skill `/instagram-carousel` com os seguintes parâmetros fixos da marca:

**Marca Escritório Campos Figueira:**
- Brand name: `Escritório Campos Figueira`
- Instagram handle: `@escritoriocamposfigueira`
- Primary color: `#1B4F72` (azul marinho — trocar se o usuário tiver cor diferente)
- Font: `Plus Jakarta Sans` — estilo Modern / clean
- Tone: profissional, confiável, direto
- Idioma: **Português (BR)**

**Sequência de slides para imóvel (5 slides):**

| # | Tipo | Conteúdo |
|---|------|---------|
| 1 | Hero (LIGHT_BG) | Foto do imóvel ou arte clean · Hook: benefício principal em 1 linha |
| 2 | Destaque (DARK_BG) | 3–4 características principais com ícones (m², quartos, localização, valor) |
| 3 | Diferenciais (Brand gradient) | O que faz esse imóvel valer o preço — emoção, sonho, estilo de vida |
| 4 | Localização (LIGHT_BG) | Bairro, proximidades, infraestrutura, facilidades |
| 5 | CTA (Brand gradient) | "Agende sua visita" · WhatsApp · @handle · logo |

**Copy persuasivo obrigatório:**
- Slide 1: frase de impacto emocional (sonho, conquista, liberdade)
- Slide 3: linguagem de aspiração — o estilo de vida que o imóvel entrega, não apenas as características
- Slide 5: urgência suave — "Poucas unidades disponíveis" / "Oportunidade única"

Gerar o HTML preview completo com Instagram frame.

---

## ETAPA 3 — Revisão e aprovação

Mostrar o preview e perguntar:

> "Quais slides precisam de ajuste antes de exportar?"

Aguardar resposta. Fazer apenas os ajustes indicados.

Quando o usuário disser "aprovado", "ok", "pode exportar" → prosseguir para ETAPA 4.

**NUNCA exportar ou publicar sem aprovação explícita.**

---

## ETAPA 4 — Exportar slides como PNG

Usar o script de export do skill `instagram-carousel`:

```python
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

# Configurações fixas
INPUT_HTML = Path("/tmp/claude-carousel/carousel.html")
OUTPUT_DIR = Path("/tmp/claude-carousel/slides")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TOTAL_SLIDES = 5  # ajustar conforme o carrossel gerado

VIEW_W = 420
VIEW_H = 525
SCALE = 1080 / 420

async def export_slides():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(
            viewport={"width": VIEW_W, "height": VIEW_H},
            device_scale_factor=SCALE,
        )
        await page.set_content(INPUT_HTML.read_text(encoding="utf-8"), wait_until="networkidle")
        await page.wait_for_timeout(3000)

        await page.evaluate("""() => {
            document.querySelectorAll('.ig-header,.ig-dots,.ig-actions,.ig-caption')
                .forEach(el => el.style.display='none');
            const frame = document.querySelector('.ig-frame');
            frame.style.cssText = 'width:420px;height:525px;max-width:none;border-radius:0;box-shadow:none;overflow:hidden;margin:0;';
            const viewport = document.querySelector('.carousel-viewport');
            viewport.style.cssText = 'width:420px;height:525px;aspect-ratio:unset;overflow:hidden;cursor:default;';
            document.body.style.cssText = 'padding:0;margin:0;display:block;overflow:hidden;';
        }""")
        await page.wait_for_timeout(500)

        for i in range(TOTAL_SLIDES):
            await page.evaluate("""(idx) => {
                const track = document.querySelector('.carousel-track');
                track.style.transition = 'none';
                track.style.transform = 'translateX(' + (-idx * 420) + 'px)';
            }""", i)
            await page.wait_for_timeout(400)
            await page.screenshot(
                path=str(OUTPUT_DIR / f"slide_{i+1}.png"),
                clip={"x": 0, "y": 0, "width": VIEW_W, "height": VIEW_H}
            )
            print(f"Exportado slide {i+1}/{TOTAL_SLIDES}")

        await browser.close()

asyncio.run(export_slides())
```

Após export, verificar se os slides foram gerados:
```bash
ls -la /tmp/claude-carousel/slides/
```

---

## ETAPA 5 — Publicar em todas as plataformas

Com os slides exportados, chamar o script de publicação:

```bash
# Caption completo gerado na ETAPA 2 (slide 5)
CAPTION="[caption_gerado_no_carrossel]"

# Publicar no Instagram + Facebook Page
python3 /home/user/dashboard/src/scripts/publicar_instagram.py \
  --slides /tmp/claude-carousel/slides/slide_*.png \
  --caption "$CAPTION"

# Para publicar também nos 3 Grupos do Facebook, adicionar --grupos:
python3 /home/user/dashboard/src/scripts/publicar_instagram.py \
  --slides /tmp/claude-carousel/slides/slide_*.png \
  --caption "$CAPTION" \
  --grupos
```

O script faz automaticamente:
1. Upload de cada slide para catbox.moe (URL pública temporária)
2. Cria containers individuais no Instagram
3. Monta o carrossel com todos os slides
4. Publica no Instagram
5. Publica na Página do Facebook
6. (Se --grupos) Publica nos 3 grupos do Facebook

---

## ETAPA 6 — Confirmação final

Mostrar resultado ao usuário:

```
✅ Publicado com sucesso!

Instagram:      https://www.instagram.com/p/[ID]
Facebook Page:  post ID [ID]
Grupos:         3/3 publicados

Próximo passo: verificar no Instagram/Facebook se o post apareceu corretamente.
```

---

## Troubleshooting rápido

| Erro | Causa | Solução |
|------|-------|---------|
| `META_PAGE_TOKEN não configurado` | .env.local sem token | Rodar `/setup-instagram` |
| `OAuthException #200` | Token errado (User em vez de Page) | Usar Page Token da ECF |
| `catbox.moe upload falhou` | Conexão instável | Tentar novamente — catbox pode ter instabilidade |
| `Container ERROR` | Imagem com formato inválido | Verificar se é PNG válido com `file slide_1.png` |
| Carrossel sem foto | Nenhuma foto foi fornecida | Design só texto funciona — ou pedir URL da foto |

---

## Notas de operação

- **Tokens**: salvar em `.env.local` na raiz do projeto (já ignorado pelo `.gitignore`)
- **catbox.moe**: hospedagem gratuita e temporária (30 dias sem conta) — suficiente para publicar
- **Instagram carousel**: mínimo 2 slides, máximo 10
- **Grupos**: precisam do User Token com `publish_to_groups` — separado do Page Token
- **Publicação imediata**: este workflow publica agora. Para agendar, usar `/agendador` no painel web
