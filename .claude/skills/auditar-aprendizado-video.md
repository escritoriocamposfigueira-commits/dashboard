---
name: auditar-aprendizado-video
description: Revisa documentos de estudo de vídeos já criados e verifica se os conhecimentos foram aplicados corretamente no projeto. Identifica o que foi implementado vs. o que ainda precisa ser feito.
---
# /auditar-aprendizado-video — Auditar Aprendizado de Vídeo

## O Que Auditar
1. Vídeos estudados sem skill correspondente criada
2. Skills criadas mas não testadas
3. Técnicas aprovadas mas não implementadas
4. Conflitos com documentação oficial não resolvidos

## Saída
```markdown
## AUDITORIA DE APRENDIZADO — [DATA]

### ✅ Implementado
[lista do que foi aplicado]

### ⏳ Aprovado mas Pendente
[lista com prioridade]

### ❓ Necessita Confirmação
[lista com perguntas específicas]

### ❌ Rejeitado / Desatualizado
[lista com motivo]
```

## Gatilho de Uso
Executar após estudar cada lote de 5 vídeos.
