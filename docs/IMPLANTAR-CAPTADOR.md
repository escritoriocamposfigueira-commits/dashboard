# Implantar o captador — checklist operacional

O código da Fase 2 está pronto, mas a ativação externa exige um projeto Supabase e a
conexão oficial do ManyChat. Nenhuma credencial deve ser colada neste repositório público.

## 1. Supabase

1. Criar o projeto `captador-campos-figueira`.
2. No SQL Editor, executar
   `captador/supabase/migrations/202611130001_captador.sql`.
3. Gerar dois valores aleatórios diferentes, com pelo menos 32 bytes:
   `CAPTADOR_INTERNAL_TOKEN` e `MANYCHAT_WEBHOOK_TOKEN`.
4. Configurar os secrets da função:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CAPTADOR_INTERNAL_TOKEN`,
   `MANYCHAT_WEBHOOK_TOKEN`, `WHATSAPP_IMOBILIARIA`, `WHATSAPP_ENGENHARIA`,
   `WHATSAPP_ADVOCACIA` e `CAPTADOR_ALLOWED_ORIGINS`.
5. Publicar a Edge Function `captador-api` com JWT público desativado. As rotas
   administrativas continuam protegidas pelo token interno.
6. Testar `GET https://<projeto>.supabase.co/functions/v1/captador-api/health`.

Alternativa por terminal autenticado:

```text
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --workdir captador
npx supabase functions deploy captador-api --no-verify-jwt --workdir captador
```

## 2. Páginas

1. Trocar somente a URL pública e o telefone jurídico em `docs/captador/config.js`.
2. Publicar `docs/` no GitHub Pages.
3. Abrir as cinco páginas e enviar um lead de teste por operação.
4. Confirmar que `SAIR` cria bloqueio e remove os canais autorizados.

## 3. GitHub

Secrets de Actions:

- `CAPTADOR_API_URL`
- `CAPTADOR_INTERNAL_TOKEN`

Variables de Actions, inicialmente desligadas:

- `CAPTADOR_ENABLED=false`
- `MANYCHAT_ACTIVE=false`
- `CAPTADOR_PAGES_URL=https://<dominio>/captador`

Depois dos testes do formulário, trocar `CAPTADOR_ENABLED=true`. Depois do teste real de
comentário/DM no ManyChat, trocar `MANYCHAT_ACTIVE=true`. A legenda do robô passa a incluir
automaticamente o link rastreável e a palavra correta.

## 4. ManyChat

1. Conectar oficialmente o Instagram/Facebook do escritório.
2. Criar as automações de `captador/manychat/keywords.json`.
3. Configurar a External Request conforme `captador/manychat/CONFIGURAR.md`.
4. Testar uma palavra por operação: `IMOVEL`, `ALUGAR`, `AVALIAR`, `OBRA` e `GUIA`.
5. Testar `SAIR`; o contato não pode voltar às listas de conteúdo.

## 5. Critérios para ativar

- `npm run test:captador` passa integralmente;
- `npm run captador:check -- --strict` informa API configurada;
- formulário cria/atualiza um único lead, sem duplicar telefone;
- CRM move o lead de etapa;
- comentário recebe DM e registra a origem;
- advocacia retorna apenas o aviso de atendimento humano;
- relatório semanal contém apenas números agregados;
- nenhum segredo aparece no Git.

## Estado encontrado neste computador

Em 13/11/2026 não havia Supabase CLI autenticado, `.env.local` do captador nem credenciais
do ManyChat neste worktree. Portanto, o código pode ser versionado e publicado, mas banco,
função e respostas reais não devem ser marcados como ativos até essas conexões existirem.
