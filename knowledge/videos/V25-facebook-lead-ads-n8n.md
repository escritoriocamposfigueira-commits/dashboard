# V25 — How to Connect Facebook Lead Ads to n8n

- Canal/Autor: Não identificado via pesquisa
- URL: Não encontrado via pesquisa
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

Este vídeo é um tutorial técnico focado especificamente na integração do Facebook Lead Ads com o n8n usando o nó "Facebook Lead Ads Trigger". Lead Ads são formulários nativos do Facebook/Instagram que permitem ao usuário enviar seus dados sem sair da plataforma, com campos pré-preenchidos automaticamente pelo Facebook — o que reduz drasticamente o atrito e aumenta a taxa de conversão comparado a landing pages externas.

A integração funciona via webhook: o Facebook envia uma notificação para o n8n toda vez que um novo lead preenche o formulário. O n8n captura esses dados e pode desencadear qualquer automação downstream — inserir no CRM, enviar WhatsApp, criar tarefa para corretor, disparar email, etc.

A principal limitação técnica é que o Facebook Lead Ads permite apenas um webhook por App registrado — o que cria um conflito entre URL de teste e URL de produção no n8n. A solução documentada é desativar o workflow de produção durante os testes e reativar depois.

## Procedimento / Conceitos Principais

1. **Configurar App Meta**: Em developers.facebook.com, criar ou usar App existente do tipo "Business". Adicionar produto "Facebook Login for Business".
2. **Solicitar Advanced Access**: Para `public_profile` e `leads_retrieval`, acessar App Review → Permissions and Features → solicitar acesso avançado. Sem isso, o webhook só funciona para admins do App.
3. **Ativar App Mode: Live**: Em App Settings → Basic → alterar modo de Development para Live. Obrigatório para receber leads reais.
4. **Configurar o nó no n8n**: Arrastar nó "Facebook Lead Ads Trigger" → selecionar credencial → selecionar Página do Facebook → selecionar Formulário.
5. **URL de webhook**: O n8n gera duas URLs — uma para teste (`/webhook-test/`) e uma para produção (`/webhook/`). O Facebook só pode ter uma registrada por vez.
6. **Registrar webhook no Facebook**: O n8n registra automaticamente quando você ativa o workflow. Verificar em Meta → Webhooks se a assinatura está ativa.
7. **Testar com lead falso**: Usar o Facebook Lead Ads Testing Tool (developers.facebook.com/tools/lead-ads-testing) para enviar um lead de teste sem gastar budget.
8. **Problema webhook único — solução**:
   - Para testar: desativar workflow de produção → ativar workflow de teste → executar teste.
   - Para produção: desativar workflow de teste → ativar workflow de produção → webhook de produção retoma automaticamente.
9. **Dados recebidos pelo trigger**: `leadgen_id`, `form_id`, `page_id`, `adgroup_id`, `ad_id`, campos do formulário (nome, email, telefone, campos customizados).
10. **Buscar dados completos do lead**: O trigger inicial traz apenas IDs. Para os dados completos, fazer GET `/leadgen_id?fields=field_data` usando os IDs recebidos.
11. **Mapear campos customizados**: Formulários com perguntas personalizadas (ex: "Qual bairro prefere?") chegam como array de objetos `{field_name, values}` — processar com nó Code ou Set.
12. **Integrar com downstream**: Após capturar e processar, conectar com: Google Sheets, CRM (HubSpot, Zoho, Pipedrive), WhatsApp, email marketing.

## Conhecimentos Úteis

- O Facebook Lead Ads Testing Tool é essencial — permite simular submissões de formulário sem gastar dinheiro em anúncios.
- A limitation de webhook único é o principal ponto de atenção — documentada na n8n Community e no docs oficial.
- O `leadgen_id` é único por lead e pode ser usado para deduplicação no CRM.
- Formulários de Lead Ads suportam campos pré-definidos (email, phone, name) e campos customizados — ambos chegam no mesmo payload.
- A integração é assíncrona: o Facebook envia o webhook com um pequeno delay após o preenchimento (geralmente segundos, mas pode ser minutos em horários de pico).
- Configurar retry logic no n8n para casos de falha de recebimento do webhook.
- O nó Facebook Lead Ads Trigger requer permissão `leads_retrieval` no token — diferente das permissões de anúncios.
- Verificar periodicamente se o webhook continua registrado no Meta — ocasionalmente pode ser deregistrado.
- A documentação oficial do nó está em: docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.facebookleadadstrigger/
- Para múltiplas páginas/formulários, criar um workflow para cada fonte ou usar lógica de roteamento baseada no `form_id`.

## Aplicação no Campos Figueira

- **Captura centralizada de leads**: Todos os formulários de Lead Ads da Campos Figueira (venda, locação, avaliação de imóvel) conectados ao n8n, que distribui para o workflow correto baseado no `form_id`.
- **Zero perda de leads**: Com webhook automático, nenhum lead fica perdido no Facebook — todos entram automaticamente no sistema.
- **Velocidade de resposta**: Lead preenche formulário às 22h → n8n captura instantaneamente → WhatsApp automático enviado em segundos → corretor notificado na manhã seguinte.
- **Dados enriquecidos**: Formulários com campos personalizados coletam: tipo de imóvel, faixa de preço, bairro, prazo — dados que chegam automaticamente ao CRM sem digitação manual.
- **Rastreamento de origem**: UTMs e dados da campanha chegam junto com o lead — sabendo exatamente qual anúncio gerou cada lead.
- **Conformidade LGPD**: O formulário de Lead Ads inclui o termo de consentimento do Facebook; arquivar esses dados no CRM para demonstrar compliance.

## Validação

- **Aprovado**: O nó Facebook Lead Ads Trigger do n8n é oficial e amplamente documentado.
- **Aprovado**: A limitação de webhook único é real mas tem workaround documentado e funcional.
- **Confirmar**: Processo de solicitação de Advanced Access — tempo de aprovação pela Meta pode levar dias/semanas.
- **Atenção**: App Mode deve estar em "Live" para receber leads reais — não esquecer essa configuração.
- **Confirmar**: Como lidar com leads duplicados (mesmo usuário preenchendo formulário mais de uma vez).

## Decisão por Ensinamento

APROVADO — A conexão Facebook Lead Ads → n8n é o primeiro passo fundamental de toda a automação de leads da Campos Figueira. Implementar imediatamente, pois é o gatilho de todos os outros workflows de qualificação e atendimento.
