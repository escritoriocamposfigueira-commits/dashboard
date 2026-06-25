---
description: Configura plano de campanha Meta Ads Click-to-WhatsApp para Campos Figueira. Cria especificação com mensagem pré-preenchida, público, orçamento e configuração técnica. Inclui Special Ad Category HOUSING. Produz plano para aprovação humana.
---

# Skill: Criar Campanha Click-to-WhatsApp

## Objetivo
Planejar campanhas Meta Ads com CTA "Enviar Mensagem" que abre direto no WhatsApp Business da Campos Figueira. Ideal para leads de alta qualidade que querem conversar antes de preencher formulário. Inclui configuração de mensagem pré-preenchida personalizada por tipo de imóvel.

## Gatilhos
- `/criar-campanha-whatsapp [imovel] [publico]`
- "Campanha para WhatsApp"
- "Anúncio com botão WhatsApp"
- "Click-to-WhatsApp para apartamentos"

## Entradas
- **Tipo de imóvel:** residencial, comercial, terreno, lançamento
- **Público-alvo:** descrição
- **Mensagem pré-preenchida:** texto que aparece quando lead clica
- **Orçamento diário:** R$
- **Número WhatsApp Business:** padrão 55 11 XXXX-XXXX (confirmar com usuário)

## Saídas
Plano de campanha em `campaigns/whatsapp-[slug]-[data].md` com:
- Configuração técnica da campanha
- Mensagem pré-preenchida otimizada
- Fluxo de atendimento após primeiro contato
- Configuração de resposta automática n8n (spec)

## Modo Dry-Run
Esta skill produz plano apenas — não cria campanha na API.

## Exemplos de Uso

### Exemplo 1: WhatsApp para apartamentos de 2 quartos
```
/criar-campanha-whatsapp "apartamentos 2 quartos" "casais jovens Mogi das Cruzes" orçamento=R$40/dia
```
Mensagem: "Olá! Vi o anúncio dos apartamentos de 2 quartos em Mogi. Quero saber mais sobre valores e condições."

### Exemplo 2: WhatsApp para captação de proprietários
```
/criar-campanha-whatsapp "captação proprietários" "proprietários Mogi" orçamento=R$25/dia
```
Mensagem: "Olá! Tenho um imóvel e gostaria de uma avaliação gratuita da Campos Figueira."

### Exemplo 3: WhatsApp para lançamento de empreendimento
```
/criar-campanha-whatsapp "lançamento Residencial XYZ" "público geral Mogi" orçamento=R$80/dia
```
Mensagem: "Olá! Quero receber informações sobre o lançamento do Residencial XYZ. Qual o valor e condições?"

## Instruções para o Claude

1. Confirmar número do WhatsApp Business da Campos Figueira
2. Definir nome da campanha: "CF - WhatsApp - [Tipo Imóvel] - [MMM/AAAA]"
3. Configurar objetivo: OUTCOME_LEADS com destination_type: WHATSAPP
4. SEMPRE incluir special_ad_categories: ["HOUSING"]
5. Criar mensagem pré-preenchida (máximo 160 caracteres):
   - Mencionar o tipo de imóvel visto no anúncio
   - Tom casual mas profissional
   - Indicar intenção clara (ver mais, agendar, saber valor)
6. Definir público respeitando restrições HOUSING
7. Configurar posicionamentos recomendados: Feed Instagram/Facebook, Stories
8. Especificar horário de veiculação: 8h-22h (horário comercial estendido)
9. Criar spec de resposta automática n8n:
   - Webhook recebe nova conversa WhatsApp
   - Bot envia mensagem de boas-vindas personalizada
   - Coleta nome e interesse
   - Notifica atendente humano
10. Incluir script de primeiro atendimento humano
11. Salvar em `campaigns/whatsapp-[slug]-[YYYY-MM-DD].md`
12. Concluir com checklist de aprovação
