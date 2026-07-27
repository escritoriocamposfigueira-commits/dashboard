# Auditoria XML × Robô de Publicações — 27/07/2026

## Fonte auditada

- Feed oficial: `https://llktqtuzznpavszkszpu.supabase.co/functions/v1/property-xml-feed`
- Site: `https://www.escritoriocamposfigueira.com.br`
- Branch: `claude/campos-figueira-growth-qmjsux`

## Diagnóstico inicial

- XML: **85 anúncios**, correspondentes a **84 imóveis únicos**.
- Venda: **77 anúncios**.
- Locação: **8 anúncios**.
- O código `584` aparece no XML tanto para venda quanto para locação.
- Fila inicial do robô: **76 entradas**, cobrindo **75 imóveis ativos**.
- Imóveis ativos ausentes: **9** — **7 de venda** e **2 de locação**.
- Entrada antiga sem correspondência no XML ativo: `527`.

### Imóveis inicialmente ausentes

| Código | Finalidade | Situação inicial das artes |
|---|---|---|
| 417 | Venda | Feed e story ausentes |
| 421 | Venda | Feed existente; story ausente; condição da arte divergente |
| 440 | Venda | Feed existente; story ausente; condição da arte divergente |
| 459 | Venda | Feed existente; story ausente |
| 537 | Venda | Feed e story ausentes |
| 574 | Venda | Feed existente; story ausente |
| 598 | Venda | Feed e story ausentes |
| 619 | Locação | Feed e story ausentes |
| 620 | Locação | Feed e story ausentes |

## Correções aplicadas

- Inclusão dos nove imóveis ativos ausentes na fila.
- Remoção do `527` da fila, das legendas e dos carrosséis.
- Criação e validação das artes necessárias em:
  - feed: **1080 × 1350 px**;
  - story: **1080 × 1920 px**.
- Regeneração dos anúncios `541`, `575` e `617` para exibir os preços corretos.
- Correção das condições de pagamento de `421` e `440`.
- Correção das legendas genéricas de `429` e `458`.
- Inclusão do link específico do imóvel nas legendas que ainda não o possuíam.
- Inclusão das locações `619` e `620` na rotação semanal.
- Sincronização das fotos de carrossel com as URLs reais do XML.
- Criação dos aliases de carrossel para os quatro códigos legados usados pelo robô.

## Resultado final

- Fila do robô: **84 entradas**.
- Imóveis ativos cobertos: **84 de 84**.
- Imóveis ativos ausentes: **0**.
- Entradas da fila ausentes no XML: **0**.
- Divergências de preço, link obrigatório, WhatsApp ou CRECI nas legendas: **0**.
- Fotos extras cadastradas que não pertencem ao imóvel no XML: **0**.
- Pastas-mestre: **86 feeds** e **86 stories**, todos em pares.
- Arquivos duplicados por conteúdo: **0 grupos**.
- URLs de imagem da fila verificadas contra os arquivos locais: **168 de 168 presentes**.

Os dois arquivos excedentes em relação aos 84 imóveis ativos são o material `001`
e a arte histórica do `527`; o `527` foi preservado apenas na pasta-mestre, mas não
faz mais parte da fila e não será publicado.
