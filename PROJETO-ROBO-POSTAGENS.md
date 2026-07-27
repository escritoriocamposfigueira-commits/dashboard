# Projeto — Robô de Postagens Campos Figueira

## Identificação

- Projeto no Codex: `ROBO ESCRITÓRIO`
- Repositório: `escritoriocamposfigueira-commits/dashboard`
- Branch ativa: `claude/campos-figueira-growth-qmjsux`
- Cópia local: `C:\Users\Henrique\Documents\GitHub\dashboard`
- Entrega-base do Codex: commit `f33b636`

## Objetivo

Manter o robô de publicações do Escritório Campos Figueira funcionando de forma
automática, segura e documentada, além de receber novas regras de marketing,
operação e conteúdo sem perder o histórico das decisões.

## Estado atual

- Execução automática pelo GitHub Actions: venda diária às 09h, locação diária às 15h, locação extra na segunda, captação quarta e sábado e recuperação diária de canal de locação às 19h30.
- Facebook: feed, story em vídeo e reel.
- Instagram: feed/carrossel, story em vídeo e reel.
- Captação incluída na rotação.
- YouTube e TikTok permanecem opcionais e dependem dos respectivos Secrets.
- Última execução auditada antes desta abertura: workflow nº 74, concluído com sucesso.
- Últimas 15 execuções visíveis na auditoria terminaram com sucesso.

## Cadastro de novos imóveis

O gerador `scripts/gerar-artes-imovel.js` cria:

- Feed: 1080 × 1350 px.
- Story/Reel: 1080 × 1920 px com zona segura.
- Legenda automática.
- Entrada no manifesto e no fim da fila.
- Cadastro de fotos públicas para carrossel.

Comandos:

```powershell
npm run arte:imovel -- --config "C:\caminho\imovel.json"
npm run arte:imovel -- --config "C:\caminho\imovel.json" --registrar
```

## Regras permanentes

1. Nunca gravar tokens, senhas, cookies ou chaves no repositório.
2. Secrets ficam somente no GitHub Secrets e no `.env.local` não versionado.
3. Não automatizar login da Meta por navegador.
4. Não publicar em grupos do Facebook ou Status do WhatsApp por API.
5. Preservar a fila e o histórico; novos imóveis entram no fim.
6. Gerar sempre as versões 4:5 e 9:16.
7. Testar localmente antes de enviar ao GitHub.
8. Não incluir `.tmp-videos/` nem `.gitignore_trilhas` em commits.

## Limites de acesso confirmados

- Codex possui acesso de leitura e escrita ao repositório e consegue fazer push.
- Codex consegue auditar as execuções públicas do GitHub Actions.
- Valores dos Secrets não são lidos nem expostos.
- A sessão do navegador usada na auditoria não possui acesso administrativo aos Secrets.

## Relação com o WhatsApp

Este projeto controla postagens de redes sociais e não filtra conversas recebidas
no WhatsApp. Nos fluxos n8n auditados, `5511988404602` está configurado como
telefone de teste financeiro, mas não existe um filtro global limitando todo o
atendimento a esse número.

## Validações da entrega-base

- Compilação de produção concluída.
- Novo gerador aprovado no lint e na verificação de sintaxe.
- Cadastro completo testado em cópia isolada.
- Dimensões e geração das duas artes confirmadas.
- Nenhum segredo incluído no commit.

## Novas regras

As próximas regras enviadas pelo proprietário devem ser registradas nesta seção,
com data, objetivo, impacto na fila/canais e validação realizada.
