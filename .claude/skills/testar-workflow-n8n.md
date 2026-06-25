---
name: testar-workflow-n8n
description: Executa testes de workflows n8n em modo dry-run antes de ativar em produção. Verifica conexões, credenciais, dados de entrada/saída e comportamento esperado.
---
# /testar-workflow-n8n — Testar Workflow n8n

## Checklist de Teste
☐ Credenciais Meta configuradas e válidas?
☐ Webhook URL acessível publicamente?
☐ Dados de entrada no formato esperado?
☐ Nodes de erro configurados (Error Trigger)?
☐ Logs habilitados para auditoria?
☐ Teste com dados fictícios antes de dados reais?
☐ Rate limits considerados (25 posts/dia Instagram)?

## Teste por Workflow

**Workflow de Publicação:**
1. Testar com 1 post antes de rodar todos
2. Verificar se imagem URL é acessível publicamente
3. Confirmar timezone correto (America/Sao_Paulo)

**Workflow de Leads:**
1. Enviar lead fictício via Facebook Lead Ads Test Tool
2. Verificar se notificação chega no WhatsApp do corretor
3. Verificar se dados gravaram no CRM/Sheets

## Modo Dry-Run
Antes de ativar: inserir node "No Operation" no lugar dos nodes de ação.
Verificar se os dados chegam corretos, depois substituir por ação real.
