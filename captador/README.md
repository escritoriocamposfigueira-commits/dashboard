# Captador Campos Figueira — Fase 2

Sistema separado do robô de publicação para transformar interesse voluntário em leads
organizados, rastreáveis e atendidos pelo escritório. O publicador continua funcionando
mesmo que o captador esteja indisponível.

## Objetivo

Automatizar o caminho `post → comentário/link → formulário/DM → CRM → WhatsApp → relatório`
sem login automatizado em rede social, raspagem de concorrentes ou disparo em massa.

Operações isoladas:

- `imobiliaria`: compra, venda, locação, proprietário, avaliação e administração;
- `engenharia`: reforma, regularização, laudo, projeto, topografia e desmembramento;
- `advocacia`: somente demanda iniciada pelo interessado, com revisão humana obrigatória.

## Arquitetura

1. Páginas estáticas em `docs/captador/`, publicáveis pelo GitHub Pages.
2. Supabase Edge Function `captador-api` recebe formulários, comentários Meta, descadastro e CRM.
3. Postgres/Supabase armazena `leads`, `interacoes`, `bloqueio` e `eventos_captacao` com RLS.
4. GitHub Actions consulta comentários pelas APIs oficiais da Meta, registra a intenção e responde com o WhatsApp oficial. A autenticação entre GitHub e Supabase usa OIDC temporário, sem uma nova chave permanente.
5. O CRM web consulta a API administrativa sem expor a chave do Supabase no navegador.
6. O workflow semanal grava apenas métricas agregadas, nunca dados pessoais, no repositório.

## Regras invioláveis

- Nenhum token ou chave no Git; apenas variáveis de ambiente e GitHub Secrets.
- Consentimento explícito para WhatsApp/e-mail; `SAIR` bloqueia imediatamente.
- Deduplicação por telefone E.164 e e-mail normalizado.
- Advocacia nunca recebe prospecção ativa, preço ou promessa de resultado.
- CSV B2B aceita somente empresas e limita 30 novos contatos por dia.
- Dados de leads perdidos ou sem resposta são eliminados depois de 12 meses.
- Nada de raspar seguidores, automatizar login ou enviar mensagens em massa.

## Entregas desta fase

- migrations SQL versionadas e políticas RLS;
- API pública e administrativa;
- cinco páginas de captura e página de descadastro;
- CRM com funil por operação;
- integração nativa Meta documentada, idempotente e autenticada por OIDC;
- importador B2B em modo seguro;
- relatório semanal agregado;
- testes offline de dedupe, bloqueio, descadastro, B2B e advocacia.

## Variáveis seguras

Consulte `.env.example`. Os valores reais devem existir somente no Supabase e nos GitHub
Secrets. A URL pública da API pode ficar em `docs/captador/config.js`; ela não concede
acesso administrativo sem `CAPTADOR_INTERNAL_TOKEN`.

No computador do escritório, o token administrativo fica no cofre de variáveis do usuário,
fora do Git. Para copiá-lo sem exibi-lo no terminal, execute
`powershell -File captador/scripts/copiar-token-crm.ps1`.

## Implantação

1. Usar o projeto Supabase já conectado `ggfjmqttrktsfcaymsvu`.
2. Aplicar as migrations de `captador/supabase/migrations/`.
3. Configurar os secrets da Edge Function e publicar `captador-api`.
4. Atualizar a URL pública em `docs/captador/config.js`.
5. Manter o secret já existente `META_PAGE_TOKEN`; o workflow `captador-meta.yml`
   executa a integração oficial sem login automatizado. ManyChat permanece apenas como fallback opcional.
6. Executar `npm run test:captador` e `npm run captador:check`.

Os passos detalhados e os testes de aceitação ficam em `docs/IMPLANTAR-CAPTADOR.md`.
