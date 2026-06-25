# V03 — Claude Agent SDK Full Workshop

- Canal/Autor: Thariq Shihipar / Anthropic
- URL: https://www.youtube.com/watch?v=TqC1qOfiVcQ
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

Workshop completo apresentado por Thariq Shihipar da Anthropic sobre o Claude Agent SDK — a interface programática para construir agentes personalizados usando Claude Code como biblioteca, em vez de usá-lo apenas como ferramenta interativa de terminal. O workshop foi publicado no início de 2026 e está disponível no YouTube e em plataformas de cursos como Class Central.

O conteúdo progride de fundamentos teóricos para implementação prática de agentes autônomos. A premissa central é que o Claude Agent SDK representa uma mudança de paradigma: de "usar Claude como assistente" para "construir sistemas de IA onde Claude é um componente programável".

A arquitetura central apresentada é o Harness — uma estrutura que envolve o modelo com cinco componentes: ferramentas (tools), prompts, sistema de arquivos, skills, subagentes e memória. Essa arquitetura permite construir agentes especializados que operam de forma autônoma dentro de limites bem definidos.

O loop de agente (Agent Loop) é explicado em detalhe: Contexto → Pensamento → Ação → Observação → repete. Cada iteração do loop permite ao agente acumular informações, tomar decisões e executar ações no ambiente. A ferramenta Bash é apresentada como a ponte fundamental entre o agente e o sistema operacional.

O workshop também cobre a diferença entre agentes simples (single-agent), orquestração sequencial e arquiteturas multi-agente paralelas — cada uma com seus trade-offs de custo, latência e complexidade.

## Procedimento / Conceitos Principais

1. **Instalação do SDK**:
   - `npm install @anthropic-ai/claude-code` para uso de linha de comando
   - `npm install @anthropic-ai/sdk` para uso programático via API

2. **Arquitetura Harness — seis componentes**:
   - Tools: Funções que o agente pode chamar (bash, leitura de arquivo, API externa)
   - Prompts: System prompt + instruções de tarefa
   - File System: Acesso a arquivos do projeto para leitura e escrita
   - Skills: Procedimentos reutilizáveis em `.claude/skills/`
   - Subagents: Agentes especializados em `.claude/agents/`
   - Memory: CLAUDE.md + arquivos de estado persistente

3. **Agent Loop Pattern**:
   - Contexto (sistema + tarefa)
   - Pensamento (raciocínio interno do modelo)
   - Ação (chamar ferramenta ou gerar resposta)
   - Observação (resultado da ferramenta)
   - Repete até conclusão ou limite de iterações

4. **Definição de subagente em `.claude/agents/`**:
   - Arquivo YAML com: role, model, tools_allowed, system_prompt
   - Agente pai spawna subagente para tarefa especializada
   - Subagente opera em contexto isolado e retorna resultado comprimido

5. **Modo de execução assíncrona**:
   - Usar `--dangerously-skip-permissions` apenas em ambientes isolados/sandbox
   - Configurar `allowedTools` para restringir escopo das ações permitidas

6. **Integração com MCP (Model Context Protocol)**:
   - Conectar fontes de dados externas como tools tipadas
   - Exemplo: MCP do banco de dados permite ao agente ler/escrever dados diretamente

7. **Padrão Orquestrador/Trabalhador**:
   - Agente orquestrador: recebe tarefa grande, divide em subtarefas, spawna trabalhadores
   - Agentes trabalhadores: executam subtarefas específicas em paralelo
   - Orquestrador: coleta resultados e sintetiza resposta final

8. **Tratamento de erros em loops de agente**:
   - Definir número máximo de iterações para prevenir loops infinitos
   - Tratar ferramentas que falham de forma graceful com fallbacks
   - Implementar timeouts para chamadas de API externas

9. **Persistência de estado entre sessões**:
   - Salvar contexto relevante em arquivos no projeto
   - CLAUDE.md para estado global permanente
   - Arquivos JSON ou Markdown para estado de tarefas específicas

10. **Observabilidade e debug**:
    - Habilitar streaming para ver tokens em tempo real
    - Logar cada chamada de ferramenta e resultado para auditoria
    - Monitorar uso de tokens por sessão para controle de custo

11. **Deploy de agentes em produção**:
    - Containerizar com Docker para isolamento e portabilidade
    - Usar variáveis de ambiente para chaves de API (nunca hardcode)
    - Implementar circuit breakers para APIs externas instáveis

12. **Evolução de complexidade**:
    - Nível 1: LLM simples com prompt (chatbot)
    - Nível 2: LLM com tools (agente com ações)
    - Nível 3: Loop de agente (autônomo até conclusão)
    - Nível 4: Multi-agente paralelo (sistemas complexos)

## Conhecimentos Úteis

- O Claude Agent SDK representa o nível mais avançado de integração com Claude — acima do uso interativo de terminal e acima de chamadas simples de API de chat
- O loop de agente (Contexto → Pensamento → Ação → Observação) é o padrão fundamental de todos os agentes de IA modernos, não apenas os da Anthropic
- A ferramenta Bash como ponte para o SO é o que diferencia agentes de IA de simples chatbots — ela permite ações reais no mundo
- Subagentes com contextos isolados resolvem o problema de context overflow em tarefas muito longas
- O padrão orquestrador/trabalhador escala horizontalmente — adicionar mais trabalhadores paralelos reduz latência em tarefas decompostas
- Skills são a forma correta de encapsular conhecimento de domínio reutilizável — evitam repetir as mesmas instruções em múltiplos prompts
- MCP (Model Context Protocol) é o padrão aberto da Anthropic para conectar modelos a fontes de dados externas de forma tipada e segura
- Agentes autônomos em produção precisam de guardrails: limites de iteração, escopo de ferramentas restrito, monitoramento de custo
- A separação entre "agente que planeja" e "agente que executa" é uma arquitetura comprovada para tarefas complexas
- O SDK permite que Claude Code seja usado como componente em sistemas maiores, não apenas como ferramenta standalone

## Aplicação no Campos Figueira

- **Agente de listagem**: Criar agente autônomo que monitora novos imóveis cadastrados e automaticamente publica descrições otimizadas nos portais (ZAP, OLX, Viva Real) via API
- **Agente de relatórios**: Agente que roda periodicamente, busca dados do banco, gera relatório de performance de imóveis disponíveis e envia por e-mail à equipe
- **Orquestrador de onboarding de imóvel**: Quando novo imóvel é cadastrado, orquestrador spawna subagentes — um para fotos/mídia, um para descrição, um para publicação em portais, um para atualização do CRM
- **Integração MCP com banco de dados**: Conectar banco de dados da agência como MCP tool, permitindo que agentes leiam/escrevam dados de imóveis diretamente via linguagem natural
- **Agente de resposta a leads**: Automatizar primeira resposta a leads recebidos via portais, coletando informações básicas e agendando visitas
- **Pipeline de qualificação de leads**: Agente que analisa perfil do lead e sugere imóveis compatíveis com base em critérios de busca registrados no CRM
- **Monitoramento de mercado**: Agente que raspa dados de mercado imobiliário de Mogi das Cruzes periodicamente e atualiza análise de precificação

## Validação

- **Aprovado**: Arquitetura Harness como estrutura de referência
- **Aprovado**: Agent Loop Pattern como paradigma base
- **Aprovado**: Subagentes com contextos isolados para tarefas paralelas
- **Aprovado**: MCP para integração com dados externos
- **Confirmar**: API atual do SDK (verificar documentação em code.claude.com)
- **Confirmar**: Modelos disponíveis para uso em subagentes (custo vs. capacidade)

## Decisão por Ensinamento

APROVADO
