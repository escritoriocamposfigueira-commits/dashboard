---
name: reverter-ultima-publicacao
description: Reverte a última publicação ou ação executada. Deleta post agendado no Facebook, remove post do Instagram ou pausa campanha criada. Requer confirmação antes de executar.
---
# /reverter-ultima-publicacao — Reverter Última Publicação

## O Que Pode Ser Revertido
✅ Post Facebook agendado (não publicado ainda) → deletar
✅ Post Facebook publicado (dentro de 24h) → deletar
✅ Post Instagram publicado (dentro de 24h) → deletar
✅ Campanha Meta Ads criada → pausar ou deletar
⚠️ Post publicado há mais de 24h → possível mas com aviso
❌ Mensagem WhatsApp enviada → não pode ser desfeita

## Fluxo
1. Mostrar o que será revertido (ID, plataforma, conteúdo)
2. Pedir confirmação: "CONFIRMAR REVERSÃO"
3. Executar via API:
   - DELETE /{post-id} para posts
   - PATCH /{campaign-id} com status=PAUSED para campanhas
4. Registrar no log de auditoria

## Após Reversão
- Registrar motivo da reversão
- Notificar equipe se necessário
- Criar plano de ação corretiva
