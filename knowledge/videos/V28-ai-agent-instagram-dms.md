# V28 — AI Agent Reply Instagram DMs n8n Claude

- Canal/Autor: Não identificado via pesquisa (possivelmente InstantDM ou BooSend)
- URL: Não encontrado via pesquisa
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

O vídeo demonstra como construir um agente de IA usando n8n e Claude (Anthropic) para responder automaticamente às mensagens diretas (DMs) do Instagram. Com o crescimento da geração de leads via Instagram, o volume de DMs pode ser impossível de gerenciar manualmente — especialmente para imobiliárias que recebem perguntas sobre imóveis 24 horas por dia.

O agente funciona via webhook: quando uma nova DM chega no Instagram Business, o Meta envia uma notificação para o n8n, que processa a mensagem, consulta o agente de IA e envia a resposta automaticamente. Claude é destacado neste contexto por sua capacidade de seguir instruções precisas e manter tom de voz consistente — características essenciais para uma imobiliária que precisa transmitir profissionalismo.

O sistema pode ser configurado em diferentes modos: resposta totalmente automática (sem intervenção humana), semi-automático (IA responde e notifica humano para aprovação), ou triagem (IA classifica urgência e distribui para o corretor certo). A integração com memória de conversa (histórico de mensagens anteriores) é fundamental para que o agente tenha contexto de conversas em andamento.

## Procedimento / Conceitos Principais

1. **Configurar webhook no Meta**: No App Meta, adicionar produto "Webhooks" → selecionar Instagram → assinar evento `messages`.
2. **URL de webhook no n8n**: Criar nó "Webhook" no n8n e registrar a URL no painel do Meta. Configurar Verify Token para validação.
3. **Validação de webhook**: O Meta envia um GET com `hub.challenge` para verificar o endpoint — n8n deve responder com o valor do challenge.
4. **Receber DM**: O payload inclui `sender_id`, `recipient_id`, `message.text` e timestamp.
5. **Buscar histórico de conversa**: Consultar banco de dados (Supabase, Airtable, Google Sheets) por `sender_id` para recuperar mensagens anteriores.
6. **Montar prompt para Claude**: Incluir contexto do negócio, portfólio de imóveis, políticas de atendimento e histórico da conversa.
7. **Chamar Claude via API**:
   ```json
   {
     "model": "claude-opus-4-5",
     "messages": [{"role": "user", "content": "[histórico + nova mensagem]"}],
     "system": "Você é assistente da Campos Figueira, imobiliária em Mogi das Cruzes..."
   }
   ```
8. **Enviar resposta via Instagram API**:
   ```
   POST /me/messages
   {
     "recipient": {"id": "{sender_id}"},
     "message": {"text": "{resposta_do_claude}"},
     "access_token": "{token}"
   }
   ```
9. **Salvar histórico**: Persistir a troca de mensagens no banco para contexto futuro.
10. **Lógica de escalonamento**: Se a IA detectar urgência ou intenção de compra clara, notificar corretor humano via WhatsApp.
11. **Limite de mensagens**: Instagram tem rate limits para mensagens enviadas via API — implementar queue se necessário.
12. **Mensagem fora do horário comercial**: Configurar resposta automática de "fora de horário" com expectativa de retorno humano.

## Conhecimentos Úteis

- Claude é descrito como o "seguidor de regras" entre os LLMs — excelente para manter tom de voz de marca e seguir guardrails de atendimento.
- A resposta de DMs no Instagram via API requer que o usuário tenha iniciado a conversa (janela de 24h) ou usar Message Tags para mensagens fora da janela.
- O Manychat é uma alternativa mais simples para automação de DMs do Instagram, mas menos flexível que n8n + Claude.
- BooSend e InstantDM são plataformas especializadas em DM automation que integram com Claude — alternativas ao n8n para quem prefere no-code.
- ReplyAgent (replyagent.com) permite conectar Claude ao Instagram para responder DMs, FAQs e agendar consultas.
- Identificar claramente nas DMs automáticas que é um assistente digital — melhor prática e requisito de transparência.
- O histórico de conversa é crítico para que o agente não repita perguntas já respondidas e mantenha coerência.
- Template n8n #14026: "Auto-reply to Instagram DMs with an AI chatbot and Google Gemini history" — adaptar para Claude.
- Template n8n #2718: "AI agent for Instagram DM/inbox. Manychat + Open AI integration" — referência de arquitetura.
- Métricas importantes: taxa de resposta (Meta exige >90% para manter badge), tempo médio de resposta, taxa de escalonamento para humano.

## Aplicação no Campos Figueira

- **Atendimento 24/7**: Potenciais compradores e locatários em Mogi das Cruzes podem fazer perguntas sobre imóveis a qualquer hora e receber resposta imediata.
- **FAQ automático**: Perguntas frequentes ("Qual o valor do condomínio?", "Aceita financiamento?", "Tem vaga de garagem?") respondidas automaticamente com dados do banco de imóveis.
- **Qualificação de leads via DM**: Quando um seguidor perguntar sobre um imóvel, o agente coleta interesse, faixa de preço e prazo antes de direcionar ao corretor — triagem automática.
- **Agenda de visitas**: Integrar com calendário dos corretores — quando lead qualificado quiser agendar visita, o agente verifica disponibilidade e confirma diretamente no chat.
- **Manutenção do badge de resposta rápida**: Instagram exige 90% de taxa de resposta para manter o badge — automatização garante isso sem esforço da equipe.
- **Escalonamento inteligente**: Leads que expressam intenção de compra clara são imediatamente escalados para um corretor humano com contexto completo da conversa.

## Validação

- **Aprovado**: A arquitetura n8n + Claude para DMs do Instagram é tecnicamente viável e documentada.
- **Confirmar**: Permissões necessárias na API do Instagram para responder DMs via endpoint `/me/messages`.
- **Atenção**: Janela de 24h para resposta — mensagens fora da janela requerem aprovação especial da Meta (Message Tags).
- **Aprovar**: Identificação clara de que é um agente automatizado nas primeiras mensagens.
- **Confirmar**: Conformidade com LGPD ao processar e armazenar conteúdo de conversas privadas.

## Decisão por Ensinamento

APROVADO COM ADAPTAÇÕES — Agente de IA para DMs do Instagram é transformador para a Campos Figueira. Implementar com modo semi-automático inicialmente (IA responde, notifica corretor para acompanhamento), evoluindo para totalmente automático após validação do tom e qualidade das respostas.
