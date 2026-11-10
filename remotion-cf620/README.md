# Template imobiliário vertical — Campos Figueira

Template editável e reutilizável em Remotion para vídeos de imóveis com fotografias reais. O primeiro pacote produzido é o CF-620, em duas direções de ritmo:

- `CF620-Premium-A`: cinematográfico, elegante e com transições mais suaves.
- `CF620-Dynamic-B`: cortes mais rápidos para Reels, TikTok e Shorts.
- `CF620-Cover`: capa vertical estática.

## Visualizar e editar

```powershell
npm install
npm run dev
```

Os dados comerciais, fotografias, textos e trilha ficam centralizados em `src/Root.tsx`. Para gerar outro imóvel, duplique os `defaultProps`, coloque as fotos em `public/properties/<CODIGO>/` e registre novas composições.

## Renderizar

```powershell
npx remotion render src/index.ts CF620-Premium-A ..\public\videos-remotion-cf620\CF-620-PREMIUM-A.mp4 --codec=h264 --crf=18 --audio-bitrate=192k
npx remotion render src/index.ts CF620-Dynamic-B ..\public\videos-remotion-cf620\CF-620-DYNAMIC-B.mp4 --codec=h264 --crf=18 --audio-bitrate=192k
npx remotion still src/index.ts CF620-Cover ..\public\videos-remotion-cf620\CF-620-CAPA-REELS.png
```

## Regras preservadas

- Formato 9:16, 1080×1920, 30 fps e 20 segundos.
- Somente fotos reais do imóvel, obtidas da base oficial do site.
- Informações do CF-620: locação por R$ 2.600/mês, Mogi Moderno, 3 dormitórios, 1 suíte e 2 vagas.
- CTA com WhatsApp específico, link do imóvel e CRECI-PJ 043649-J.
- Trilha do catálogo Mixkit já aprovado no projeto; não há áudio copiado do modelo do CapCut.

Antes de renderizar, execute `npm run lint`.
