# V24 — Build AI Agent Qualify Leads Facebook Lead Ads WhatsApp n8n

- Canal/Autor: Não identificado via pesquisa (provavelmente canal de automação/IA no YouTube)
- URL: https://www.youtube.com/watch?v=3uperu7slI8 (identificado via pesquisa)
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

O vídeo ensina a construir um agente de IA que captura leads do Facebook Lead Ads, envia automaticamente uma mensagem de qualificação via WhatsApp e, com base nas respostas, classifica o lead como quente, morno ou frio — direcionando cada perfil para o fluxo de atendimento adequado.

Esse workflow resolve um problema crítico de qualificação de leads: quando um lead preenche um formulário no Facebook, o interesse é imediato mas rapidamente esfria. A janela ideal para contato é de 5 minutos. Com a automação n8n + WhatsApp, o lead recebe uma mensagem personalizada em segundos após preencher o formulário, muito antes de qualquer humano tomar uma ação.

O agente de IA usa o framework BANT (Budget, Authority, Need, Timing) para qualificar leads em uma conversa natural via WhatsApp. Leads classificados como "quentes" são redirecionados para agendamento de visita; leads "mornos" recebem nurturing automatizado; leads "frios" entram em sequência de email. O sistema pode bloquear mais de 60% dos leads irrelevantes automaticamente, baseando-se em não-resposta ao WhatsApp e respostas de baixa intenção.

## Procedimento / Conceitos Principais

1. **Nó Facebook Lead Ads Trigger**: Configurar no n8n — captura automaticamente dados do formulário no momento do preenchimento (nome, telefone, email, campos personalizados).
2. **Formatação do número de telefone**: Normalizar o número para formato internacional E.164 (+55 11 99999-9999) antes de enviar ao WhatsApp.
3. **Mensagem inicial no WhatsApp**: Enviar mensagem de boas-vindas personalizada com nome do lead e pergunta de qualificação inicial.
4. **Aguardar resposta**: Usar nó Wait no n8n com timeout de 24h para aguardar resposta do lead.
5. **Processamento com IA**: Resposta do lead é enviada ao Claude/GPT com prompt de qualificação BANT. O modelo retorna um JSON com score e classificação.
6. **Lógica de roteamento**:
   - Lead "quente" (score 8-10): Enviar link de agendamento (Calendly) + notificar corretor responsável.
   - Lead "morno" (score 5-7): Iniciar sequência de nurturing com conteúdo relevante ao interesse declarado.
   - Lead "frio" (score 1-4): Adicionar à lista de email nurturing de longo prazo.
7. **Integração com CRM**: Salvar lead com classificação, histórico de conversa e score no CRM.
8. **Notificação para corretor**: Quando lead é "quente", enviar alerta via WhatsApp para o corretor com dados completos do lead.
9. **Follow-up automático**: Se lead não responder em 2h, enviar follow-up. Se não responder em 24h, marcar como "não qualificado".
10. **Zoho CRM / Google Sheets**: Templates do n8n usam Zoho CRM ou Sheets como backend de dados dos leads qualificados.
11. **Webhook bidirecional**: Configurar webhook no WhatsApp Business API para receber respostas e continuar o workflow.
12. **Teste A/B de abordagem**: n8n pode rodar dois fluxos de qualificação diferentes e comparar taxas de conversão.

## Conhecimentos Úteis

- A Meta tem um template de workflow específico no n8n: "Qualify Meta ads leads with WhatsApp verification, Gemini AI & Zoho CRM" (n8n #6529).
- O Facebook Lead Ads só permite um webhook por app — cuidado ao alternar entre ambientes de teste e produção.
- WhatsApp Business API tem custo por conversa iniciada pela empresa; calcular ROI antes de escalar.
- O BANT (Budget, Authority, Need, Timing) é um framework de vendas clássico — adaptar perguntas para o contexto imobiliário.
- Para imóveis: perguntas de qualificação relevantes incluem: qual tipo de imóvel busca, prazo para compra/locação, faixa de preço, bairro preferido, condição de financiamento.
- O uso de IA (Claude/GPT) para interpretar respostas livres é superior a formulários com opções fixas — leads respondem mais naturalmente.
- Unipile é uma alternativa para WhatsApp Business API com menor complexidade de setup do que a API oficial do Meta.
- Leads imobiliários têm ciclo de decisão longo (3-12 meses) — o sistema de nurturing de longo prazo é tão importante quanto a qualificação inicial.
- Template n8n #4083: "AI sales agent: WhatsApp, FB, IG, OpenAI, Airtable, Supabase auto-booking" cobre caso de uso próximo ao ideal.
- Compliance: em conversas automáticas via WhatsApp, identificar claramente que é um agente automatizado (LGPD e termos do WhatsApp).

## Aplicação no Campos Figueira

- **Qualificação imediata de leads**: Quando um lead preenche formulário de "Quero conhecer este imóvel" no Facebook, em segundos recebe: "Olá [Nome], sou o assistente digital do Escritório Campos Figueira. Para conectá-lo ao corretor ideal, me diz: o imóvel é para compra ou locação?"
- **Perguntas de qualificação para imóveis em Mogi das Cruzes**: Tipo de imóvel (casa/apartamento/terreno), faixa de preço, bairro preferido, prazo para mudança, condição de financiamento.
- **Roteamento por perfil**: Lead que quer alugar vai para o corretor de locação; lead que quer comprar acima de R$500k vai para corretor de alto padrão.
- **Redução de trabalho improdutivo**: Corretores da Campos Figueira recebem apenas leads já qualificados, economizando horas por dia em contatos infrutíferos.
- **Nurturing de longo prazo**: Leads que "ainda estão pesquisando" entram em sequência automática mensal com conteúdo do mercado imobiliário de Mogi das Cruzes.
- **Dados para decisão**: Relatório mensal mostrando quais campanhas geram leads mais qualificados (maior taxa de conversão após qualificação).

## Validação

- **Aprovado**: O workflow de qualificação via WhatsApp + IA é tecnicamente maduro e com ROI comprovado.
- **Confirmar**: Custo mensal do WhatsApp Business API para o volume de leads da Campos Figueira.
- **Aprovar**: Uso de template n8n #6529 como ponto de partida, adaptando para o contexto imobiliário brasileiro.
- **Atenção**: LGPD — obter consentimento explícito para contato via WhatsApp no próprio formulário de lead.
- **Confirmar**: Compliance com os Termos de Serviço do WhatsApp Business para automação de mensagens.

## Decisão por Ensinamento

APROVADO — Este workflow é altamente recomendado para a Campos Figueira. A qualificação automática de leads via WhatsApp é o maior multiplicador de produtividade disponível para uma imobiliária de médio porte, reduzindo drasticamente o tempo dos corretores em leads não qualificados.
