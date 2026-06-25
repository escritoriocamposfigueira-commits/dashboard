#!/bin/bash
# Hook de início de sessão — Escritório Campos Figueira
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🏠 ESCRITÓRIO CAMPOS FIGUEIRA"
echo "  Central de Marketing Digital"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
BRANCH=$(git branch --show-current 2>/dev/null || echo "desconhecido")
SKILLS=$(ls .claude/skills/ 2>/dev/null | wc -l | tr -d ' ')
AGENTS=$(ls .claude/agents/ 2>/dev/null | wc -l | tr -d ' ')
VIDEOS=$(ls knowledge/videos/ 2>/dev/null | wc -l | tr -d ' ')
echo "  📋 Branch: $BRANCH"
echo "  🛠️  Skills disponíveis: $SKILLS"
echo "  🤖 Agentes configurados: $AGENTS"
echo "  📚 Vídeos estudados: $VIDEOS"
echo ""
echo "  ⚠️  MODO: READ-ONLY e DRY-RUN por padrão"
echo "  ⚠️  Toda ação externa requer aprovação explícita"
echo "  ⚠️  Nunca publicar/pausar/criar sem APROVAR"
echo ""
echo "  💡 Skills: /criar-campanha-habitacao /auditar-conta-meta"
echo "  💡 Digite /[nome-da-skill] para ver todas as skills"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
