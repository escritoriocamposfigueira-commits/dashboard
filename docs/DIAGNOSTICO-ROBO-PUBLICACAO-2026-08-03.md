# Diagnóstico do robô de publicação — 03/08/2026

## Resultado executivo

- Causa das duplicações: a publicação externa concluía, mas o job falhava antes de gravar o novo ponteiro da fila no repositório.
- Causa do uso de artes no lugar das fotos: ausência/falha das fotos específicas acionava substituições silenciosas por uma única arte de feed ou por imagem estática no Story.
- Causa da última falha: `git add controle/estado-modelos-story.json` tentou adicionar um arquivo ignorado e, como o shell executa com `-e`, encerrou o job com código 1.
- Sobreposição: existe somente um workflow ativo; os cronogramas têm finalidades distintas e o grupo de concorrência serializa as execuções.

## Evidência da última falha — execução 30772394933

O imóvel `CF-CASA INDAIA BERTIOGA` chegou a ser publicado. Depois disso, a etapa de salvar o estado falhou:

```text
The following paths are ignored by one of your .gitignore files:
controle/estado-modelos-story.json
hint: Use -f if you really want to add them.
##[error]Process completed with exit code 1.
```

Antes dessa falha, a hospedagem do vídeo também registrou:

```text
Request path contains unescaped characters
```

Isso ocorria porque o nome do arquivo era colocado sem codificação segura no caminho da API do GitHub. A execução então continuava com Story de imagem, escondendo a perda do vídeo.

## Evidência da duplicação do CF-547

Execução 30701468241:

```text
GITHUB_SCHEDULE: 0 12 * * *
Regra agendada: venda
Publicando post #79 ... CF-547
FB Feed: ✅ 512040582222121_1643776691090839
The following paths are ignored by one of your .gitignore files:
controle/estado-modelos-story.json
##[error]Process completed with exit code 1.
```

Execução 30749672742, no dia seguinte:

```text
GITHUB_SCHEDULE: 0 12 * * *
Regra agendada: venda
Publicando post #79 ... CF-547
FB Feed: ✅ 512040582222121_1644723984329443
The following paths are ignored by one of your .gitignore files:
controle/estado-modelos-story.json
##[error]Process completed with exit code 1.
```

As duas execuções leram o mesmo `indiceVenda: 19`, pois a primeira nunca conseguiu persistir o avanço.

## Correções aplicadas

1. O estado dos modelos de Story foi liberado no `.gitignore` e é adicionado com `git add -f` no workflow.
2. Foi criada uma barreira dupla contra repetição por 30 horas:
   - consulta do histórico salvo no estado;
   - consulta dos posts recentes da própria página do Facebook pela legenda exata.
3. Um rerun preserva canais já concluídos e tenta somente os canais pendentes, evitando duplicar Facebook quando apenas Instagram falhou.
4. O botão manual ganhou a opção explícita `forcar_republicacao`; por padrão, reruns manuais continuam protegidos, mas uma republicação intencional não fica travada.
5. O caminho do vídeo enviado à API do GitHub passou a codificar cada segmento, eliminando espaços e caracteres não escapados.
6. Feed, Story, legenda e fotos específicas são obrigatórios. URL ausente, resposta HTTP inválida, conteúdo que não seja imagem ou arquivo pequeno demais agora geram erro visível.
7. Foram removidas as substituições silenciosas por arte única e por Story estático quando o vídeo falha.
8. Em carrossel, a falha de qualquer foto esperada faz o canal falhar visivelmente; ele não publica uma foto genérica no lugar.
9. As fotos foram sincronizadas com o catálogo público ativo do site: 83 códigos encontraram correspondência; `CF-527` foi preservado, mas retirado da prioridade porque não consta no catálogo ativo do site.

## Agendamentos e concorrência

- Venda: todos os dias, 09:00 BRT.
- Locação: todos os dias, 15:00 BRT.
- Locação extra: segunda-feira, 18:00 BRT.
- Captação: quarta-feira e sábado, 18:10 BRT.
- Recuperação de locação incompleta: todos os dias, 19:30 BRT.
- `concurrency.group: publicar-imoveis` e `cancel-in-progress: false`: uma execução espera a outra, sem sobreposição.

## Validações executadas

- 84 imóveis ativos no manifesto: 76 vendas e 8 locações.
- 84 vídeos vinculados e aprovados pelo validador da biblioteca.
- 84 artes de Story e 84 artes de feed presentes.
- 863 referências de imagem verificadas; 858 URLs únicas responderam como imagem; zero falhas.
- Zero URLs de arte repetidas e zero conjuntos completos de fotos repetidos entre imóveis.
- 14 testes automatizados aprovados.
- Simulação das 76 vendas: 76 códigos únicos antes da primeira repetição.
- A fila de vendas foi reiniciada no índice 0 para aplicar a nova prioridade comercial.

## Prioridade comercial inicial

Os primeiros anúncios são os que declaram entrada facilitada, parcelamento e/ou aceitação de veículo:

1. CF-516 — entrada de R$ 100 mil, parcelas e aceita carro.
2. CF-543 — entrada de R$ 50 mil, parcelamento e aceita carro.
3. CF-554 — entrada de R$ 25 mil e parcelas diretas.
4. CF-521 — entrada de R$ 100 mil e parcelas.
5. CF-559 — entrada de R$ 100 mil e parcelamento direto.
6. CF-596 — entrada facilitada, parcelamento e aceita veículo/apartamento.
7. CF-598 — entrada reduzida, parcelas e aceita carro.
8. CF-556 — parcelamento e aceita carro.
9. CF-605 — aceita entrada e parcelas.

A classificação mede potencial comercial declarado no texto; não é probabilidade estatística de venda, pois não há dados de leads, cliques e conversões por imóvel.

O relatório `RELATORIO-AUDITORIA-FILA-2026-08-03.md` contém a sequência completa dos 84 imóveis, as condições anunciadas, a quantidade de fotos e o vídeo/trilha de cada item.
