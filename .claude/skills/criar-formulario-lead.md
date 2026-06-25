---
description: Cria especificação de formulário de Lead Ads para captação de leads imobiliários no Facebook e Instagram. Inclui perguntas de qualificação, consentimento LGPD, e configuração técnica. Produz especificação para revisão humana antes de criar na API.
---

# Skill: Criar Formulário de Lead

## Objetivo
Projetar formulários de Lead Ads otimizados para captação de leads imobiliários. Inclui perguntas certas para qualificação prévia do lead, consentimento LGPD obrigatório, e configuração técnica para integração com n8n/WhatsApp.

## Gatilhos
- `/criar-formulario-lead [tipo] [imovel]`
- "Criar formulário para captação de compradores"
- "Formulário de lead para locação"
- "Form de Lead Ad para proprietários"

## Entradas
- **Tipo de lead:** comprador, locatário, proprietário (quer vender/alugar)
- **Tipo de imóvel:** residencial, comercial, loteamento
- **Perguntas customizadas (opcional)**
- **CRM destino (opcional):** n8n webhook, planilha, etc.

## Saídas
Especificação completa do formulário em markdown com:
- Nome e idioma
- Intro copy
- Perguntas (com tipo: texto, múltipla escolha, range)
- Campos pré-preenchidos da API
- Política de privacidade (link + texto)
- Tela de agradecimento
- Configuração de webhook para n8n

## Modo Dry-Run
Esta skill produz especificação apenas — não cria formulário na API.

## Validações
1. Verificar que política de privacidade está incluída (obrigatório Meta + LGPD)
2. Confirmar que perguntas não são discriminatórias
3. Verificar consentimento explícito para contato

## Exemplos de Uso

### Exemplo 1: Formulário para compradores de imóvel residencial
```
/criar-formulario-lead "comprador" "residencial"
```
Perguntas: nome, telefone, faixa de valor, quartos desejados, bairro preferido, tem entrada?, usa FGTS?

### Exemplo 2: Formulário para proprietários querendo vender
```
/criar-formulario-lead "proprietário" "todos"
```
Perguntas: nome, telefone, tipo de imóvel, endereço aproximado, valor esperado, urgência

### Exemplo 3: Formulário para leads de locação comercial
```
/criar-formulario-lead "locatário" "comercial"
```
Perguntas: nome, empresa, CNPJ, área desejada, bairro, data de necessidade, uso pretendido

## Instruções para o Claude

1. Identificar tipo de lead e adaptar perguntas de qualificação
2. Definir nome do formulário: "CF - [Tipo Lead] - [Tipo Imóvel] - [Data]"
3. Criar intro copy (2-3 linhas): apresentar benefício de preencher o form
4. Selecionar campos pré-preenchidos da API Meta (sempre incluir):
   - FULL_NAME (nome completo)
   - PHONE (telefone) — CRÍTICO para WhatsApp
   - EMAIL (e-mail)
5. Adicionar perguntas de qualificação por tipo:
   **Comprador:**
   - Faixa de valor (múltipla escolha: até R$300k, R$300-500k, R$500k-1M, acima de R$1M)
   - Número de quartos (1, 2, 3, 4+)
   - Bairros preferidos em Mogi das Cruzes
   - Tem valor de entrada disponível? (Sim/Não)
   - Usa FGTS? (Sim/Não/Não sei)
   - Timeline: quando quer comprar? (imediato, 3 meses, 6 meses, 1 ano)
   **Locatário:**
   - Faixa de aluguel (múltipla escolha)
   - Tipo de imóvel (casa, apartamento, comercial)
   - Bairro preferido
   - Data de entrada desejada
   - Número de pessoas/finalidade
   **Proprietário:**
   - Tipo de imóvel (casa, apartamento, terreno, comercial)
   - Endereço aproximado (rua ou bairro)
   - Valor que espera receber (faixa)
   - Urgência para vender/alugar (imediato, 3 meses, 6 meses, sem pressa)
   - Imóvel tem documentação regularizada? (Sim, Não, Não sei)
6. Adicionar consentimento LGPD obrigatório:
   - Checkbox: "Autorizo a Campos Figueira a entrar em contato via WhatsApp e e-mail"
   - Link para política de privacidade
   - Texto: "Seus dados serão usados exclusivamente para atendimento imobiliário"
7. Criar tela de agradecimento:
   - Título: "Obrigado! Em breve entraremos em contato"
   - Descrição: "Nossa equipe vai analisar seu perfil e entrar em contato em até 2 horas úteis"
   - CTA: "Falar agora no WhatsApp" (link wa.me/)
8. Especificar configuração de webhook para n8n:
   - URL: N8N_WEBHOOK_URL/facebook-lead
   - Payload: todos os campos mapeados
9. Apresentar especificação completa para revisão
10. Adicionar notas sobre configuração na API Meta Lead Forms
