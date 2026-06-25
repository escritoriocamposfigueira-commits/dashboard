# V02 — Claude Code Best Practices

- Canal/Autor: Code with Claude (Evento oficial Anthropic)
- URL: https://claude.com/code-with-claude/session/ldn-beyond-the-basics-with-claude-code
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

Este vídeo/sessão cobre as melhores práticas para uso profissional do Claude Code, reunindo lições aprendidas de projetos reais em produção. O conteúdo foi compilado a partir de múltiplas fontes técnicas incluindo a documentação oficial (code.claude.com/docs/en/best-practices) e casos de uso reais publicados por desenvolvedores em 2025-2026.

O ponto central das melhores práticas modernas é que o centro de gravidade do trabalho com Claude Code mudou: não é mais sobre gerenciamento manual de contexto, mas sobre construir uma estrutura (harness) rica em torno do modelo — com modo de planejamento, exploração paralela, memória persistente de projeto, execução estruturada e continuidade de sessões longas.

As práticas se organizam em quatro fases de trabalho: (1) entrada no modo de planejamento para leitura e compreensão sem modificações; (2) revisão e edição do plano proposto; (3) execução supervisionada; (4) validação via testes automatizados. Para tarefas pequenas e bem definidas (corrigir um typo, renomear uma variável), pular direto para a execução é aceitável.

Um princípio fundamental recorrente é: testes como fonte externa de verdade. Sem testes, o Claude valida seu próprio trabalho usando julgamento interno, que se degrada à medida que o contexto da sessão enche. Cada ciclo vermelho-para-verde fornece feedback inequívoco e mantém a qualidade em sessões longas.

Outro princípio central é a organização do CLAUDE.md: deve conter apenas o que é verdadeiro em todas as sessões, estruturado em torno de três perguntas — o quê (stack/ferramentas), por quê (regras de negócio, restrições), e como (comandos, convenções). Cada linha consome orçamento de contexto em cada turno.

## Procedimento / Conceitos Principais

1. **CLAUDE.md bem estruturado**:
   - Máximo ~200 linhas para preservar orçamento de contexto
   - Incluir: stack, convenções de código, comandos de teste, restrições de negócio
   - Atualizar quando regras do projeto mudarem permanentemente
   - Não incluir informações de sessão única (isso desperdiça contexto)

2. **Separar pesquisa de implementação**:
   - Fase 1: `/plan` para modo de planejamento
   - Fase 2: Revisar o plano proposto — editar diretamente no editor de texto
   - Fase 3: Confirmar execução somente após aprovação do plano

3. **Testes como âncora de qualidade**:
   - Escrever testes antes de solicitar implementação (TDD)
   - Cada teste com falha → correção → teste verde = ciclo de feedback claro
   - Testes previnem regressões em sessões longas

4. **Hooks para comportamento determinístico**:
   - Configurar em `.claude/settings.json`
   - Exemplos: lint automático antes de commit, formatação de código, validação de tipos
   - Hooks executam sempre (diferente de instruções no CLAUDE.md)

5. **Skills para conhecimento reutilizável**:
   - Criar arquivos em `.claude/skills/` com procedimentos documentados
   - Exemplo: skill de deploy, skill de criação de componente, skill de geração de relatório

6. **Subagentes para isolamento**:
   - Definir agentes especializados em `.claude/agents/`
   - Cada subagente tem papel, ferramentas e modelo específicos
   - Trabalham em janelas de contexto separadas e retornam relatório comprimido ao orquestrador

7. **Commits frequentes como checkpoints**:
   - Commitar antes de grandes refatorações
   - Facilita rollback se a direção da IA não for a desejada

8. **Modo auto com guardrails**:
   - Usar `--allowedTools` para restringir quais ferramentas o agente pode usar
   - Configurar permissões granulares no settings.json

9. **Gerenciamento de contexto**:
   - `/clear` para limpar contexto quando a sessão deriva
   - Resumir estado atual antes de nova sessão longa
   - Usar `--continue` para retomar sessões anteriores

10. **Observabilidade**:
    - Usar `--verbose` para ver raciocínio interno do agente
    - Monitorar uso de tokens para controle de custos

11. **Validação de saída**:
    - Sempre revisar código gerado antes de merge em produção
    - Não confiar cegamente em "funciona no meu teste" do agente

12. **Iteração pequena**:
    - Tarefas menores e bem definidas produzem resultados melhores que tarefas vagas grandes

## Conhecimentos Úteis

- A diferença entre projetos que escalam bem com Claude Code e os que não escalam está quase sempre na presença ou ausência de testes automatizados
- CLAUDE.md é lido no início de cada sessão — é o único mecanismo de memória persistente confiável entre sessões
- Hooks no settings.json são garantidos de executar; instruções em CLAUDE.md são consultivas e podem ser ignoradas sob pressão de contexto
- O modo de planejamento (separado da execução) existe justamente para evitar o padrão de "resolver o problema errado" — comum quando o agente vai direto ao código
- Skills permitem encapsular conhecimento de domínio específico como procedimento reutilizável em vez de repetir instruções em cada prompt
- Subagentes com contextos separados permitem exploração paralela sem poluir o contexto principal
- Para projetos em produção, a combinação CLAUDE.md + testes + hooks é o mínimo necessário para uso confiável
- Sessões longas degradam a qualidade — dividir tarefas grandes em sessões menores com commits intermediários
- O padrão de três perguntas para CLAUDE.md (o quê, por quê, como) é mais eficaz que simplesmente listar regras
- Manter CLAUDE.md versionado no git junto com o código permite rastrear evolução das convenções do projeto
- Workflows de 2026 removem comandos manuais de pesquisa e validação em favor de `/plan` e linguagem natural

## Aplicação no Campos Figueira

- **CLAUDE.md do projeto**: Criar documento específico para o dashboard com contexto do negócio imobiliário — tipos de imóvel, regiões atendidas em Mogi das Cruzes, processo de cadastro de cliente, etapas de venda, comissões
- **Hooks de qualidade**: Configurar lint e formatação automáticos antes de cada commit — garante consistência de código mesmo com múltiplos colaboradores ou sessões de IA
- **Skills reutilizáveis**: Criar skills para tarefas recorrentes como "gerar relatório de imóveis disponíveis", "atualizar status de negociação", "exportar listings para portais"
- **Testes de regressão**: Proteger funcionalidades críticas como cálculo de comissão, geração de contratos e filtros de busca de imóveis com testes automatizados
- **Isolamento por domínio**: Usar subagentes especializados — um para frontend (interface de busca), outro para backend (APIs de imóveis), outro para integrações externas
- **Documentação viva**: O padrão de skills como documentação executável é ideal para uma agência onde processos mudam com frequência de mercado
- **Controle de custo**: Monitorar tokens por sessão especialmente em tarefas longas de geração de conteúdo (descrições de imóveis, anúncios)

## Validação

- **Aprovado**: CLAUDE.md como memória persistente de projeto
- **Aprovado**: Testes como fonte externa de verdade
- **Aprovado**: Hooks para comportamento determinístico
- **Aprovado**: Skills e subagentes para especialização
- **Confirmar**: Limite exato de linhas do CLAUDE.md na versão atual do Claude Code
- **Confirmar**: Formato atual do settings.json para hooks (verificar documentação oficial)

## Decisão por Ensinamento

APROVADO
