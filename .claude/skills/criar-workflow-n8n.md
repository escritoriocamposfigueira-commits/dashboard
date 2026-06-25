---
name: criar-workflow-n8n
description: >
  Projeta workflows n8n para automação de marketing imobiliário: publicação
  no Instagram/Facebook, qualificação de leads, notificações WhatsApp,
  relatórios automáticos. Use para: automatizar posts, integrar Lead Ads,
  configurar n8n, criar fluxo automático.
---

# /criar-workflow-n8n — Criar Workflow n8n

## Objetivo
Projetar e documentar workflows n8n prontos para importar, conectando
Meta Ads, Instagram, Facebook, WhatsApp Business e planilhas.

## Workflows Disponíveis

### Workflow 1 — Publicar Posts Automáticos
```
Trigger: Schedule (09:00 e 18:00)
  ↓
Read: Google Sheets / JSON (calendário de posts)
  ↓
Filter: posts com status = "PENDENTE" e data = hoje
  ↓
IF: tem imageUrl?
  ↓ SIM                    ↓ NÃO
Instagram API          Facebook só (texto)
(container + publish)  (feed/post)
  ↓
Update: marcar status = "PUBLICADO"
  ↓
Notify: WhatsApp/Telegram — "Post publicado: [ref]"
```

### Workflow 2 — Qualificação Automática de Leads
```
Trigger: Facebook Lead Ads Webhook
  ↓
Parse: dados do formulário (nome, telefone, interesse)
  ↓
Classify: score QUENTE/MORNO/FRIO (baseado em campos)
  ↓
Notify: WhatsApp Business → corretor responsável
  ↓
Store: Supabase/Sheets → CRM de leads
  ↓
IF: lead QUENTE → mensagem de boas-vindas automática
```

### Workflow 3 — Relatório Diário
```
Trigger: Cron 08:00 todo dia útil
  ↓
Fetch: Windsor.ai / Meta API → métricas do dia anterior
  ↓
Calculate: CTR, CPL, gasto, leads, alcance
  ↓
Compare: vs. média dos últimos 7 dias
  ↓
Format: relatório Markdown
  ↓
Send: WhatsApp / Email / Telegram
```

### Workflow 4 — Resposta Automática DMs Instagram
```
Trigger: Instagram Webhook (nova mensagem)
  ↓
Check: contém palavra-chave de imóvel?
  ↓ SIM
Extract: qual imóvel/ref mencionado?
  ↓
Fetch: dados do imóvel no banco
  ↓
Claude API: gerar resposta personalizada
  ↓
Send: resposta via Instagram API
  ↓ NÃO (outra mensagem)
Notify: atendente humano
```

## Requisitos Técnicos
- n8n v1.x (self-hosted ou cloud)
- Credenciais: Meta App (pages_manage_posts, leads_retrieval)
- Credenciais: WhatsApp Business API ou Z-API
- Credenciais: Google Sheets (service account)
- Credenciais: Anthropic API (para Claude nos workflows)

## Exemplos de Uso
1. "cria workflow para publicar posts do calendário automaticamente" → Workflow 1
2. "quero receber leads do Facebook no WhatsApp" → Workflow 2
3. "como configurar relatório diário automático?" → Workflow 3

## Limitações
- Workflows são documentados/exportados como JSON — requer n8n instalado para rodar
- Instagram só aceita imagens de URLs públicas (não locais)
- WhatsApp Business requer conta aprovada pelo Meta
