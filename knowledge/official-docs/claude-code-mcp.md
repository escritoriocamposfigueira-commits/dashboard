# Claude Code MCP (Model Context Protocol) — Guia de Integração

- Fonte: https://docs.anthropic.com/en/docs/claude-code/mcp
- Data de consulta: 2026-06-25
- Status: RESUMO VIA PESQUISA (URL retornou HTTP 403)

---

## Resumo

O Model Context Protocol (MCP) é um padrão aberto para integração de IA com ferramentas externas. O Claude Code usa MCP para conectar-se a centenas de ferramentas, bancos de dados, APIs e fontes de dados. Um servidor MCP é um processo separado que expõe ferramentas, recursos e prompts que o Claude Code pode usar durante uma sessão.

O MCP resolve um problema fundamental: como dar ao Claude acesso a sistemas externos de forma padronizada, segura e extensível. Em vez de codificar integrações diretamente no modelo, o MCP define um protocolo de comunicação que qualquer serviço pode implementar.

A grande inovação recente é a **busca de ferramentas MCP (Tool Search)**: ferramentas MCP são carregadas de forma diferida (deferred), não entrando no contexto logo no início da sessão. O Claude usa uma ferramenta de busca para descobrir as ferramentas relevantes quando uma tarefa precisar delas. Apenas as ferramentas que o Claude realmente usa entram no contexto.

---

## Conceitos Principais

### O que é MCP

MCP (Model Context Protocol) é um protocolo aberto que define como clientes de IA (como o Claude Code) se comunicam com servidores de ferramentas. Um servidor MCP pode expor:

- **Tools (Ferramentas)** — funções que o Claude pode chamar (ex: buscar dados no banco, enviar email, consultar API)
- **Resources (Recursos)** — dados que o Claude pode ler via `@menção` (ex: arquivos, bancos de dados, documentações)
- **Prompts** — templates de prompt predefinidos que o servidor sugere

### Tool Search (Busca de Ferramentas)

Uma das principais features de MCP no Claude Code moderno:

- Ferramentas MCP são **diferidas** — não carregadas no contexto no início da sessão
- Apenas nomes de ferramentas e instruções do servidor carregam no início
- Quando o Claude precisa de uma ferramenta, ele usa o `ToolSearch` para descobri-la
- Apenas as ferramentas que o Claude realmente usa entram no contexto da sessão
- Isso mantém o uso de contexto baixo mesmo com dezenas de servidores MCP configurados

### MCP Resources e @Menções

Servidores MCP podem expor recursos que você referencia com `@`:
- Digite `@` no prompt para ver os recursos disponíveis de todos os servidores conectados
- Recursos funcionam como referências a arquivos, mas podem vir de qualquer fonte (banco de dados, API, etc.)
- Exemplos: `@meu-servidor/lista-imoveis`, `@crm/leads-pendentes`

### Escopos de Configuração

MCP servers podem ser configurados em três escopos:

| Escopo | Arquivo | Compartilhado? |
|--------|---------|----------------|
| Usuário | `~/.claude.json` | Não (apenas esta máquina) |
| Projeto | `.claude/settings.json` | Sim (commitado no repositório) |
| Empresa | Configuração gerenciada pelo administrador | Sim (toda a organização) |

### Tipos de Servidor MCP

#### 1. Servidor Local (stdio)
Processo local que se comunica via stdin/stdout:

```json
{
  "mcpServers": {
    "meu-servidor": {
      "command": "node",
      "args": ["/caminho/para/servidor.js"],
      "env": {
        "API_KEY": "minha-chave"
      }
    }
  }
}
```

#### 2. Servidor Remoto (HTTP/SSE)
Servidor web acessível via URL:

```json
{
  "mcpServers": {
    "servidor-remoto": {
      "url": "https://api.exemplo.com/mcp",
      "headers": {
        "Authorization": "Bearer TOKEN"
      }
    }
  }
}
```

#### 3. Servidor Inline (definido em subagentes)
Servidores MCP que existem apenas para a duração de um subagente:

```yaml
mcpServers:
  - name: db-temporario
    command: npx
    args: ["@meu-org/mcp-postgres"]
    env:
      DATABASE_URL: "${DATABASE_URL}"
```

### Estrutura de Configuração Completa

```json
{
  "mcpServers": {
    "nome-do-servidor": {
      "command": "npx",
      "args": ["-y", "@nome/pacote-mcp"],
      "env": {
        "VAR_AMBIENTE": "valor"
      },
      "timeout": 30000,
      "disabled": false
    }
  }
}
```

### Instruções do Servidor (Server Instructions)

Se você está construindo um servidor MCP, o campo `instructions` do servidor é importante quando Tool Search está ativado:
- As instruções do servidor ajudam o Claude a entender quando buscar suas ferramentas
- Funcionam de forma similar às descrições de skills
- Devem descrever o domínio e capacidades do servidor claramente

### Timeout e Variáveis de Ambiente

- `MCP_TIMEOUT` — variável de ambiente para configurar timeout de inicialização do servidor
- Valor padrão: 30 segundos
- Servidores que demoram mais para iniciar precisam de timeout maior

### Métodos de Instalação

Via CLI (wizard interativo):
```bash
claude mcp add nome-do-servidor npx @pacote/mcp-servidor
```

Via configuração manual (JSON): editar diretamente `~/.claude.json` ou `.claude/settings.json`

---

## Endpoints / Comandos Principais

### CLI para Gerenciar Servidores MCP

```bash
# Adicionar servidor MCP
claude mcp add nome npx @pacote/servidor

# Listar servidores MCP configurados
claude mcp list

# Remover servidor MCP
claude mcp remove nome

# Verificar status dos servidores
claude mcp status
```

### Exemplo de Servidor MCP em Node.js

```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "campos-figueira-mcp",
  version: "1.0.0",
  instructions: "Servidor MCP da imobiliária Campos Figueira. Use para buscar imóveis, leads e métricas."
});

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "buscar_imoveis") {
    const { tipo, preco_max, localizacao } = request.params.arguments;
    const imoveis = await db.query('SELECT * FROM imoveis WHERE ...');
    return { content: [{ type: "text", text: JSON.stringify(imoveis) }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Servidores MCP Populares

| Servidor | Pacote NPM | Uso |
|----------|------------|-----|
| GitHub | `@modelcontextprotocol/server-github` | Issues, PRs, código |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | Banco de dados |
| Google Drive | `@modelcontextprotocol/server-gdrive` | Documentos |
| Slack | `@modelcontextprotocol/server-slack` | Mensagens |
| Puppeteer | `@modelcontextprotocol/server-puppeteer` | Automação web |
| Filesystem | `@modelcontextprotocol/server-filesystem` | Acesso a arquivos |

---

## Notas de Versão

- O MCP foi lançado pela Anthropic como padrão aberto e tem sido adotado por muitos provedores de ferramentas
- Tool Search (busca diferida de ferramentas) é uma adição recente que melhora o desempenho com muitos servidores MCP
- MCP Resources com suporte a `@menção` foram adicionados para facilitar referência a dados externos
- Servidores MCP Remotos (HTTP/SSE) expandiram as possibilidades de integração com APIs hospedadas na nuvem
- A Anthropic mantém um marketplace oficial de servidores MCP e plugins

---

## Aplicação no Campos Figueira

Para a imobiliária Campos Figueira, servidores MCP conectam o Claude Code diretamente aos sistemas da empresa:

### Servidores MCP Recomendados

#### 1. MCP do Banco de Dados de Imóveis

```json
{
  "mcpServers": {
    "imoveis-db": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

Ferramentas expostas:
- `buscar_imoveis(tipo, preco_max, localizacao)` — buscar por critérios
- `criar_imovel(dados)` — adicionar novo imóvel
- `atualizar_imovel(id, campos)` — atualizar dados
- `listar_leads(status)` — listar leads por status

#### 2. MCP do Instagram (via Windsor.ai)
O servidor Windsor.ai MCP (já configurado neste ambiente) permite:
- Consultar métricas de posts do Instagram
- Publicar conteúdo diretamente
- Criar e gerenciar campanhas de anúncios

Ferramentas disponíveis via `mcp__Windsor_ai__`:
- `get_data` — buscar dados analíticos
- `execute_action` — executar ação (criar/pausar campanha)
- `list_actions` — listar ações disponíveis
- `get_fields` — ver campos disponíveis por conector

#### 3. Servidor MCP Customizado para Campos Figueira

```javascript
// packages/mcp-campos-figueira/index.js
const TOOLS = [
  {
    name: "publicar_imovel_instagram",
    description: "Publica um imóvel no Instagram da Campos Figueira",
    inputSchema: {
      type: "object",
      properties: {
        imovel_id: { type: "string" },
        legenda: { type: "string" },
        agendar_para: { type: "string", format: "date-time" }
      },
      required: ["imovel_id"]
    }
  },
  {
    name: "gerar_relatorio_semanal",
    description: "Gera relatório semanal de imóveis e leads",
    inputSchema: { type: "object", properties: {} }
  }
];
```

### Configuração de MCP para o Projeto

```json
{
  "mcpServers": {
    "campos-figueira": {
      "command": "node",
      "args": ["./packages/mcp-campos-figueira/index.js"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "INSTAGRAM_TOKEN": "${INSTAGRAM_ACCESS_TOKEN}"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Benefício Principal

Com MCP, o Claude Code tem acesso nativo aos dados da Campos Figueira sem precisar de scripts intermediários. Consultar imóveis, verificar leads, publicar no Instagram — tudo diretamente na conversa com o Claude.
