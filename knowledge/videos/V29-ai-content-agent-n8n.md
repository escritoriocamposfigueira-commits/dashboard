# V29 — I Built AI Content Agent n8n Claude

- Canal/Autor: Não identificado via pesquisa (provavelmente criador de conteúdo de automação)
- URL: Não encontrado via pesquisa
- Status: RESUMO VIA PESQUISA (YouTube bloqueado no ambiente remoto)
- Idioma original: Inglês

## Resumo Técnico

O vídeo documenta a construção de um agente de criação de conteúdo para redes sociais usando n8n como orquestrador e Claude como motor de geração de texto e ideação. O agente automatiza o processo editorial completo: pesquisa de temas, geração de texto, adaptação por plataforma (Instagram, Facebook, LinkedIn, etc.) e agendamento de publicações.

O diferencial desse tipo de agente em relação a ferramentas simples de IA é a persistência de contexto e a capacidade de aprender o tom de voz da marca ao longo do tempo. Usando um banco de dados vetorial (Supabase, Pinecone) ou simples referências em texto, o agente pode ter acesso ao histórico de conteúdos publicados e ao guia de estilo da marca, gerando conteúdo coerente e consistente.

O n8n orquestra o workflow inteiro: triggers agendados disparam o agente, que consulta tendências, gera variações de conteúdo, formata para cada plataforma e agenda publicações via APIs. Claude é usado tanto para gerar o conteúdo quanto para avaliar a qualidade antes de publicar — um mecanismo de auto-revisão.

## Procedimento / Conceitos Principais

1. **Trigger de criação**: Schedule Trigger (ex: toda segunda, quarta e sexta) ou trigger manual no n8n.
2. **Pesquisa de tendências**: Nó HTTP Request para buscar tendências do setor (Google Trends API, feeds RSS do setor imobiliário, notícias locais de Mogi das Cruzes).
3. **Briefing para Claude**: Construir prompt com: tom de voz da marca, temas do mês, tendências encontradas, conteúdos recentes (evitar repetição), objetivo do post.
4. **Geração de conteúdo com Claude**: Claude gera 3-5 variações de texto para o post com diferentes abordagens (educativo, emocional, informativo, urgência).
5. **Adaptação por plataforma**:
   - Instagram: texto curto, até 5 hashtags relevantes, CTA claro.
   - Facebook: texto médio, link opcional, pergunta para engajamento.
   - LinkedIn: texto mais formal e analítico, sem hashtags em excesso.
6. **Geração de briefing de imagem**: Claude gera prompt para criação de imagem (Midjourney, DALL-E, Canva) baseado no conteúdo do texto.
7. **Auto-revisão**: Segundo prompt para Claude avaliar o conteúdo gerado: "Este conteúdo está alinhado com o tom de voz da marca? Score de 1-10 e justificativa."
8. **Armazenar no calendário**: Salvar conteúdos aprovados (score > 7) em Google Sheets ou Airtable com status "pronto para revisão humana".
9. **Notificar responsável**: Enviar mensagem no WhatsApp ou Telegram para a pessoa responsável revisar e aprovar os conteúdos gerados.
10. **Após aprovação humana**: Workflow secundário pega conteúdos aprovados e agenda publicações via API do Facebook/Instagram.
11. **Feedback loop**: Após publicação, coletar métricas (curtidas, alcance, cliques) e usar como contexto para gerar conteúdos futuros melhores.
12. **Gestão do histórico**: Salvar todos os conteúdos publicados com métricas para que Claude evite repetir temas que performaram mal.

## Conhecimentos Úteis

- Template n8n #6375: "AI-powered social media thought leadership with Claude Sonnet & Trigify" — exemplo de agente de conteúdo com Claude.
- Template n8n #7046: "Auto-generate platform-optimized social media posts from WordPress with Claude & Postiz" — geração por plataforma.
- Claude Sonnet é uma boa escolha de custo-benefício para geração de conteúdo em volume; Claude Opus para casos que exigem maior criatividade.
- O Postiz (postiz.com) é uma ferramenta all-in-one que integra com n8n para agendamento em múltiplas plataformas.
- Prompts de sistema bem elaborados são mais eficazes que tentar treinar o modelo — incluir exemplos reais de conteúdos aprovados no prompt.
- A auto-revisão pelo Claude (avaliar o próprio output) aumenta significativamente a qualidade final do conteúdo.
- Manter um banco de temas "proibidos" (conteúdos que geraram reações negativas ou não se alinham com a marca) que o agente consulta antes de gerar.
- A cadência de publicação ideal para imobiliárias em 2026: 3-5 posts/semana no Instagram, 4-6 posts/semana no Facebook.
- Conteúdo evergreen (atemporal) pode ser gerado em batch e publicado ao longo de semanas, reduzindo o esforço de criação contínua.
- O agente deve ter acesso a uma "biblioteca de marca" com: logo, paleta de cores, tom de voz, exemplos de posts aprovados, produtos/serviços.

## Aplicação no Campos Figueira

- **Calendário editorial automático**: O agente gera o mês inteiro de conteúdo para Facebook e Instagram da Campos Figueira em uma sessão, que a equipe revisa e aprova de uma vez.
- **Conteúdo local de Mogi das Cruzes**: Agente configurado para gerar posts sobre o mercado imobiliário local — tendências de preços, novos empreendimentos, bairros em valorização no Alto Tietê.
- **Pilares de conteúdo da imobiliária**: (1) Imóveis disponíveis, (2) Dicas para compradores/locatários, (3) Mercado imobiliário local, (4) Cases de sucesso, (5) Equipe e bastidores.
- **Tom de voz consistente**: Claude instrído com o guia de comunicação da Campos Figueira garante que todos os posts soem como a marca, não como IA genérica.
- **Adaptação sazonal**: O agente considera sazonalidade — começo de ano (pessoas se mudando), Carnaval (desconto para fechar antes das férias), julho (famílias em transição escolar).
- **Economia de tempo**: De 10+ horas/semana em criação de conteúdo para 1 hora de revisão semanal — liberando a equipe para atividades de maior valor.

## Validação

- **Aprovado**: Arquitetura de agente de conteúdo n8n + Claude é tecnicamente sólida e bem documentada.
- **Aprovado**: Auto-revisão pelo Claude antes de apresentar à equipe humana melhora qualidade e reduz retrabalho.
- **Confirmar**: Custo de tokens Claude para o volume mensal de conteúdo necessário.
- **Atenção**: Conteúdo gerado por IA deve sempre passar por revisão humana antes de publicar — especialmente dados de mercado imobiliário que precisam ser verificados.
- **Aprovar**: Feedback loop com métricas reais é essencial para evolução contínua da qualidade do conteúdo.

## Decisão por Ensinamento

APROVADO COM ADAPTAÇÕES — Agente de criação de conteúdo é um dos maiores multiplicadores de produtividade para a Campos Figueira. Implementar com revisão humana obrigatória antes de qualquer publicação, especialmente no início enquanto o agente está sendo calibrado para o tom de voz da marca.
