# Etapa 2 — amostras de tour vertical

Data da revisão: 10/11/2026
Status: pronto para aprovação visual; nenhuma publicação foi disparada.

## Entrega

Foram produzidas duas versões A/B para cada imóvel-piloto:

| Imóvel | Finalidade | Versão A | Versão B | Fotos reais distintas | Duração |
| --- | --- | --- | --- | ---: | ---: |
| CF-620 | Locação | Piscina + preço | Dormitórios + lazer | 8 | 25,9 s |
| CF-609 | Locação | Sala reformada + preço | Negócio + metragem | 6 | 26,4 s |
| CF-493 | Venda | Família + localização | Dormitórios + preço | 8 | 25,9 s |

Todos os seis arquivos estão em 1080 × 1920, 30 fps, com áudio AAC, trilha licenciada em volume baixo, arte premium somente depois de 20 segundos, CTA e CRECI 043649-J.

## Procedência das imagens

- CF-620: 31 fotos oficiais encontradas; oito usadas em cada amostra.
- CF-493: 26 fotos oficiais encontradas; oito usadas em cada amostra.
- CF-609: quatro fotos do cadastro e duas imagens 360 oficiais encontradas no próprio site; seis usadas em cada amostra. As imagens 360 foram apenas convertidas para projeção plana com FFmpeg.
- Não houve geração, reconstrução ou substituição de foto de imóvel por IA.
- Edição aplicada: enquadramento, correção leve de luz/cor, zoom/pan e sobreposição tipográfica.

## Validação automática

Os seis vídeos passaram sem erros nos seguintes controles:

- duração entre 20 e 30 segundos;
- resolução 1080 × 1920;
- 30 fps;
- áudio presente;
- no mínimo cinco fotos reais distintas;
- ausência da arte estática antes de 20 segundos;
- hash e procedência registrados no manifesto;
- publicação automática desativada.

Resultados completos: `public/videos-tour-amostras/validacao.json` e `public/videos-tour-amostras/manifesto.json`.

## Pendências semânticas detectadas

Estas divergências já existiam nos materiais anteriores e foram preservadas para não alterar uma arte aprovada sem autorização:

1. CF-493: o cadastro atual do site informa “aceita financiamento bancário”, enquanto a arte e a legenda antigas informam “somente à vista”. A condição precisa ser confirmada antes da publicação definitiva.
2. CF-620: a arte de locação contém a frase institucional “seu imóvel vendido”. Na etapa 3, deve ser trocada por texto próprio de locação.

## Critério para avançar

Após a aprovação de uma versão por imóvel, a etapa seguinte pode corrigir as divergências de conteúdo e aplicar o modelo aprovado ao lote. Até essa aprovação, os arquivos permanecem somente como amostras locais e não entram na fila do robô.
