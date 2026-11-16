# Etapa 1 — medição e visibilidade

Data da validação: 16/11/2026.

## Resultado executivo

A análise recebida acertou os problemas de medição incompleta, repetição entre feed e Reel e ausência de leads consentidos. Algumas causas apresentadas eram hipóteses e não foram tratadas como fatos.

| Ponto | Resultado validado | Ação aplicada |
|---|---|---|
| Facebook com zero | Zero era usado também quando a API não devolvia a métrica. Portanto, não provava alcance zero. | Métrica ausente agora aparece como **não medido**. A coleta tenta primeiro as métricas atuais de visualização e alcance e preserva fallbacks compatíveis. |
| IDs diferentes do Facebook | Diferença de ID pode ser identidade pública/permalink ou página distinta. Não há base segura para trocar a página sem consultar a API autenticada. | O relatório consulta nome, ID, seguidores e Instagram vinculado da página configurada e compara com o ID numérico observado no permalink. Nenhuma página é trocada automaticamente. |
| YouTube privado | O robô já solicita `privacyStatus: public`; logo, a afirmação de que os vídeos “provavelmente” estão privados não estava comprovada. | Todo novo upload é rejeitado se a API responder com privacidade diferente de `public`. Para vídeos existentes, o relatório usa a API autenticada e, se faltar `youtube.readonly`, confirma acessibilidade pública por oEmbed sem inventar estatísticas. |
| TikTok | Pausado e sem credenciais de publicação disponíveis no workflow. | Permanece explicitamente como parcial, sem inventar métricas. |
| Feed e Reel duplicados | Confirmado na grade anterior. | O robô já foi alterado para escolher um único formato permanente por imóvel, mantendo Stories; os pesos iniciais são 60% Reel e 40% feed. |
| Mudança automática de pesos | A amostra anterior era insuficiente para decisões seguras. | Pesos só mudam quando um formato possui pelo menos 10 posts com alcance ou views realmente medidos. |
| Reexecução do relatório | A mesma data podia aplicar a variação de peso mais de uma vez. | A atualização de pesos agora é idempotente: reexecutar o relatório do mesmo dia apenas atualiza a medição. |

## Origem do radar

O radar possui 1.479 registros aguardando validação. Ele **não é uma base extraída do Google Maps** e também não deve ser chamado de “radar B2B”. Distribuição observada:

- Proprietário Direto: 954
- OLX: 355
- Diretório Mogi: 48
- Facebook: 29
- Grupo Facebook: 20
- Imovelweb: 19
- ZAP: 17
- Diretório listamogi: 13
- WebSearch/site próprio: 11
- WebSearch/construtoras: 8
- Corretor autônomo: 4
- WebSearch/síndicos: 1

O conjunto é majoritariamente composto por anúncios públicos de pessoas e imóveis: 1.023 oportunidades de venda, 235 de locação, 136 rurais, 77 parcerias e 8 de engenharia. Apenas 154 registros possuem telefone e nenhum possui e-mail empresarial validado. Portanto:

1. continua proibido disparo automático;
2. cada registro precisa de validação humana, base legal e consentimento antes de virar lead;
3. advocacia permanece fora de prospecção ativa;
4. o relatório passa a chamar o total de **oportunidades aguardando validação**, não de leads nem de B2B.

## Critérios novos do relatório

- Posts encontrados, vídeos publicamente acessíveis e posts com métricas medidas são contagens separadas.
- Ausência de alcance/views é `null` e aparece como **não medido**, nunca como zero.
- O relatório mostra mediana de views, além de média por formato.
- Uma recomendação de aumentar/reduzir formato exige amostra mínima de 10 posts medidos.
- Nenhum dado pessoal é gravado no relatório semanal.

## Execução validada em produção

Workflow concluído com sucesso: [GitHub Actions 43899984374](https://github.com/escritoriocamposfigueira-commits/dashboard/actions/runs/43899984374).

- Facebook: 34 posts; página configurada **Escritório Campos Figueira**, ID `512040582222121`; os 34 posts retornaram com o mesmo ID de página. As métricas atuais `post_media_view` e `post_total_media_view_unique` responderam para 34/34 posts e a mediana registrada foi 0. Portanto, nesta execução o zero veio da API atual, não de uma métrica ausente nem de uma página diferente.
- Instagram: 33 posts medidos; mediana de 12 visualizações/alcance no período.
- YouTube: 15 vídeos encontrados e 15 acessíveis publicamente; estatísticas continuam não medidas até renovar o OAuth com `youtube.readonly`.
- TikTok: pausado e não medido.
- Captação: 0 leads consentidos na semana; 1.479 oportunidades permanecem apenas no radar de validação.
- Pesos mantidos em `reel: 1.2` e `feed: 0.8`; reexecuções do mesmo dia não acumulam nova alteração.

## Pendências legítimas

- Renovar o consentimento OAuth do YouTube com `youtube.upload` + `youtube.readonly` para obter estatísticas e status exato de todos os Shorts. Enquanto isso, o relatório só consegue confirmar se o vídeo é acessível publicamente.
- A validação real encontrou **15 de 15 Shorts da semana acessíveis publicamente**. Não há evidência de que estejam privados.
- Conectar credenciais oficiais do TikTok antes de reativar publicação ou métricas.
- Coletar pelo menos uma semana de métricas corrigidas antes de reduzir novamente a frequência. A alteração de feed/Reel simultâneos já está ativa; uma nova mudança de cadência agora misturaria os efeitos.

