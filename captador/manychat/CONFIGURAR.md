# Configuração do ManyChat

O ManyChat responde comentários e DMs pela integração oficial do Instagram/Facebook. Não
há login simulado, raspagem ou mensagem para quem não iniciou contato.

## Uma automação por palavra

Use `keywords.json` como fonte. Para cada palavra:

1. Gatilho: usuário comenta a palavra em um post do perfil conectado.
2. Resposta pública curta: `Enviei as informações no seu direct ✅`.
3. DM: explicar o conteúdo e mostrar o botão `QUERO RECEBER`.
4. O botão abre a página indicada com:
   `?utm_source=comentario_instagram&utm_medium=organic&utm_campaign=PALAVRA`.
5. Antes da página, ou depois do formulário, faça uma External Request para:
   `POST <CAPTADOR_PUBLIC_URL>/webhooks/manychat`.

Headers:

```text
Authorization: Bearer <MANYCHAT_WEBHOOK_TOKEN>
Content-Type: application/json
```

JSON:

```json
{
  "contact_id": "{{contact.id}}",
  "nome": "{{first_name}} {{last_name}}",
  "telefone": "{{phone}}",
  "email": "{{email}}",
  "operacao": "imobiliaria",
  "interesse": "comprar imóvel",
  "palavra_chave": "IMOVEL",
  "rede": "instagram",
  "url_origem": "{{last_interaction_url}}"
}
```

Se telefone e e-mail ainda não existirem, o fluxo deve pedir o WhatsApp antes da External
Request. Nunca preencha contato inventado.

## Regra da advocacia

`GUIA` entrega apenas conteúdo educativo. A resposta automática permitida é:

> Recebemos sua solicitação. Um advogado responsável analisará o contato e responderá
> pessoalmente.

Não configurar orçamento, promessa de resultado, consulta grátis ou sequência comercial.

## Palavra SAIR

Crie uma automação de DM para `SAIR`, `PARAR` e `DESCADASTRAR` que chame:

```text
POST <CAPTADOR_PUBLIC_URL>/unsubscribe
```

com o telefone/e-mail e a operação. A API bloqueia imediatamente novos conteúdos.
