# Critérios musicais da biblioteca

## Objetivo

Sustentar a atenção e a emoção do anúncio sem competir com a leitura. Não existe
base séria para prometer que uma trilha específica “libera um hormônio” e converte
uma venda. A música pode alterar percepção, excitação e lembrança, mas o efeito
depende da pessoa, do contexto e da compatibilidade entre som, imagem e mensagem.

## Decisões aplicadas

- 60 instrumentais originais, sem voz, samples ou gravações de terceiros.
- Ataque musical curto para o vídeo não começar “vazio”.
- Volume final normalizado em aproximadamente -23 LUFS no vídeo.
- Fade-out de dois segundos para evitar corte abrupto.
- Andamentos moderados, entre 84 e 116 BPM.
- Harmonia estável e baixa dissonância para preservar a leitura do anúncio.
- Seis famílias com dez variações:
  - `premium`: sofisticação, patrimônio e segurança;
  - `lar`: acolhimento, família e mudança de vida;
  - `conquista`: realização e decisão positiva;
  - `engenharia`: precisão, projeto e confiança técnica;
  - `oportunidade`: atenção e urgência controlada;
  - `investimento`: firmeza, análise e patrimônio.
- A rotação usa as 60 faixas antes de repetir uma delas.
- Uma nova publicação do imóvel em outra data gera outro arquivo e outra trilha.
- Uma repetição técnica da mesma publicação reutiliza o mesmo arquivo, evitando
  duplicidade ou mudança de áudio durante uma recuperação.

## Integridade e origem

O arquivo `CERTIFICADO-ORIGEM.md` registra o SHA-256 de cada MP3. O catálogo ativo
também registra parâmetros, versão do gerador e declaração de ausência de material
de terceiros. Os MP3 antigos permanecem no repositório apenas para preservar o
histórico, mas não são selecionados pelo robô.

## Referências usadas no critério

- Kellaris, Cox e Cox, *The Effect of Background Music on Ad Processing*:
  https://doi.org/10.1177/002224299305700409
- Song et al., estudo com movimentos oculares sobre música e compreensão:
  https://doi.org/10.3389/fpsyg.2023.1140959
- YouTube, orientação para música segura:
  https://support.google.com/youtube/answer/15577610
- Meta, Sound Collection para uso comercial:
  https://www.facebook.com/help/instagram/402084904469945
