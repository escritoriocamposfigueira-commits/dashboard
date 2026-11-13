# Implantar o captador — checklist operacional

O código da Fase 2 usa o Supabase já conectado e a API oficial da Meta. Nenhuma credencial
deve ser colada neste repositório público.

## 1. Supabase

1. Usar o projeto existente `ggfjmqttrktsfcaymsvu`.
2. No SQL Editor, executar
   `captador/supabase/migrations/202611130001_captador.sql`.
3. Gerar um valor aleatório com pelo menos 32 bytes para `CAPTADOR_INTERNAL_TOKEN`.
4. Configurar os secrets da função:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CAPTADOR_INTERNAL_TOKEN`,
   `WHATSAPP_IMOBILIARIA`, `WHATSAPP_ENGENHARIA`,
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

1. Conferir a URL pública e os telefones em `docs/captador/config.js`.
2. Publicar `docs/` no GitHub Pages.
3. Abrir as cinco páginas e enviar um lead de teste por operação.
4. Confirmar que `SAIR` cria bloqueio e remove os canais autorizados.

## 3. GitHub

O único secret adicional usado pelo captador é o `META_PAGE_TOKEN`, que já existe para o
publicador. Os workflows obtêm identidade temporária OIDC e não precisam guardar outro
token do Supabase no GitHub. O publicador já inclui o link rastreável e a palavra correta.

## 4. Comentários Meta

1. Publicar `.github/workflows/captador-meta.yml` na branch de produção.
2. O workflow usa o token oficial já existente, sem login automatizado.
3. A Edge Function deduplica cada comentário e gera uma única resposta pública com o WhatsApp.
4. Testar uma palavra por operação: `IMOVEL`, `ALUGAR`, `AVALIAR`, `OBRA` e `GUIA`.
5. Testar `SAIR`; o contato não pode voltar às listas de conteúdo.

## 5. Critérios para ativar

- `npm run test:captador` passa integralmente;
- `npm run captador:check -- --strict` informa API configurada;
- formulário cria/atualiza um único lead, sem duplicar telefone;
- CRM move o lead de etapa;
- comentário recebe resposta e registra a origem;
- advocacia retorna apenas o aviso de atendimento humano;
- relatório semanal contém apenas números agregados;
- nenhum segredo aparece no Git.

## Estado encontrado neste computador

Em 13/11/2026 o Supabase CLI foi autenticado e vinculado ao projeto existente. O caminho
principal não depende do ManyChat; ele pode continuar apenas como fallback opcional.
