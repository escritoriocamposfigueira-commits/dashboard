# 🤖 ROBÔ 2.0 — Especificação Completa da Reconstrução

> Este documento é uma ORDEM DE SERVIÇO para o Claude Code no PC do escritório.
> NÃO é só reativar o robô antigo: é RECONSTRUIR conforme abaixo. Cada item é obrigatório.
> Regras-mãe: REGRAS-MARKETING.md • Grade: CALENDARIO-SEMANAL.md • Contexto: PLANO-RECUPERACAO.md

## FASE 1 — Religar a base (pré-requisito)
1.1. Localizar o projeto do robô no PC (Supabase + fila de publicações).
1.2. Trocar o token vencido da Meta por token novo de longa duração (página "Escritório Campos Figueira" + IG @escritorio.figueira).
1.3. Testar 1 post feed + 1 story. Confirmar publicação real.

## FASE 2 — Cadastro completo dos imóveis (refazer)
2.1. Sincronizar TODOS os imóveis do site (repo `campos-figueira-rebuild` / banco do site): código (ex.: CF-607), finalidade (locação/venda), tipo, bairro, preço, destaques, fotos.
2.2. Marcar status: disponível / alugado / vendido. Imóvel indisponível SAI da fila automaticamente.
2.3. Vincular cada imóvel às suas imagens em `D:\01 - ESCRITÓRIO IMOBILIÁRIO\04- REDE SOCIAL\IMAGENS ANUNCIOS` (que já estão separadas por proporção).

## FASE 3 — Motor de agendamento (refazer a lógica)
3.1. **Rotação de locação:** TODOS os imóveis de locação disponíveis publicados no MÍNIMO 1x/semana cada, distribuídos de segunda a sexta (ex.: 15 imóveis → ~3/dia), sem repetir o mesmo imóvel no mesmo dia.
3.2. **Vendas misturadas:** intercalar imóveis de venda entre as locações (ver grade no CALENDARIO-SEMANAL.md).
3.3. **Multi-canal com proporção correta POR CANAL (obrigatório):**
   - Facebook Feed 4:5 (1080×1350) • Facebook Story 9:16 (1080×1920)
   - Instagram Feed 4:5 • Instagram Story 9:16
   - TikTok 9:16 • YouTube Shorts 9:16 (se a integração do robô suportar; senão, gerar o material e deixar pronto para agendamento manual + documentar como)
   - O robô deve escolher automaticamente o arquivo da proporção certa da pasta de imagens. NUNCA publicar proporção errada.
3.4. **Carrosséis:** mínimo 4 a 6 por semana (destaques, captação de proprietários, prova social "alugados da semana", engenharia).
3.5. **Diária premium:** pelo menos 1 imagem estilo premium por dia (padrão CF-607: fundo escuro + dourado + selos de informação).
3.6. **Frentes complementares semanais:** 1 post de engenharia civil + 1 de advocacia + 1 de captação de proprietários (no mínimo).

## FASE 4 — Motor de copy (refazer)
4.1. Toda copy segue: HEADLINE forte → DOR ou SONHO → solução → CTA WhatsApp.
4.2. **CTA obrigatório e em destaque: WhatsApp (11) 2378-5643.**
4.3. **Nunca repetir copy:** guardar histórico das copies usadas por imóvel e gerar variação nova a cada publicação (mínimo 4 variações por imóvel antes de reciclar).
4.4. Usar o banco de modelos do CALENDARIO-SEMANAL.md como base de estilo (locação, venda, captação, engenharia, advocacia).
4.5. 100% ORGÂNICO: nenhuma campanha paga sem ordem expressa do proprietário.

## FASE 5 — Blindagem anti-pausa (novo, obrigatório)
5.1. Alerta automático (WhatsApp ou e-mail) quando uma publicação FALHAR.
5.2. Alerta diário de resumo: o que foi publicado hoje + o que está na fila de amanhã.
5.3. Verificação de validade do token 1x/dia; alerta com 7 dias de antecedência do vencimento.
5.4. Documento "TROCA-DE-TOKEN.md" no projeto: passo a passo leigo para renovar o token em minutos após qualquer troca de senha.

## FASE 6 — Perfis (aplicar)
6.1. Bios novas do Instagram e Facebook: textos prontos em REGRAS-MARKETING.md §6 (orientar o proprietário a colar; API não edita bio).
6.2. Campo Site do IG: link wa.me/551123785643.
6.3. Botão de WhatsApp ativo nas duas páginas.

## FASE 7 — Relatório final (entregar ao proprietário)
7.1. Print/confirmação de cada fase concluída.
7.2. Fila das próximas 2 semanas gerada e visível.
7.3. Lista do que ficou manual (ex.: stories TikTok/YouTube se a API não permitir) com o passo a passo de cada um.

---
*Critério de pronto: robô publicando sozinho em todos os canais suportados, com rotação semanal completa de locação, copies únicas com WhatsApp em destaque, proporções corretas e alertas ativos.*
