# Como cadastrar um novo imóvel

O gerador cria automaticamente as duas artes usadas pelo robô:

- Feed 4:5: 1080 × 1350 px
- Story/Reel 9:16: 1080 × 1920 px

A versão de story mantém as informações essenciais entre 250 px do topo e 420 px
da base, evitando que os botões do Instagram e Facebook cubram preço, local ou
código.

## 1. Preparar os dados

Copie `modelos/novo-imovel.exemplo.json`, troque os dados e indique de uma a três
fotos. As fotos podem ser arquivos do computador ou URLs `https://`.

Campos:

- `codigo`: código sem o prefixo CF.
- `finalidade`: VENDA ou LOCAÇÃO.
- `tipo`, `bairro`, `cidade` e `valor`: aparecem nas artes.
- `chamada`: primeira frase da legenda automática.
- `detalhes`: até quatro destaques curtos.
- `fotos`: uma a três fotos para a arte; URLs públicas também entram no carrossel.
- `caption` (opcional): legenda completa. Sem esse campo, o gerador cria uma.

## 2. Gerar uma prévia

```powershell
npm run arte:imovel -- --config "C:\caminho\imovel-999.json"
```

A prévia fica em `arte-gerada/999/`. Confira preço, ortografia e fotos.

## 3. Cadastrar na fila

Depois de aprovar:

```powershell
npm run arte:imovel -- --config "C:\caminho\imovel-999.json" --registrar
```

O comando:

1. gera `public/anuncios-feed/CF - 999.png`;
2. gera `public/anuncios/CF - 999.png`;
3. adiciona o código a `src/content/imagens-urls.json`;
4. cria a legenda em `src/content/captions-imoveis.json`;
5. adiciona URLs de fotos a `src/content/fotos-imoveis.json`, quando houver.

O cadastro entra no fim da fila. Ele não altera o histórico nem antecipa uma
publicação.

## Atualizar um imóvel existente

Para evitar sobrescrita acidental, códigos existentes são recusados. Se a
atualização for intencional, acrescente `--substituir`:

```powershell
npm run arte:imovel -- --config "C:\caminho\imovel-999.json" --registrar --substituir
```

## Segurança e limites

- O gerador não lê nem grava tokens.
- Ele não faz login e não publica sozinho; apenas prepara e cadastra as peças.
- Cada foto pode ter até 20 MB.
- O código verifica automaticamente formato PNG e as dimensões finais.
- Revise a arte antes de enviar ao GitHub.
