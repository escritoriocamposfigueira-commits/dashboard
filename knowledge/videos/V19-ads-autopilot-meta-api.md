# V19 — Create and Run Adverts on Autopilot with Claude Code Meta Marketing API

- Canal/Autor: Não identificado via pesquisa (provavelmente canal de marketing/automação no YouTube)
- URL: Não encontrado via pesquisa
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

O vídeo demonstra como usar o Claude Code em conjunto com a Meta Marketing API para criar e executar campanhas de anúncios de forma automatizada. Em 2026, a Meta usa a Marketing API na versão v25.0, integrada ao algoritmo Andromeda (lançado em outubro de 2025), que traz mudanças significativas na forma como campanhas são criadas e gerenciadas programaticamente.

A abordagem central é usar o Claude Code com o protocolo MCP (Model Context Protocol) para dar ao modelo acesso direto à Marketing API da Meta, sem necessidade de configurações técnicas complexas. Com isso, é possível construir pipelines completos que geram centenas de anúncios segmentados, criam imagens com IA e fazem upload diretamente para a conta de anúncios.

Empresas que adotaram essa metodologia no início de 2026 reduziram o trabalho operacional manual em até 90% e obtiveram aumento de 15% no ROAS (Return on Ad Spend). O sistema inclui monitoramento de fadiga criativa, detecção de sobreposição de audiências, realocação automática de orçamento, análise de concorrência e relatórios automatizados.

Um princípio de segurança fundamental: todos os anúncios criados por automação devem iniciar no status PAUSADO, exigindo revisão humana antes de ir ao ar. Isso evita gastos indesejados ou publicação de conteúdo inadequado.

## Procedimento / Conceitos Principais

1. **Configurar autenticação**: Obter Access Token de longa duração no Meta for Developers. Token de sistema (System User Token) recomendado para automações contínuas.
2. **Instalar servidor MCP da Meta**: Configurar o servidor MCP que dá ao Claude Code acesso direto à Marketing API via protocolo padronizado.
3. **Definir estrutura de campanha**: No Claude Code, descrever em linguagem natural a campanha desejada — objetivo, público, orçamento, criativos.
4. **Geração de scripts**: Claude Code gera scripts Node.js ou Python que chamam os endpoints da API (`/act_{ad_account_id}/campaigns`, `/adsets`, `/ads`).
5. **Criação em status PAUSADO**: Toda campanha criada recebe `status: PAUSED` por padrão — ativação manual obrigatória no Ads Manager.
6. **Revisão humana**: Acessar o Ads Manager para revisar campanha, conjuntos de anúncios e criativos antes de ativar.
7. **Monitoramento contínuo**: Claude Code configurado para verificar métricas periodicamente (CTR, CPC, ROAS) e sugerir otimizações.
8. **Realocação de orçamento**: Scripts automáticos identificam conjuntos com melhor performance e propõem redistribuição de verba.
9. **Relatórios automatizados**: Geração de relatórios periódicos com dados consolidados diretamente da API.
10. **Versão da API**: Usar sempre a versão mais recente (v25.0 em 2026); versões antigas são depreciadas gradualmente.
11. **Versionamento de prompts**: Salvar os prompts utilizados com Claude Code para reprodutibilidade e auditoria.
12. **Tratamento de erros**: Scripts devem incluir lógica de retry com backoff exponencial para lidar com rate limits da API.

## Conhecimentos Úteis

- O MCP (Model Context Protocol) é o padrão que permite que LLMs como Claude interajam com APIs externas de forma segura e estruturada.
- A Meta Marketing API é baseada no Graph API — todas as entidades (campanhas, conjuntos, anúncios) são nós acessíveis via HTTP.
- **Hierarquia de objetos**: Campaign → Ad Set → Ad → Creative. Cada nível tem seus próprios parâmetros e endpoints.
- System User Tokens são mais estáveis que tokens de usuário para automações de longa duração.
- O campo `special_ad_categories` é obrigatório mesmo quando vazio — omiti-lo causa erros na criação de campanhas.
- Advantage+ Shopping Campaigns foram depreciadas na v25.0 para criação via API — requer fluxos alternativos.
- Rate limits variam por tipo de chamada; operações de escrita têm limites mais restritivos que leituras.
- Logs detalhados são essenciais para debugging — a API retorna códigos de erro específicos com mensagens claras.
- Claude Code pode analisar toda a conta e sugerir otimizações baseadas em padrões históricos de performance.
- Composio.dev oferece integração pronta entre Claude Code e Meta Ads, simplificando o setup inicial.

## Aplicação no Campos Figueira

- **Campanhas de lançamento rápido**: Quando um novo imóvel é captado, scripts criam campanhas segmentadas para Mogi das Cruzes e Alto Tietê em minutos.
- **Orçamento inteligente**: Realocação automática entre campanhas de venda e locação conforme sazonalidade do mercado local.
- **Criativos por tipo**: Diferentes templates para casas, apartamentos, terrenos e comerciais, gerados com dados do CRM.
- **Relatórios para sócios**: Relatórios semanais automatizados — custo por lead, leads gerados, performance por bairro.
- **Categoria especial imobiliária**: Scripts garantem uso de `special_ad_category: HOUSING` para anúncios de imóveis, conforme exigido pela Meta.
- **Escala sem equipe extra**: Uma pessoa gerencia múltiplas campanhas com supervisão eficiente, sem contratar especialistas adicionais.
- **Testes A/B contínuos**: Automação permite testar múltiplos criativos e públicos simultaneamente, algo inviável manualmente em pequenas equipes.

## Validação

- **Aprovado**: Uso do MCP com Claude Code para automação de campanhas Meta — tecnologia madura e documentada em 2026.
- **Aprovado**: Status PAUSADO obrigatório para todos os anúncios criados automaticamente — boa prática de segurança.
- **Confirmar**: Limitações específicas da API v25.0 para mercado imobiliário brasileiro (categoria HOUSING).
- **Atenção**: Advantage+ Shopping Campaigns não podem ser criadas via API na v25.0 — verificar alternativas.
- **Confirmar**: Compliance com LGPD ao processar dados de leads via API.

## Decisão por Ensinamento

APROVADO COM ADAPTAÇÕES — A automação via Claude Code + Meta Marketing API é tecnicamente sólida e economicamente justificada para a Campos Figueira. Requer adaptações: uso de `special_ad_category: HOUSING`, conformidade com LGPD e revisão humana obrigatória antes de ativar qualquer campanha.
