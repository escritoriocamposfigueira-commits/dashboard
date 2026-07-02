# 🚑 Plano de Recuperação do Robô de Posts — Escritório Campos Figueira

> Atualizado em 02/07/2026. Complementa REGRAS-MARKETING.md e CALENDARIO-SEMANAL.md.

## O que aconteceu (causa raiz, confirmada)

1. O robô de publicações (feed + stories, FB/IG) foi construído numa **sessão local do Claude Code no PC do escritório** — com Supabase (comando colado + Run) e PowerShell.
2. A **troca de senha do Facebook (~30/06)** invalidou o token da Meta que o robô usava → ele parou de publicar. As conexões do Windsor caíram pelo mesmo motivo (já reconectadas em 02/07).
3. Esta sessão na nuvem **não substitui o robô**: ela não alcança o PC (pasta `D:\01 - ESCRITÓRIO IMOBILIÁRIO\04- REDE SOCIAL\IMAGENS ANUNCIOS`), nem o repositório `campos-figueira-rebuild`, nem o site (bloqueados na configuração da sessão).

## ✅ Caminho 1 — Religar o robô no PC (RECOMENDADO, ~10 min)

1. No PC do escritório, abrir o **PowerShell** na pasta do projeto (a mesma usada antes).
2. Rodar `claude --resume` e escolher a conversa antiga do robô (ou abrir sessão nova na mesma pasta).
3. Colar este comando:

```
O robô de posts parou em ~30/06 porque a senha do Facebook foi trocada e o token
da Meta expirou. Faça: (1) localize onde o token da Meta está salvo (secrets do
Supabase / .env do projeto); (2) me guie para gerar um novo token de longa duração
da página "Escritório Campos Figueira" e do Instagram @escritorio.figueira, com as
mesmas permissões de antes; (3) atualize o secret e teste publicando 1 story e 1
post de teste; (4) verifique se o agendamento (cron) está ativo e reprocesse a fila
parada desde 30/06; (5) confirme que as imagens de D:\01 - ESCRITÓRIO
IMOBILIÁRIO\04- REDE SOCIAL\IMAGENS ANUNCIOS estão sendo usadas com a proporção
certa por formato (feed 4:5, story 9:16); (6) aplique as regras do arquivo
REGRAS-MARKETING.md do repositório dashboard (github.com/
escritoriocamposfigueira-commits/dashboard, branch
claude/social-media-access-photos-s1pljz): 100% orgânico, WhatsApp (11) 2378-5643
em destaque, todos os imóveis de locação 1x/semana de seg a sex misturados com
venda, 4-6 carrosséis/semana, copy com dor/sonho/emoção sempre diferentes,
e expandir para TikTok e YouTube se a API do robô permitir.
```

4. **Blindagem para não parar de novo:** pedir na mesma sessão:
   - alerta automático se uma publicação falhar (ex.: e-mail/WhatsApp);
   - documento com o passo a passo de troca do token (para renovar em minutos após qualquer troca de senha).

## ✅ Caminho 2 — Dar a esta sessão na nuvem os mesmos poderes

Ao criar a sessão/ambiente no claude.ai/code:
1. **Repository access:** incluir `campos-figueira-rebuild` (além do `dashboard`);
2. **Network policy:** liberar acesso à internet (ou ao menos `escritoriocamposfigueira.com.br` e `*.supabase.co`);
3. Enviar as credenciais do Supabase do robô (URL do projeto + chave service_role via variável de ambiente segura — nunca no chat).

Com isso, a sessão na nuvem consegue ler os imóveis do site/repo e operar a fila do robô diretamente.

## Estado atual das frentes (02/07/2026)

| Frente | Estado |
|---|---|
| Conexões Windsor (FB, IG, TikTok, YT) | 🟢 reconectadas (autorização até ago/2026) |
| Robô Supabase (feed + stories) | 🔴 parado — precisa de token novo (Caminho 1) |
| Bio nova IG/FB | 🟡 texto pronto (REGRAS-MARKETING.md §6) — falta colar no app |
| Campanhas pagas Meta Ads | ⚪ fora de uso por decisão: estratégia 100% orgânica |
| Calendário seg–sex + copies | 🟢 prontos (CALENDARIO-SEMANAL.md) |
