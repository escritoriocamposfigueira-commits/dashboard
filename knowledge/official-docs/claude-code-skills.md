# Claude Code Skills — Guia Oficial

- Fonte: https://docs.anthropic.com/en/docs/claude-code/skills
- Data de consulta: 2026-06-25
- Status: RESUMO VIA PESQUISA (URL retornou HTTP 403)

---

## Resumo

Skills são extensões de comportamento para o Claude Code que permitem empacotar instruções, procedimentos e lógica reutilizável em arquivos Markdown. Quando ativadas, as skills ampliam o que o Claude consegue fazer dentro de uma sessão, sem precisar repetir instruções no chat. Elas podem ser invocadas explicitamente com `/nome-da-skill` ou ativadas automaticamente quando o Claude detecta que a tarefa corresponde à descrição da skill.

As skills substituíram e absorveram o antigo sistema de "custom commands": um arquivo em `.claude/commands/deploy.md` e uma skill em `.claude/skills/deploy/SKILL.md` produzem exatamente o mesmo resultado — ambos criam o comando `/deploy`.

Skills são carregadas de forma preguiçosa (lazy-loading): apenas o nome e a descrição entram no contexto no início da sessão. O corpo completo da skill só é carregado quando ela é invocada. Isso significa que adicionar muitas skills tem impacto mínimo no uso de contexto.

---

## Conceitos Principais

### O que é uma Skill

Uma skill é um diretório dentro de `.claude/skills/` (ou `~/.claude/skills/` para uso global) que contém obrigatoriamente um arquivo `SKILL.md`. Este arquivo possui duas partes:

1. **Frontmatter YAML** — delimitado por `---`, configura metadados como nome, descrição e ferramentas permitidas.
2. **Corpo Markdown** — as instruções que o Claude segue quando a skill é executada.

### Estrutura de Arquivos

```
.claude/skills/
  minha-skill/
    SKILL.md          # Obrigatório — instruções principais
    references/       # Opcional — documentação adicional
    scripts/          # Opcional — scripts executáveis
    templates/        # Opcional — templates de arquivo
    assets/           # Opcional — arquivos estáticos
```

### Frontmatter YAML

```yaml
---
name: minha-skill
description: Descreve o que a skill faz e quando usar
allowed-tools:
  - Bash
  - Edit
  - Read
disable-model-invocation: false
---
```

Campos do frontmatter:
- `name` — nome usado para invocar a skill com `/`
- `description` — texto que aparece no menu de skills e ajuda o Claude a decidir quando usá-la automaticamente
- `allowed-tools` — lista opcional de ferramentas que a skill pode usar
- `disable-model-invocation` — quando `true`, desabilita a invocação automática pelo modelo

### Onde Armazenar Skills

| Local | Escopo |
|-------|--------|
| `~/.claude/skills/` | Global — disponível em todos os projetos da máquina |
| `.claude/skills/` | Local ao projeto — commitado no repositório, compartilhado com o time |

### Orçamento de Contexto

O Claude Code mantém um "orçamento de descrições" igual a aproximadamente 1% da janela de contexto do modelo. Quando esse orçamento é excedido:
- Skills menos usadas têm suas descrições truncadas primeiro
- Skills invocadas com frequência mantêm o texto completo
- Nomes de todas as skills são sempre incluídos, independente do orçamento

### Skills Bundled (embutidas)

O Claude Code vem com um conjunto de skills embutidas por padrão:
- `/code-review` — revisão de código
- `/batch` — execução de tarefas em lote
- `/debug` — depuração
- `/loop` — execução repetida de um comando
- `/claude-api` — referência da API Claude/Anthropic
- `/run` — iniciar e observar a aplicação
- `/verify` — verificar se uma mudança funciona
- `/run-skill-generator` — gerador de novas skills

Para desabilitar as skills embutidas, use a configuração `disableBundledSkills: true` em `settings.json` ou a variável de ambiente `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=true`.

### Quando Criar uma Skill

Crie uma skill quando:
- Você frequentemente cola as mesmas instruções no chat
- Uma seção do `CLAUDE.md` cresceu e virou um procedimento
- Existe um checklist ou processo multi-etapas repetido
- Um fluxo de trabalho precisa ser compartilhado com toda a equipe

### Invocação

- **Explícita**: `/nome-da-skill` — o Claude carrega e executa a skill imediatamente
- **Automática**: O Claude detecta que a tarefa corresponde à descrição da skill e a invoca sem ser solicitado
- **Com argumentos**: `/nome-da-skill argumento1 argumento2`

---

## Endpoints / Comandos Principais

| Comando | Descrição |
|---------|-----------|
| `/nome-da-skill` | Invocar uma skill diretamente |
| `/code-review` | Revisar o diff atual |
| `/code-review --fix` | Revisar e aplicar correções automaticamente |
| `/loop 5m /foo` | Executar `/foo` a cada 5 minutos |
| `/verify` | Verificar se uma mudança funciona na aplicação real |
| `/run` | Iniciar e observar a aplicação |

---

## Notas de Versão

- Skills absorveram o sistema legado de "custom commands" — ambos os formatos coexistem e funcionam da mesma forma
- A variável `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` e a configuração `disableBundledSkills` foram introduzidas para ambientes minimalistas
- O orçamento de contexto de 1% para descrições de skills é um comportamento definido para versões recentes do Claude Code
- Skills podem ser distribuídas via plugins e marketplace

---

## Aplicação no Campos Figueira

Para a imobiliária Campos Figueira, as skills podem automatizar fluxos de trabalho recorrentes do projeto:

### Skills Recomendadas

1. **`/publicar-imovel`** — Skill para criar e publicar um novo imóvel no CMS, validando campos obrigatórios (preço, área, localização, fotos), gerando descrição SEO e postando nas redes sociais.

2. **`/revisar-conteudo`** — Checklist de revisão de texto para descrições de imóveis: gramática, formatação de preços em BRL, consistência de termos (metragem, dormitórios, vagas).

3. **`/gerar-post-instagram`** — Skill especializada para criar conteúdo formatado para Instagram a partir dos dados do imóvel: legenda com emojis, hashtags locais, call-to-action.

4. **`/sincronizar-portfolio`** — Skill para verificar consistência entre banco de dados, CMS e feeds de redes sociais, identificando imóveis publicados em um canal mas não em outro.

5. **`/relatorio-semana`** — Gera relatório semanal de métricas: imóveis publicados, leads gerados, posts de melhor desempenho.

### Exemplo de SKILL.md para Campos Figueira

```markdown
---
name: publicar-imovel
description: Cria e publica um novo imóvel no sistema da Campos Figueira, incluindo validação de dados, geração de descrição e agendamento de posts
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
---

## Fluxo de Publicação de Imóvel

1. Ler o arquivo de dados do imóvel fornecido
2. Validar campos obrigatórios (endereço, preço, área, dormitórios)
3. Gerar descrição SEO em português brasileiro
4. Criar post formatado para Instagram
5. Salvar no banco de dados / CMS
6. Confirmar publicação
```

### Benefício Principal

Com skills, qualquer membro da equipe pode executar processos complexos com um único comando, sem precisar conhecer os detalhes técnicos. O time de marketing pode usar `/gerar-post-instagram` diretamente sem depender de um desenvolvedor.
