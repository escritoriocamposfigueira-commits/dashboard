# V05 — Claude Code Full Course 4 Hours: Build & Sell

- Canal/Autor: Nick Saraev
- URL: https://www.youtube.com/watch?v=QoQBzR1NIqI
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

Nick Saraev, empreendedor com negócio de conteúdo automatizado de 7 dígitos, apresenta o curso mais assistido de Claude Code no YouTube com mais de 1,4 milhão de visualizações. O curso de 4 horas cobre desde setup inicial até estratégias para monetizar habilidades com Claude Code.

Nick é conhecido por ter ensinado mais de 5.000 alunos via seu programa Maker School e por ter mais de 150.000 inscritos no YouTube. Sua abordagem é única: ele combina profundidade técnica com perspectiva empresarial, ensinando não apenas "como usar" mas "como vender" serviços construídos com Claude Code.

O curso vai fundo em aspectos técnicos geralmente ignorados por tutoriais básicos: agent teams (equipes de agentes coordenados), git worktrees para desenvolvimento paralelo, e deploy em nuvem de sistemas baseados em Claude. Esses são os tópicos que Nick identifica como diferenciadores entre freelancers mediocres e os que cobram premium.

A parte "Build & Sell" do título é intencional: o objetivo é que ao final do curso o aluno saiba tanto construir sistemas com Claude Code quanto posicioná-los como produto vendável para clientes. Nick apresenta modelos de precificação, como encontrar clientes, e como estruturar projetos para entrega profissional.

O curso foi atualizado em 2026 para refletir as mudanças no Claude Code, incluindo a nova arquitetura de agent teams, dynamic workflows e integração aprimorada com MCP servers.

## Procedimento / Conceitos Principais

1. **Setup profissional do ambiente**:
   - Node 18+ instalado via NVM (não instalação direta)
   - Claude Code global: `npm install -g @anthropic-ai/claude-code`
   - Git configurado com identidade profissional para commits rastreáveis
   - VS Code com extensão Claude Code para interface visual

2. **Projeto estruturado para produção**:
   - CLAUDE.md detalhado na raiz com contexto de negócio
   - `.claude/` com settings.json, agents/, skills/
   - Testes automatizados desde o início (não como adição posterior)
   - Git com branches por feature, commits semânticos

3. **Agent Teams — equipes coordenadas**:
   - Ativar via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=true`
   - Definir papéis: orquestrador, especialistas, revisores
   - Agentes se comunicam diretamente entre si (diferente de subagentes)
   - Ideal para projetos com múltiplos domínios (frontend + backend + dados)

4. **Git Worktrees para desenvolvimento paralelo**:
   - `git worktree add ../projeto-feature-A feature/feature-A`
   - `git worktree add ../projeto-feature-B feature/feature-B`
   - Abrir Claude Code em cada worktree simultaneamente
   - Velocidade de desenvolvimento: 3-5x comparado ao desenvolvimento sequencial

5. **Deploy em nuvem**:
   - Containerizar projeto com Dockerfile
   - Deploy em Railway, Render, ou Vercel dependendo do tipo
   - Configurar variáveis de ambiente para `ANTHROPIC_API_KEY`
   - Monitoramento de uso e custo via dashboard Anthropic

6. **Estratégia de monetização — freelancing**:
   - Identificar problemas repetitivos em empresas pequenas e médias
   - Proposta de valor: "automatizo [tarefa X] que você faz manualmente toda semana"
   - Precificação por resultado, não por hora
   - Portfolio de projetos demonstráveis (GitHub + vídeo de demo)

7. **Estratégia de monetização — produto SaaS**:
   - Claude Code para construir o MVP rapidamente
   - Validar com 10-20 clientes pagantes antes de otimizar
   - Custo de API como COGS (custo dos produtos vendidos)
   - Modelo de assinatura mensal para receita recorrente previsível

8. **Encontrar clientes**:
   - LinkedIn com demonstrações de automações que construiu
   - Grupos de nicho (ex: grupos de corretores de imóveis, grupos de PME)
   - Cold email com proposta de valor específica ao negócio do lead
   - Referências de clientes satisfeitos como canal principal

9. **Gestão de projetos com Claude Code**:
   - Quebrar projeto grande em milestones de 1-3 dias
   - Usar Claude para gerar documentação técnica e funcional
   - Entregar MVPs rápidos e iterar com feedback do cliente
   - Documentar tudo para manutenção futura (sua ou do cliente)

10. **Armadilhas comuns a evitar**:
    - Não fazer prompt engineering suficiente antes de pedir código
    - Não usar testes — resulta em regressões não detectadas
    - Deixar sessões longas sem commits intermediários
    - Prometer funcionalidades antes de validar que são viáveis com Claude

## Conhecimentos Úteis

- O mercado de automação com IA está em fase de ouro em 2026 — demanda muito maior que oferta de pessoas que sabem construir sistemas com Claude Code
- A combinação técnica + comercial é o que Nick chama de "vantagem injusta" — maioria dos técnicos não sabe vender, maioria dos vendedores não sabe construir
- Agent teams para projetos de clientes permite paralelizar trabalho que normalmente precisaria de equipe de 3-5 desenvolvedores
- Git worktrees é o "segredo sujo" dos usuários avançados de Claude Code — a maioria dos tutoriais não menciona, mas é fundamental para escalar
- Precificação por resultado (valor entregue) versus precificação por hora muda completamente a equação de negócio — Claude Code permite deliver muito mais valor em menos horas
- Deploy em nuvem transforma projetos de "scripts locais" para "produtos vendáveis com URL"
- A regra de Nick: se uma tarefa leva mais de 5 horas manualmente por semana em uma empresa, há mercado para automatizá-la com Claude Code

## Aplicação no Campos Figueira

- **Produto interno de IA**: Usar as técnicas do curso para construir e manter o dashboard do Campos Figueira como produto interno profissional com deploys automatizados
- **Automações de alto valor**: Identificar as tarefas que a equipe faz manualmente toda semana (atualizar portais, gerar relatórios, responder leads) e automatizá-las com Claude Code
- **Precificação de imóveis**: Criar sistema automatizado que cruza dados de mercado de Mogi das Cruzes com características do imóvel para sugestão de preço — diferencial competitivo vendável
- **Agent teams para campanhas**: Usar equipes de agentes para criar campanhas completas de marketing — pesquisa de mercado + criação de copy + seleção de imóveis + publicação nos portais
- **Modelo SaaS para corretores**: Considerar oferecer o sistema desenvolvido como produto para outras agências imobiliárias da região de Mogi das Cruzes — receita adicional
- **Portfólio técnico**: Documentar as automações construídas para o Campos Figueira como casos de uso que demonstram expertise no setor imobiliário

## Validação

- **Aprovado**: Técnicas de git worktrees para desenvolvimento paralelo
- **Aprovado**: Agent teams para projetos multi-domínio
- **Aprovado**: Deploy em nuvem para tornar sistemas acessíveis
- **Aprovado com adaptações**: Estratégias de monetização (adaptar para uso interno, não freelancing externo)
- **Confirmar**: Agent teams ainda experimental em junho 2026 (verificar status atual)
- **Confirmar**: Plataformas de deploy recomendadas para caso de uso específico (Railway vs. Vercel para Next.js)

## Decisão por Ensinamento

APROVADO COM ADAPTAÇÕES
