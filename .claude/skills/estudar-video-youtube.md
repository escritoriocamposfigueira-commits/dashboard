---
name: estudar-video-youtube
description: Pesquisa e documenta conhecimentos de vídeos do YouTube sobre Claude Code, Meta Ads, n8n e marketing imobiliário. Como YouTube está bloqueado no ambiente remoto, usa WebSearch para encontrar transcrições, resumos e artigos relacionados.
---
# /estudar-video-youtube — Estudar Vídeo YouTube

## Limitação do Ambiente
YouTube retorna 403 neste ambiente remoto. Método alternativo obrigatório.

## Método de Estudo Alternativo

1. **WebSearch** pelo título exato do vídeo entre aspas
2. **WebSearch** por "[título] transcript" ou "[título] summary"
3. **WebFetch** em páginas de blog que transcrevem/resumem o vídeo
4. **WebSearch** por "[canal] [tópico] tutorial" para encontrar artigos relacionados
5. Combinar com documentação oficial para validar

## Estrutura do Documento de Estudo

Salvar em `knowledge/videos/VXX-SLUG.md`:
```markdown
# VXX — Título
- Autor/Canal:
- URL:
- Status: RESUMO VIA PESQUISA
- Data:

## Resumo Técnico
## Procedimento / Comandos
## Conhecimentos Úteis
## Aplicação no Campos Figueira
## Validação
## Decisão por Ensinamento
```

## Exemplos de Uso
1. "estuda o vídeo sobre Meta Ads CLI no Claude Code" → pesquisa e documenta
2. "o que diz o vídeo do Thariq sobre Claude Agent SDK?" → busca resumo online
