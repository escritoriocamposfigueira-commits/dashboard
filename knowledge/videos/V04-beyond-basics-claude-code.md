# V04 — Beyond the Basics with Claude Code

- Canal/Autor: Anthropic (Code with Claude 2026, San Francisco)
- URL: https://www.youtube.com/watch?v=tuY2ChJIx48
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

Este vídeo foi gravado na conferência "Code with Claude 2026" em San Francisco e cobre os mecanismos que separam o uso básico do Claude Code do uso com "alavancagem real" — o conjunto de técnicas que multiplicam a produtividade em vez de apenas automatizar tarefas simples.

O título "Beyond the Basics" é intencionalmente contrastado com tutoriais de introdução: o objetivo é mostrar o que desenvolvedores experientes fazem diferente de iniciantes. Os quatro pilares abordados são: (1) CLAUDE.md executado corretamente, (2) integração de tools via MCP, (3) empacotamento de conhecimento de equipe como skills, e (4) uso seguro do modo auto.

O vídeo foi gravado na conferência Code w/ Claude 2026 como uma sessão de workshop ao vivo, com demonstrações práticas de cada técnica. Participantes relataram que a parte sobre MCP e a integração de skills foram as mais transformadoras para suas workflows reais.

Um tema recorrente é que os iniciantes usam Claude Code como um editor de código "turbinado", enquanto usuários avançados o usam como um sistema de agentes que executa pipelines completos de trabalho — da pesquisa ao deploy.

O vídeo também aborda o uso seguro do modo auto: como configurar permissões granulares, quando confiar e quando supervisionar, e como estruturar projetos para que o modo auto produza resultados confiáveis sem supervisão constante.

## Procedimento / Conceitos Principais

1. **CLAUDE.md Avançado**:
   - Incluir memória de decisões de arquitetura (não apenas comandos)
   - Documentar por que certas abordagens foram rejeitadas (evita revisitar)
   - Usar seções `<important>` para destacar restrições críticas
   - Referenciar outros arquivos com `@caminho/arquivo.md` para contexto adicional

2. **Integração MCP — Model Context Protocol**:
   - Instalar servidores MCP: `claude mcp add nome-do-servidor caminho/comando`
   - Servidores MCP disponíveis: bancos de dados, APIs, sistemas de arquivos, serviços cloud
   - Cada MCP expõe tools tipadas que o Claude pode usar nativamente
   - Configuração em `.claude/settings.json` seção `mcpServers`

3. **Skills como conhecimento de equipe**:
   - Arquivos em `.claude/skills/` com procedimentos passo-a-passo
   - Formato: título, contexto, passos numerados, validação, exemplos
   - Skills são invocadas automaticamente pelo Claude quando relevantes
   - Permitem encapsular padrões específicos da empresa/projeto

4. **Modo auto com segurança**:
   - `allowedTools`: lista branca de ferramentas permitidas
   - `disallowedTools`: lista negra de ferramentas proibidas
   - Nível de permissão por tipo de ação (leitura vs. escrita vs. execução)
   - Usar `--print` para executar sem interatividade em scripts CI/CD

5. **Parallel subagents com git worktrees**:
   - `git worktree add ../feature-branch feature/nova-feature`
   - Abrir Claude Code em cada worktree em terminais separados
   - Cada instância trabalha de forma isolada sem conflito
   - Merge das branches quando cada agente conclui sua tarefa

6. **Prompt engineering avançado para agentes**:
   - Especificar formato de saída esperado no prompt
   - Incluir exemplos de bom e mau comportamento (few-shot)
   - Definir critério de conclusão explícito
   - Usar XML tags para estruturar partes do prompt complexo

7. **Integração com CI/CD**:
   - Executar Claude Code em pipelines GitHub Actions
   - `claude --print "revise este PR para erros de segurança"` como step automatizado
   - Gerar relatórios de code review automaticamente

8. **Debugging de sessões longas**:
   - `/compact` para compactar histórico sem perder contexto essencial
   - Salvar estado em arquivo antes de sessões muito longas
   - Usar `--resume` para retomar sessão salva

9. **Customização de interface**:
   - Temas e configurações visuais via `/config`
   - Keybindings customizados para ações frequentes
   - Integração com tmux para múltiplas sessões paralelas visíveis

10. **Métricas e observabilidade**:
    - Logar todas as sessões para análise posterior
    - Calcular custo médio por tarefa para estimativas de ROI
    - Identificar padrões de uso que consomem mais tokens desnecessariamente

## Conhecimentos Úteis

- A diferença entre usuário básico e avançado não é o número de prompts, mas a estrutura do ambiente ao redor do Claude
- MCP transforma Claude de ferramenta de código em sistema integrado com toda a infraestrutura da empresa
- Skills encapsulam "como fazemos aqui" — o conhecimento tácito da equipe que normalmente fica na cabeça das pessoas
- Modo auto sem skills e CLAUDE.md bem definido é imprevisível; com eles, é repetível e confiável
- Git worktrees para parallelismo são uma técnica subestimada — a maioria dos usuários avançados os usa extensivamente
- O `@referência` em CLAUDE.md permite construir hierarquias de contexto: geral (raiz) → específico (subpastas)
- Agentes em CI/CD representam a fronteira entre "ferramenta de desenvolvedor" e "automação de produto"
- A configuração de permissões granulares é o que torna o modo auto seguro para uso em produção
- Prompt engineering para agentes é diferente de prompt engineering para chatbots — o foco é em comportamento emergente ao longo de múltiplos passos

## Aplicação no Campos Figueira

- **CLAUDE.md hierárquico**: Criar CLAUDE.md na raiz com contexto geral do negócio imobiliário e CLAUDE.md específicos em subpastas (ex: `knowledge/real-estate/CLAUDE.md` com regras de precificação e legislação local de Mogi das Cruzes)
- **MCP de banco de dados**: Conectar banco de dados de imóveis como MCP server para que agentes possam consultar e atualizar cadastros diretamente
- **Skills de processo imobiliário**: Encapsular procedimentos padrão — como fazer avaliação de imóvel, como montar dossiê de venda, como calcular ITBI — como skills reutilizáveis
- **Modo auto para publicação**: Configurar agente com permissão apenas de leitura do banco e escrita em portais externos para publicação automática de novos listings
- **Worktrees por campanha**: Usar git worktrees para desenvolver múltiplas campanhas de marketing de imóveis em paralelo
- **CI/CD com review automatizado**: Integrar Claude Code no pipeline de deploy do dashboard para revisar automaticamente mudanças antes de ir para produção

## Validação

- **Aprovado**: CLAUDE.md hierárquico com referências `@arquivo`
- **Aprovado**: MCP para integração de dados externos
- **Aprovado**: Skills como documentação executável de processos
- **Aprovado**: Git worktrees para paralelismo
- **Confirmar**: Lista atualizada de MCP servers disponíveis para banco de dados PostgreSQL/MySQL
- **Confirmar**: Formato atual de skills (YAML vs. Markdown) na versão atual do Claude Code

## Decisão por Ensinamento

APROVADO
