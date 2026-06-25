# V01 — Mastering Claude Code in 30 Minutes

- Canal/Autor: Anthropic (Boris Cherny)
- URL: https://www.youtube.com/watch?v=6eBSHbLKuN0
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

Este vídeo oficial da Anthropic apresenta Boris Cherny, membro técnico sênior e criador do Claude Code, em um workshop de 30 minutos que cobre os fundamentos e técnicas avançadas da ferramenta. O vídeo foi publicado em abril de 2026 e representa o conteúdo mais autoritativo disponível sobre Claude Code, pois vem diretamente do criador da ferramenta.

O Claude Code é descrito como um agente totalmente autônomo de terminal que vai além de simples assistência de código: ele constrói funcionalidades inteiras, escreve funções completas, cria arquivos e corrige bugs de ponta a ponta. A ferramenta opera localmente no sistema do usuário sem indexar ou enviar código para servidores externos, preservando privacidade.

Boris Cherny destaca que o ponto de partida ideal para novos usuários é o "Q&A de codebase" — usar o Claude Code para fazer perguntas sobre a base de código existente antes de solicitar qualquer modificação. Esse padrão reduz o tempo de onboarding técnico de duas semanas para dois ou três dias em equipes de desenvolvimento.

A ferramenta é compatível com todos os IDEs e terminais populares: VS Code, Xcode, JetBrains, SSH remoto e Tmux. Essa flexibilidade a torna adequada tanto para desenvolvimento local quanto para ambientes em nuvem.

O vídeo apresenta o conceito de CLAUDE.md como arquivo central de configuração do projeto: um documento de instruções que persiste entre sessões e define o contexto, convenções e restrições específicas de cada projeto. Boris recomenda manter o arquivo abaixo de 200 linhas para preservar o orçamento de contexto.

Um conceito central apresentado é a separação entre fases de pesquisa/planejamento e de implementação. Deixar o Claude ir direto para o código sem uma fase de planejamento pode resultar na solução do problema errado. O criador recomenda git worktrees para execução paralela segura, onde cada agente trabalha em uma ramificação isolada.

## Procedimento / Conceitos Principais

1. **Instalação**: `npm install -g @anthropic-ai/claude-code` (requer Node 18+)
2. **Autenticação**: `claude` no terminal e autenticar via OAuth com conta Anthropic
3. **Primeiro uso recomendado**: Perguntas sobre o codebase antes de modificações
   - Exemplo: "Explique a arquitetura deste projeto"
   - Exemplo: "Onde estão as rotas de autenticação?"
4. **Criar CLAUDE.md**: Arquivo na raiz do projeto com instruções persistentes
   - Incluir: stack tecnológico, convenções de código, comandos de teste, restrições
   - Manter abaixo de 200 linhas para não consumir contexto desnecessário
5. **Modo de planejamento**: Ativar antes de tarefas complexas via `/plan`
   - Claude lê arquivos e propõe plano sem fazer alterações
   - Revisar e editar o plano antes de prosseguir
6. **Uso de ferramentas integradas**: Bash, leitura/escrita de arquivos, busca web
7. **Integração com IDE**: Instalar extensão VS Code para interface visual paralela ao terminal
8. **Hooks**: Configurar ações automáticas em pontos específicos do fluxo de trabalho
9. **Verificação**: Usar testes automatizados como fonte externa de verdade
10. **Subagentes**: Para tarefas grandes, usar agentes paralelos em janelas de contexto separadas
11. **Commits frequentes**: Manter checkpoints de segurança durante trabalho longo
12. **Modo auto**: Para autonomia máxima em tarefas bem definidas com testes existentes

## Conhecimentos Úteis

- O Claude Code opera no nível do sistema operacional — pode executar comandos bash, manipular arquivos, instalar dependências, fazer commits de git e interagir com qualquer CLI
- A privacidade é garantida porque o código nunca sai da máquina local para indexação; apenas a troca de mensagens vai para a API
- O arquivo CLAUDE.md é lido automaticamente no início de cada sessão — é o mecanismo de memória persistente entre sessões
- Testes automatizados funcionam como "fonte externa de verdade": sem eles, o Claude verifica seu próprio trabalho usando julgamento próprio, que degrada conforme o contexto enche
- A separação planejamento/implementação evita o problema clássico de "resolver o problema errado"
- Hooks são determinísticos (sempre executam) ao contrário de instruções no CLAUDE.md que são consultivas
- O padrão de Q&A inicial é particularmente valioso para bases de código legadas ou desconhecidas
- Modo de agente paralelo: múltiplas instâncias do Claude Code trabalhando em diferentes aspectos de um problema simultaneamente
- O criador recomenda git worktrees para execução paralela segura — cada agente trabalha em uma ramificação isolada
- O onboarding técnico acelerado (de 2 semanas para 2-3 dias) demonstra o ROI imediato da ferramenta
- Compatível com SSH remoto: pode operar em servidores de produção, não apenas em máquinas locais

## Aplicação no Campos Figueira

O Escritório Campos Figueira pode usar Claude Code para acelerar o desenvolvimento e manutenção do dashboard interno da agência imobiliária em Mogi das Cruzes:

- **Onboarding de desenvolvedores**: Usar Q&A de codebase para que novos colaboradores entendam a arquitetura do sistema em dias, não semanas — especialmente útil dado que a equipe técnica pode ser pequena
- **CLAUDE.md personalizado**: Criar arquivo com contexto do negócio imobiliário, convenções do projeto, comandos de teste específicos e restrições legais do setor (CRECI, contratos, ITBI)
- **Automação de tarefas repetitivas**: Geração de relatórios de imóveis, atualização de listings, processamento de documentos de clientes
- **Manutenção do dashboard**: Adicionar novas funcionalidades ao painel de controle sem necessidade de desenvolvedor full-time permanente
- **Integração com APIs**: Conectar com portais imobiliários (ZAP, OLX, Viva Real) via automação de CLI
- **Ciclo de feedback rápido**: Usar testes como fonte de verdade garante que atualizações no sistema não quebrem funcionalidades existentes
- **Documentação técnica**: Gerar e manter documentação atualizada do sistema automaticamente
- **Git worktrees**: Usar execução paralela para desenvolver múltiplas features do dashboard simultaneamente

## Validação

- **Aprovado**: Uso de CLAUDE.md para contexto persistente do projeto
- **Aprovado**: Padrão de Q&A antes de modificações
- **Aprovado**: Separação planejamento/implementação
- **Aprovado**: Integração com VS Code e terminais
- **Confirmar**: Versão mais recente do Claude Code (verificar `claude --version`)
- **Confirmar**: Modelos disponíveis e custos por token para uso empresarial

## Decisão por Ensinamento

APROVADO
