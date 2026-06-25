# Claude Code Sub-Agents (Subagentes) — Guia Oficial

- Fonte: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Data de consulta: 2026-06-25
- Status: RESUMO VIA PESQUISA (URL retornou HTTP 403)

---

## Resumo

Subagentes são assistentes de IA especializados que podem ser invocados pelo Claude Code para lidar com tipos específicos de tarefas. Cada subagente opera em sua própria janela de contexto independente, com um system prompt personalizado, acesso a ferramentas específicas e permissões próprias. Isso evita a poluição do contexto principal e mantém o agente orquestrador focado nos objetivos de alto nível.

A arquitetura de subagentes do Claude Code é projetada para suportar dois padrões principais:

1. **Fluxos sequenciais**: Claude orquestra subagentes em sequência, cada um completando sua tarefa e retornando resultados para o próximo.
2. **Investigações paralelas**: Múltiplos subagentes trabalham simultaneamente em áreas independentes; Claude sintetiza os resultados.

Subagentes são definidos por arquivos Markdown com frontmatter YAML em `.claude/agents/` (escopo de projeto) ou `~/.claude/agents/` (escopo global).

---

## Conceitos Principais

### Arquitetura de Subagentes

Cada subagente possui:
- **System prompt próprio** — derivado do corpo do arquivo Markdown de definição
- **Janela de contexto isolada** — não compartilha contexto com o agente principal
- **Ferramentas específicas** — acesso limitado apenas às ferramentas necessárias
- **Permissões independentes** — modo de permissão configurável por subagente
- **Acesso a MCP servers** — pode ter acesso a servidores MCP exclusivos

### Estrutura do Arquivo de Definição

Os subagentes são definidos em arquivos Markdown com frontmatter YAML:

```markdown
---
description: Descrição de quando este subagente deve ser usado
tools:
  - Read
  - Grep
  - Bash
disallowedTools:
  - Edit
model: claude-sonnet-4-5
permissionMode: default
mcpServers:
  - nome-do-servidor
maxTurns: 20
skills:
  - nome-da-skill
effort: normal
background: false
isolation: worktree
color: blue
---

# System Prompt do Subagente

Você é um especialista em [área específica]...
[Instruções detalhadas aqui]
```

### Campos do Frontmatter

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `description` | string | Quando o Claude deve invocar este subagente |
| `tools` | lista | Ferramentas permitidas (omitir herda tudo do pai) |
| `disallowedTools` | lista | Ferramentas explicitamente proibidas |
| `model` | string | Modelo a usar (ex: `claude-sonnet-4-5`) |
| `permissionMode` | string | `default`, `acceptEdits`, `bypassPermissions` |
| `mcpServers` | lista | MCP servers inline ou referências ao pai |
| `maxTurns` | número | Limite máximo de turnos do agente |
| `skills` | lista | Skills disponíveis para o subagente |
| `initialPrompt` | string | Prompt inicial automático ao iniciar |
| `memory` | booleano | Habilitar memória persistente |
| `effort` | string | `low`, `normal`, `high` |
| `background` | booleano | Executar em segundo plano |
| `isolation` | string | `worktree` para isolamento em branch Git |
| `color` | string | Cor de identificação visual |

### Onde Armazenar Subagentes

| Local | Escopo |
|-------|--------|
| `~/.claude/agents/` | Global — disponível em todos os projetos |
| `.claude/agents/` | Local ao projeto — commitado no repositório |

### Herança de Ferramentas e MCP

- Quando o campo `tools` é **omitido**, o subagente herda todas as ferramentas MCP disponíveis no thread principal
- Quando o campo `tools` é **especificado**, apenas essas ferramentas são disponibilizadas
- O campo `mcpServers` permite dar ao subagente acesso a servidores MCP que não estão disponíveis na conversa principal
- Servidores inline são conectados quando o subagente inicia e desconectados quando termina
- Referências de string compartilham a conexão já existente da sessão pai

### Subagentes Aninhados

Subagentes podem invocar outros subagentes. Para habilitar isso, liste a ferramenta `Agent` no campo `tools` do subagente pai. Isso cria hierarquias de agentes para fluxos de trabalho complexos.

### Padrão de Uso no Código

Quando o Claude principal encontra uma tarefa que corresponde à descrição de um subagente, ele delega automaticamente. O subagente:
1. Recebe o contexto relevante do agente pai
2. Trabalha de forma independente em sua própria janela de contexto
3. Retorna os resultados ao agente principal
4. O agente principal integra os resultados e continua

---

## Endpoints / Comandos Principais

### CLI — Gerenciamento de Subagentes

```bash
# Listar subagentes disponíveis
claude agents list

# Invocar subagente específico
claude --agent nome-do-agente "tarefa"

# Executar em background
claude --agent nome-do-agente --background "tarefa"
```

### Invocação via Ferramenta Agent (SDK)

```typescript
// No SDK, o agente principal invoca subagentes assim:
Agent({
  description: "Descrição da tarefa delegada",
  subagent_type: "nome-do-subagente",
  prompt: "Instrução completa com contexto suficiente",
  run_in_background: false
})
```

---

## Notas de Versão

- Subagentes são um recurso relativamente recente no Claude Code, introduzidos para suportar fluxos de trabalho multi-agente mais sofisticados
- O campo `isolation: "worktree"` cria uma cópia isolada do repositório Git (git worktree), garantindo que o subagente não afete o branch principal durante a execução
- O campo `background` permite execução paralela sem bloquear o agente principal
- Subagentes podem ser distribuídos e compartilhados via marketplace de plugins do Claude Code
- A herança automática de ferramentas MCP (quando `tools` é omitido) é um comportamento importante para compatibilidade retroativa

---

## Aplicação no Campos Figueira

Para a imobiliária Campos Figueira, subagentes especializados podem dividir responsabilidades em tarefas paralelas e autônomas:

### Subagentes Recomendados

#### 1. agente-conteudo-imoveis
Especializado em criar e revisar conteúdo textual de imóveis — descrições para site, posts para redes sociais, textos para portais como Zap Imóveis e OLX.

```markdown
---
description: Cria descrições e conteúdo de marketing para imóveis da Campos Figueira
tools:
  - Read
  - Write
  - Edit
model: claude-sonnet-4-5
---
Você é especialista em copywriting imobiliário brasileiro...
```

#### 2. agente-instagram
Subagente dedicado exclusivamente às publicações no Instagram — geração de legendas, seleção de hashtags locais, formatação para Stories e Reels.

```markdown
---
description: Gerencia publicações e conteúdo para Instagram da Campos Figueira
tools:
  - Bash
  - Read
mcpServers:
  - instagram-api
---
Você é especialista em marketing imobiliário no Instagram...
```

#### 3. agente-analise-leads
Analisa leads recebidos, classifica por interesse e urgência, e sugere ações de follow-up.

```markdown
---
description: Analisa e classifica leads imobiliários recebidos
tools:
  - Read
  - Bash
effort: high
---
Você é analista de leads para imobiliária...
```

#### 4. agente-auditoria
Subagente de auditoria que verifica consistência entre sistemas (banco de dados, CMS, Instagram), detecta imóveis desatualizados e gera relatórios.

```markdown
---
description: Audita consistência de dados e publicações da Campos Figueira
tools:
  - Read
  - Bash
  - Grep
isolation: worktree
---
Você é responsável por auditar a consistência dos dados...
```

### Fluxo Multi-Agente Típico

```
Agente Principal
  ├── agente-conteudo-imoveis (gera texto) → retorna descrição
  ├── agente-instagram (formata para rede social) → retorna post
  └── agente-auditoria (verifica publicação) → confirma consistência
```

### Benefício Principal

Com subagentes, tarefas que normalmente levariam horas de trabalho manual podem ser executadas em paralelo, com cada agente especializado em seu domínio. O agente principal apenas orquestra e combina os resultados.
