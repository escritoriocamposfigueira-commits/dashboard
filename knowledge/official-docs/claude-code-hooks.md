# Claude Code Hooks — Guia de Automação de Ciclo de Vida

- Fonte: https://docs.anthropic.com/en/docs/claude-code/hooks-guide
- Data de consulta: 2026-06-25
- Status: RESUMO VIA PESQUISA (URL retornou HTTP 403)

---

## Resumo

Hooks são comandos shell, endpoints HTTP, prompts LLM ou subagentes definidos pelo usuário que executam automaticamente em pontos específicos do ciclo de vida do Claude Code. Eles permitem automatizar ações, impor políticas de segurança, injetar contexto e controlar o comportamento do Claude sem precisar modificar o código do modelo.

Quando um evento de hook dispara e um matcher corresponde, o Claude Code passa um objeto JSON com informações sobre o evento para o handler. Para handlers de comando, o JSON chega via `stdin`. Para hooks HTTP, chega como corpo da requisição POST.

Os hooks são configurados em `settings.json` e podem ser definidos em três escopos: usuário (`~/.claude/settings.json`), projeto (`.claude/settings.json`) e empresa (configuração gerenciada).

---

## Conceitos Principais

### Eventos do Ciclo de Vida

Os eventos são organizados em três cadências:

#### Por Sessão (uma vez por sessão)

| Evento | Quando Dispara |
|--------|----------------|
| `SessionStart` | Quando uma sessão inicia ou é restaurada |
| `SessionEnd` | Quando uma sessão termina |

#### Por Turno (uma vez por turno do usuário)

| Evento | Quando Dispara |
|--------|----------------|
| `UserPromptSubmit` | Quando o usuário submete um prompt, antes do Claude processá-lo |
| `Stop` | Quando o Claude termina de gerar uma resposta |
| `StopFailure` | Quando o Claude para devido a um erro |

#### Por Chamada de Ferramenta (a cada tool call no loop agêntico)

| Evento | Quando Dispara |
|--------|----------------|
| `PreToolUse` | Antes de qualquer ferramenta ser executada |
| `PostToolUse` | Depois de uma ferramenta executar com sucesso |

### Tipos de Handler

O Claude Code suporta quatro tipos de handler:

#### 1. Command (Shell)
Executa um script shell. O JSON de contexto chega via `stdin`.

```json
{
  "type": "command",
  "command": "/home/user/.claude/hooks/meu-hook.sh"
}
```

#### 2. HTTP
Faz uma requisição POST para uma URL. O JSON de contexto é enviado como body.

```json
{
  "type": "http",
  "url": "https://minha-api.exemplo.com/hooks/claude",
  "timeout": 5000
}
```

#### 3. Prompt
Faz uma pergunta sim/não ao Claude. Útil para confirmações.

```json
{
  "type": "prompt",
  "prompt": "Este arquivo contém dados sensíveis? Responda apenas sim ou não."
}
```

#### 4. Agent
Invoca um subagente com acesso a ferramentas para tomar decisões mais complexas.

```json
{
  "type": "agent",
  "agent": "agente-seguranca"
}
```

### Configuração em settings.json

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Sessão iniciada' >> ~/.claude/session.log"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/home/user/.claude/hooks/validar-comando.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "/home/user/.claude/hooks/formatar-arquivo.sh"
          }
        ]
      }
    ]
  }
}
```

### Matchers

O campo `matcher` é um padrão que filtra em qual ferramenta ou contexto o hook deve disparar:
- String vazia `""` — corresponde a todos os eventos
- Nome de ferramenta exato, ex: `"Bash"`, `"Edit"`, `"Write"`
- Padrão glob, ex: `"Read*"` — corresponde a `Read`, `ReadFile`, etc.

### Comportamento dos Hooks por Evento

#### PreToolUse
- Dispara **antes** de qualquer verificação de permissão
- Um hook que retorna `permissionDecision: "deny"` bloqueia a ferramenta mesmo em `bypassPermissions`
- Pode **reescrever** os argumentos da ferramenta via `hookSpecificOutput.updatedInput`
- Útil para impor políticas que não podem ser contornadas

#### PostToolUse
- Dispara **depois** que a ferramenta já executou com sucesso
- **Não pode desfazer** ações já executadas
- Pode **reescrever** a saída da ferramenta via `hookSpecificOutput.updatedToolOutput`
- Útil para formatar saídas, disparar notificações, registrar logs

#### SessionStart
- Executa quando a sessão inicia ou é restaurada
- Ideal para injetar variáveis de ambiente, carregar contexto inicial, registrar início de sessão, verificar dependências

#### UserPromptSubmit
- Dispara quando o usuário submete um prompt, antes do Claude processá-lo
- Pode **bloquear** o prompt ou **adicionar contexto** a ele
- Útil para filtros de conteúdo ou enriquecimento automático de contexto

#### Stop
- Dispara quando o Claude termina de gerar uma resposta
- Pode **forçar o Claude a continuar** trabalhando (impedindo a parada)
- Útil para validações pós-resposta ou pipelines contínuos

### Códigos de Saída

Para hooks do tipo `command`, o código de saída (`exit code`) controla o comportamento:

| Código | Significado |
|--------|-------------|
| `0` | Sucesso — continua normalmente |
| `1` | Falha — bloqueia a ação (em PreToolUse) ou registra erro |
| `2` | Erro fatal — para a sessão |

### JSON de Contexto

Cada evento passa um objeto JSON diferente. Exemplo para `PreToolUse`:

```json
{
  "event": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /tmp/teste"
  },
  "session_id": "abc123",
  "working_directory": "/home/user/projeto"
}
```

Exemplo para `PostToolUse`:

```json
{
  "event": "PostToolUse",
  "tool_name": "Edit",
  "tool_input": { "file_path": "/home/user/projeto/app.ts" },
  "tool_response": { "success": true },
  "session_id": "abc123"
}
```

---

## Endpoints / Comandos Principais

### Arquivo de Hook Shell Típico

```bash
#!/bin/bash
# Hook PreToolUse para bloquear comandos perigosos
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Bloquear comandos destrutivos
if echo "$COMMAND" | grep -qE 'rm -rf|DROP TABLE|DELETE FROM'; then
  echo '{"permissionDecision": "deny", "reason": "Comando potencialmente destrutivo bloqueado"}' >&2
  exit 1
fi

exit 0
```

### Hook HTTP em Node.js

```javascript
// Servidor Express recebendo hooks do Claude Code
app.post('/hooks/claude', (req, res) => {
  const { event, tool_name, tool_input } = req.body;

  if (event === 'PostToolUse' && tool_name === 'Write') {
    // Notificar equipe via Slack quando um arquivo é escrito
    notifySlack(`Arquivo criado: ${tool_input.file_path}`);
  }

  res.json({ success: true });
});
```

---

## Notas de Versão

- HTTP hooks foram introduzidos como adição significativa, permitindo integração com servidores web e serviços externos
- Agent hooks (tipo `agent`) são uma adição mais recente, permitindo decisões complexas via subagentes
- O total de tipos de eventos chegou a 12+ em versões recentes do Claude Code (2026)
- A capacidade de reescrever inputs (`updatedInput`) e outputs (`updatedToolOutput`) de ferramentas foi adicionada para transformações de dados no pipeline
- PreToolUse hooks têm prioridade sobre o modo `bypassPermissions`, tornando-os o mecanismo de segurança mais robusto disponível

---

## Aplicação no Campos Figueira

Para a imobiliária Campos Figueira, hooks podem automatizar fluxos operacionais e impor políticas de qualidade:

### Hooks Recomendados

#### 1. Hook de Log de Sessão (SessionStart)

```bash
#!/bin/bash
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] Sessão Claude Code iniciada" >> /home/user/dashboard/logs/claude-sessions.log
```

#### 2. Hook de Formatação Automática (PostToolUse — Edit/Write)
Após editar arquivos TypeScript/JavaScript, executa o prettier automaticamente:

```bash
#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ "$FILE" =~ \.(ts|tsx|js|jsx)$ ]]; then
  cd /home/user/dashboard
  npx prettier --write "$FILE" 2>/dev/null
fi
exit 0
```

#### 3. Hook de Validação de Dados de Imóvel (PreToolUse — Write)

```bash
#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ "$FILE" =~ imoveis/.*\.json$ ]]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // ""')
  if ! echo "$CONTENT" | jq -e '.preco and .endereco and .area' > /dev/null 2>&1; then
    echo '{"permissionDecision":"deny","reason":"Dados de imóvel incompletos: preco, endereco e area são obrigatórios"}' >&2
    exit 1
  fi
fi
exit 0
```

#### 4. Hook de Proteção de Banco de Dados (PreToolUse — Bash)

```bash
#!/bin/bash
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if echo "$CMD" | grep -iqE 'DROP TABLE|TRUNCATE|DELETE FROM.*WHERE.*1=1'; then
  echo '{"permissionDecision":"deny","reason":"Operação SQL destrutiva bloqueada. Use transações explícitas."}' >&2
  exit 1
fi
exit 0
```

### Configuração Completa para Campos Figueira

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "~/.claude/hooks/session-start.sh" }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "~/.claude/hooks/proteger-banco.sh" }]
      },
      {
        "matcher": "Write",
        "hooks": [{ "type": "command", "command": "~/.claude/hooks/validar-imovel.sh" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{ "type": "command", "command": "~/.claude/hooks/formatar-codigo.sh" }]
      }
    ]
  }
}
```
