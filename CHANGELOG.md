# CHANGELOG
## Escritório Campos Figueira — Central de Marketing Digital

---

## [1.3.0] — 2026-06-25 — Sistema de Skills e Agentes

### Adicionado
- 29 skills em `.claude/skills/` (todas em português brasileiro):
  - 9 skills de Meta Ads e campanhas
  - 5 skills de conteúdo e criativo
  - 4 skills de automação (n8n, workflows)
  - 4 skills de conformidade e segurança
  - 4 skills de relatórios e monitoramento
  - 3 skills de gestão e publicação
- 13 subagentes em `.claude/agents/`:
  - pesquisador-videos, validador-docs-oficiais
  - auditor-meta-ads, gestor-midia-paga
  - estrategista-imoveis, especialista-engenharia-marketing
  - estrategista-conteudo, redator, diretor-criativo
  - especialista-analytics, arquiteto-qualificacao-leads
  - revisor-conformidade, gestor-qa-releases
- Documentos mestres: MASTER_MARKETING_PLAYBOOK.md, META_AUTOMATION_ARCHITECTURE.md, COMPLIANCE_MATRIX.md
- Hook de sessão: `.claude/hooks/session-start.sh`
- Status dos vídeos: `knowledge/VIDEO_STUDY_STATUS.md`
- Estrutura de pastas: knowledge/, reports/, workflows/, campaigns/, etc.

---

## [1.2.0] — 2026-06-25 — Agendador Meta Ads

### Adicionado
- `/agendador` — página admin para agendar posts Facebook e publicar Instagram
- `/api/meta/agendar` — agenda todos os 40 posts no Facebook Planner
- `/api/meta/publicar-instagram` — publica post no Instagram via container
- `/api/meta/verificar-token` — valida Page Access Token
- `src/lib/meta-api.ts` — cliente Meta Graph API v22.0

---

## [1.1.0] — 2026-06-25 — Calendário de Conteúdo

### Adicionado
- `src/content/calendario-julho-2026.json` — 40 posts (26 VENDA + 7 LOCAÇÃO + 7 CONTEÚDO)
- `src/content/calendario-julho-2026.md` — calendário em formato markdown
- Posts com copy emocional (dor/desejo/urgência), CTA WhatsApp com palavra-chave

---

## [1.0.0] — 2026-06-24 — Dashboard Inicial

### Adicionado
- Dashboard Next.js 16 com dados reais Windsor.ai
- KPIs Instagram: alcance, visualizações, interações, seguidores
- KPIs Facebook: impressões, cliques, reações
- Gráficos: ReachChart, EngagementChart, FbChart (Recharts)
- Perfil Instagram com seguidores e taxa de engajamento
- Diagnóstico automático com 5 insights baseados em dados reais
- Alerta Meta Ads não conectado com link de autorização
