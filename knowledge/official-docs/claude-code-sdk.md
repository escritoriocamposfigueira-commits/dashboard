# Claude Code Agent SDK — Guia de Uso Programático

- Fonte: https://docs.anthropic.com/en/docs/claude-code/sdk
- Data de consulta: 2026-06-25
- Status: RESUMO VIA PESQUISA (URL retornou HTTP 403)

---

## Resumo

O Agent SDK do Claude Code fornece as mesmas ferramentas, loop de agente e gerenciamento de contexto que alimentam o Claude Code, mas de forma programável em Python e TypeScript. Com o SDK, você pode construir agentes de IA autônomos que leem arquivos, executam comandos, buscam na web, editam código e muito mais — tudo controlado pelo seu próprio código.

O SDK é essencialmente o "motor" do Claude Code exposto como biblioteca. Isso significa que agentes construídos com o SDK têm as mesmas capacidades do Claude Code interativo, mas podem ser integrados em pipelines automatizados, APIs web, scripts de CI/CD e qualquer outro sistema.

### Casos de Uso Principais

- Agentes de automação que rodam sem supervisão humana
- Pipelines de processamento de código em CI/CD
- Sistemas de análise de dados autônomos
- Assistentes especializados embutidos em aplicações web
- Orquestração de múltiplos agentes em fluxos complexos

---

## Conceitos Principais

### Requisitos

| Linguagem | Requisito |
|-----------|-----------|
| Python | Python 3.10 ou superior |
| TypeScript/Node.js | O SDK inclui o binário nativo — não requer Claude Code CLI separado |

### Instalação

```bash
# Python
pip install claude-code-sdk

# TypeScript/Node.js
npm install @anthropic-ai/claude-code
```

### API Principal

A função central do SDK é `query()`, que aceita uma configuração e retorna um stream de eventos do agente.

**TypeScript:**
```typescript
import { query } from "@anthropic-ai/claude-code";

for await (const event of query({
  prompt: "Leia o arquivo package.json e me diga a versão do projeto",
  options: {
    maxTurns: 10,
    cwd: "/home/user/dashboard"
  }
})) {
  if (event.type === "text") {
    process.stdout.write(event.text);
  }
}
```

**Python:**
```python
import asyncio
from claude_code_sdk import query

async def main():
    async for event in query(
        prompt="Leia o arquivo package.json e me diga a versão",
        options={
            "max_turns": 10,
            "cwd": "/home/user/dashboard"
        }
    ):
        if event["type"] == "text":
            print(event["text"], end="")

asyncio.run(main())
```

### System Prompt

Para usar o system prompt completo do Claude Code:

```typescript
const stream = query({
  prompt: "Analise este repositório",
  options: {
    systemPrompt: {
      type: "preset",
      preset: "claude_code"
    }
  }
});
```

Para system prompt personalizado:
```typescript
{
  systemPrompt: {
    type: "custom",
    text: "Você é um assistente especializado em imóveis brasileiros..."
  }
}
```

### Ferramentas Customizadas (Custom Tools)

Usando o servidor MCP interno do SDK, você pode dar ao Claude acesso a banco de dados, APIs externas e lógica específica do domínio:

```typescript
import { query, InProcessMCPServer } from "@anthropic-ai/claude-code";

const server = new InProcessMCPServer({
  tools: [
    {
      name: "buscar_imovel",
      description: "Busca imóveis no banco de dados da Campos Figueira",
      inputSchema: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["casa", "apartamento", "terreno"] },
          preco_max: { type: "number" },
          cidade: { type: "string" }
        }
      },
      handler: async ({ tipo, preco_max, cidade }) => {
        const resultados = await db.buscar({ tipo, preco_max, cidade });
        return { content: [{ type: "text", text: JSON.stringify(resultados) }] };
      }
    }
  ]
});

const stream = query({
  prompt: "Encontre apartamentos até R$ 500.000 em Campinas",
  options: {
    mcpServers: [server],
    allowedTools: ["buscar_imovel"]
  }
});
```

### Controle de Permissões

```typescript
import { query, PermissionMode } from "@anthropic-ai/claude-code";

const stream = query({
  prompt: "Atualize os arquivos de configuração",
  options: {
    permissionMode: PermissionMode.ACCEPT_EDITS,
    allowedTools: ["Read", "Edit", "Write"],
    disallowedTools: ["Bash"]
  }
});
```

### Eventos do Stream

O SDK emite eventos que você pode processar:

```typescript
for await (const event of stream) {
  switch (event.type) {
    case "text":
      console.log(event.text);
      break;
    case "tool_use":
      console.log(`Usando ferramenta: ${event.name}`);
      break;
    case "tool_result":
      // resultado de ferramenta disponível
      break;
    case "thinking":
      // extended thinking ativo
      break;
    case "error":
      console.error(event.error);
      break;
    case "done":
      console.log("Agente concluiu");
      break;
  }
}
```

### Gerenciamento de Contexto e Sessões

```typescript
// Continuar uma sessão existente
const stream = query({
  prompt: "Agora salve as mudanças",
  options: {
    sessionId: "sessao-anterior-123",
    maxTurns: 5
  }
});

// Limitar uso de contexto
const stream = query({
  prompt: "...",
  options: {
    maxTurns: 3,
    maxTokens: 10000
  }
});
```

---

## Endpoints / Comandos Principais

### API TypeScript — Tipos Principais

```typescript
// Função principal
query(config: QueryConfig): AsyncIterable<Event>

// Configuração
interface QueryConfig {
  prompt: string;
  options?: {
    systemPrompt?: { type: "preset"; preset: "claude_code" } | { type: "custom"; text: string };
    maxTurns?: number;
    maxTokens?: number;
    cwd?: string;
    sessionId?: string;
    permissionMode?: PermissionMode;
    allowedTools?: string[];
    disallowedTools?: string[];
    mcpServers?: MCPServer[];
    background?: boolean;
    model?: string;
  };
}

// Modos de permissão
enum PermissionMode {
  DEFAULT = "default",
  ACCEPT_EDITS = "acceptEdits",
  BYPASS_PERMISSIONS = "bypassPermissions"
}
```

### API Python — Opções Disponíveis

```python
options = {
    "system_prompt": {"type": "preset", "preset": "claude_code"},
    "max_turns": 10,
    "max_tokens": 4096,
    "cwd": "/caminho/do/projeto",
    "session_id": "id-sessao",
    "permission_mode": "default",      # "default" | "acceptEdits" | "bypassPermissions"
    "allowed_tools": ["Read", "Bash"],
    "disallowed_tools": ["Write"],
    "mcp_servers": [],
    "background": False,
    "model": "claude-sonnet-4-5"
}
```

### Servidor MCP Interno

```typescript
import { InProcessMCPServer } from "@anthropic-ai/claude-code";

const mcpServer = new InProcessMCPServer({
  name: "meu-servidor",
  tools: [...],
  resources: [...]
});
```

---

## Notas de Versão

- O SDK foi lançado como o "Agent SDK" do Claude Code, distinguindo-se da antiga API HTTP da Anthropic
- Python 3.10+ é obrigatório — versões anteriores não são suportadas
- O SDK TypeScript inclui binários nativos para macOS, Linux e Windows
- Custom tools via `InProcessMCPServer` permite integração profunda com sistemas externos sem servidor MCP separado
- `systemPrompt: { type: "preset", preset: "claude_code" }` garante acesso ao conhecimento completo de ferramentas
- Suporte a extended thinking (campo `thinking` nos eventos) está disponível para modelos compatíveis
- O campo `background: true` habilita execução assíncrona para tarefas longas

---

## Aplicação no Campos Figueira

Para a imobiliária Campos Figueira, o SDK permite construir automações sofisticadas:

### Caso de Uso 1: Gerador Automático de Conteúdo

```python
import asyncio
from claude_code_sdk import query

async def gerar_conteudo_imovel(imovel_id: str):
    """Gera legenda e hashtags para post de imóvel no Instagram"""
    async for event in query(
        prompt=f"""
        Leia os dados do imóvel ID {imovel_id} em /home/user/dashboard/data/imoveis.json
        e crie:
        1. Uma legenda envolvente para Instagram (máx 300 caracteres)
        2. 15 hashtags relevantes misturando português e inglês
        3. Sugestão de horário ideal para publicar
        """,
        options={
            "system_prompt": {"type": "preset", "preset": "claude_code"},
            "max_turns": 5,
            "cwd": "/home/user/dashboard",
            "allowed_tools": ["Read"],
            "permission_mode": "default"
        }
    ):
        if event["type"] == "text":
            print(event["text"], end="")

asyncio.run(gerar_conteudo_imovel("imovel-123"))
```

### Caso de Uso 2: Auditoria de Consistência em CI/CD

```typescript
import { query } from "@anthropic-ai/claude-code";
import fs from "fs";

async function auditarConsistencia() {
  const relatorio: string[] = [];

  for await (const event of query({
    prompt: `
      Verifique a consistência dos dados da Campos Figueira:
      1. Leia todos os imóveis em /home/user/dashboard/data/imoveis.json
      2. Verifique quais têm fotos faltando
      3. Identifique imóveis com preço zerado ou nulo
      4. Liste imóveis publicados há mais de 90 dias sem atualização
      Gere um relatório em formato JSON.
    `,
    options: {
      maxTurns: 10,
      cwd: "/home/user/dashboard",
      allowedTools: ["Read", "Glob", "Bash"],
      permissionMode: "default"
    }
  })) {
    if (event.type === "text") relatorio.push(event.text);
  }

  fs.writeFileSync("/home/user/dashboard/reports/auditoria.json", relatorio.join(""));
}

auditarConsistencia();
```

### Caso de Uso 3: Endpoint de Assistente Virtual (Next.js)

```typescript
// app/api/assistente/route.ts
import { query } from "@anthropic-ai/claude-code";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { pergunta } = await req.json();
  const partes: string[] = [];

  for await (const event of query({
    prompt: pergunta,
    options: {
      systemPrompt: {
        type: "custom",
        text: "Você é o assistente virtual da Campos Figueira, imobiliária em Campinas/SP. Responda sempre em português brasileiro de forma amigável."
      },
      maxTurns: 3,
      cwd: "/home/user/dashboard",
      allowedTools: ["Read"],
      disallowedTools: ["Bash", "Edit", "Write"]
    }
  })) {
    if (event.type === "text") partes.push(event.text);
  }

  return NextResponse.json({ resposta: partes.join("") });
}
```

### Benefício Principal

O SDK transforma o Claude Code de uma ferramenta interativa em um componente programável. Para a Campos Figueira, isso significa automações que rodam sem supervisão — gerando conteúdo, auditando dados e respondendo clientes 24/7.
