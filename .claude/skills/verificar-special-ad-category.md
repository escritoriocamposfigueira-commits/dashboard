---
name: verificar-special-ad-category
description: >
  Verifica se uma campanha Meta Ads para imóveis deve usar Special Ad Category
  HOUSING. Checklist obrigatório antes de criar qualquer campanha imobiliária.
  Use quando for criar campanha para: venda, locação, captação, financiamento,
  aluguel, imóvel, propriedade, moradia.
---

# /verificar-special-ad-category — Special Ad Category Imóveis

## Quando HOUSING é Obrigatório

Qualquer campanha que promova:
- ✅ Venda de imóvel residencial ou comercial
- ✅ Locação/aluguel de imóvel
- ✅ Financiamento imobiliário
- ✅ Captação de proprietários
- ✅ Serviços de corretagem
- ✅ Condomínios e loteamentos
- ✅ Regularização imobiliária (quando vinculada a venda/locação)

## O Que Muda com HOUSING

```
SEM HOUSING        COM HOUSING (obrigatório para imóveis)
─────────────────  ──────────────────────────────────────
Segmentar por      ❌ Não pode segmentar por idade
qualquer idade     ✅ Deve incluir todos os públicos adultos

Excluir gêneros    ❌ Não pode excluir gênero
                   ✅ Deve incluir todos os gêneros

Raio geográfico    ❌ Raio mínimo: 15 milhas (~24km)
de 1km             ✅ Usar cidade ou região (não bairro)

Interesses livres  ✅ Interesses ainda são permitidos
                   (imóveis, família, financiamento)
```

## Impacto no Custo
- CPM tende a aumentar (público maior, menos segmentado)
- Compensar com criativos mais relevantes e copy mais preciso
- Usar Advantage+ Audience quando disponível

## Checklist Antes de Criar Campanha

☐ A campanha envolve imóvel, moradia ou aluguel?
☐ `special_ad_categories: ["HOUSING"]` está no JSON da campanha?
☐ Segmentação por idade removida ou incluindo todos?
☐ Segmentação por gênero removida ou incluindo todos?
☐ Raio geográfico ≥ 24km ou cidade/região?
☐ Nenhum atributo proibido no targeting?

## Exemplo de Targeting Correto (JSON)
```json
{
  "targeting": {
    "geo_locations": {
      "cities": [{"key": "MOGI_DAS_CRUZES_ID", "radius": 40, "distance_unit": "kilometer"}]
    },
    "age_min": 18,
    "genders": [1, 2]
  }
}
```

## Exemplos de Uso
1. "preciso criar campanha para vender sobrado" → verifica e confirma HOUSING obrigatório
2. "posso segmentar por renda para anúncio de imóvel?" → não, e explica alternativas
3. "campanha de regularização precisa de HOUSING?" → depende — analisa caso a caso

## Fontes
- Meta: Special Ad Categories para Habitação
- Fair Housing Act (EUA) e equivalente brasileiro
- Meta Advertising Policies (seção Housing)
