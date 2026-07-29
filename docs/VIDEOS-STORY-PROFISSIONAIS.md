# Vídeos profissionais para Stories

## O que permanece igual

- As artes originais nunca são modificadas.
- O Feed usa a imagem 4:5.
- Stories, Reels e Shorts usam a arte vertical 9:16.
- A fila e os horários de publicação continuam sob controle do `publicar-servidor.js`.
- O TikTok permanece pausado enquanto `TIKTOK_ENABLED` não for `true`.

## O que mudou

O Story deixou de ser apenas uma imagem com zoom contínuo. Agora o robô:

1. baixa a arte 9:16 correspondente;
2. escolhe uma das 56 músicas aprovadas;
3. escolhe um modelo visual sem repetir o último modelo;
4. monta um MP4 de 15 segundos em 1080×1920;
5. incorpora a música no próprio vídeo;
6. publica o mesmo arquivo no Facebook Story, Instagram Story e canais de vídeo habilitados.

## Modelos em rotação

- Topo cinematográfico
- Cascata
- Iluminação dourada
- Foco central
- Laterais alternadas
- Subida cinematográfica

O rodapé e o endereço do site aparecem sempre por último. Nenhum modelo abre pelo site.

No modelo de iluminação, o realce temporário usa o dourado `#D9AA4A`, compatível com a identidade preta e dourada. O brilho desaparece antes do quadro final, que recompõe exatamente a arte original.

## Biblioteca local

As versões para conferência ficam em:

`D:\01 - ESCRITÓRIO IMOBILIÁRIO\04- REDE SOCIAL\IMAGENS ANUNCIOS\VÍDEOS ANIMADOS 9.16`

Estrutura:

- `PRONTOS`: vídeos MP4;
- `PRÉVIAS DOS MODELOS`: quadros de conferência dos seis modelos;
- `manifesto-videos.json`: origem, vídeo, música, licença e modelo de cada item;
- `relatorio-validacao.json`: codec, duração, áudio, resolução e preservação do quadro final;
- `LEIA-ME.txt`: resumo para consulta fora do projeto.

Essa pasta não publica nada automaticamente. Ela é um arquivo local para auditoria e aprovação. O robô usa o mesmo motor de animação na execução agendada.

## Comandos

```powershell
node scripts/gerar-biblioteca-videos-story.js
node scripts/gerar-biblioteca-videos-story.js --consolidar
node scripts/validar-biblioteca-videos-story.js
node --test tests/video-story-profissional.test.js tests/trilhas.test.js
```
