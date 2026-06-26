# GUIA-LOCAL — Instruções para o Claude Code rodando no PC do Henrique

> Este arquivo é para a instância do **Claude Code local** (no PC do Henrique,
> com acesso ao `D:\`). O Henrique vai dizer: *"siga o GUIA-LOCAL"*.
> Leia tudo antes de começar e execute na ordem.

## Contexto

Escritório Campos Figueira (imobiliária + engenharia, Mogi das Cruzes/SP).
Existe um **servidor 24h** (GitHub Actions) que publica os imóveis sozinho em
Facebook Feed, Facebook Story, Instagram Feed e Instagram Story — 2 imóveis/dia.

O servidor lê dois arquivos:
- `src/content/captions-imoveis.json` → a copy (texto) de cada imóvel
- `src/content/imagens-urls.json` → as URLs públicas das imagens (gerado pelo `PREPARAR-SERVIDOR.js`)

As imagens dos anúncios estão em:
```
D:\01 - ESCRITÓRIO IMOBILIÁRIO\04- REDE SOCIAL\IMAGENS ANUNCIOS
```
Cada arquivo é nomeado `CF - <CODIGO>.png` (ex: `CF - 493.png`, `CF - 001.png`).

## Sua tarefa principal: ler as imagens e escrever copy PRECISA

A instância na nuvem **não conseguiu ler as imagens** (sem acesso ao `D:\`),
então escreveu as captions a partir dos códigos + dados antigos da conversa.
Algumas estão genéricas. **Você tem acesso às imagens — use isso.**

Para **cada imagem** na pasta:
1. **Abra e leia a imagem** (Read) — extraia os dados reais: tipo de imóvel,
   finalidade (venda/locação), valor, bairro/cidade, nº de dormitórios/suítes,
   diferenciais (garagem, churrasqueira, piscina, financiamento, etc.).
2. Extraia o **código** do nome do arquivo (`CF - 493.png` → `493`;
   `CF - CASA INDAIA BERTIOGA.png` → `CASA INDAIA BERTIOGA`).
3. **Escreva/atualize a caption** desse código em `src/content/captions-imoveis.json`
   no formato e estilo abaixo. **NÃO invente dados** que não estejam na imagem.

## Estilo da copy (persuasão: sonho, dor, emoção)

- Comece com um **gancho forte** (1–3 linhas) que mexa com sonho da casa própria,
  dor do aluguel, medo de perder a oportunidade, ou emoção da família.
- Liste os diferenciais com ✅.
- Use o valor e bairro **reais da imagem**.
- Varie os ganchos entre imóveis (não repita a mesma frase).
- Tom: humano, brasileiro, vendedor experiente — sem clichê exagerado.

## Rodapé OBRIGATÓRIO (idêntico em todos, troque só a PALAVRA-CHAVE)

```
👇 Manda "PALAVRA" no WhatsApp agora:
📲 https://bit.ly/3aYmFrH

Conheça nossas redes sociais!
📃 escritoriocamposfigueira@gmail.com
📲 instagram.com/escritorio.figueira
📲 instagram.com/henriquefigueiraoficial
📮 facebook.com/Escritorio.figueira
✅ escritoriocamposfigueira.com.br
⏰ Seg a Sex · 10h às 18h
CRECI: 043649-J
```

A `PALAVRA` é uma palavra-chave do imóvel (o bairro, o código, ou um destaque).

## Formato do JSON

`src/content/captions-imoveis.json` é um array de objetos:
```json
[
  { "codigo_imovel": "493", "arquivo": "CF - 493.png", "caption": "TEXTO COMPLETO COM RODAPÉ" }
]
```
Cada caption deve ter no máximo ~300 palavras. Mantenha um item por código.

## Depois de atualizar as captions

1. Suba/atualize as imagens no host público e gere o manifesto:
   ```
   node PREPARAR-SERVIDOR.js
   ```
   (Ele é incremental: sobe só imagens novas, mantém a ordem da fila, e dá push.)

2. Faça commit e push das captions atualizadas:
   ```
   git add src/content/captions-imoveis.json
   git commit -m "captions revisadas com dados reais das imagens"
   git push origin claude/campos-figueira-growth-qmjsux
   ```

Pronto — o servidor 24h passa a usar a copy precisa automaticamente.

## Para ADICIONAR um imóvel novo no futuro

1. Henrique coloca a imagem nova na pasta (`CF - <CODIGO>.png`).
2. Você lê a imagem, escreve a caption e adiciona ao JSON.
3. `node PREPARAR-SERVIDOR.js` (sobe só a nova, vai pro fim da fila) + push.

## Não faça

- Não invente valores, bairros ou características que não estão na imagem.
- Não altere o rodapé (links, CRECI, horário).
- Não reordene a fila já publicada (o `PREPARAR-SERVIDOR.js` cuida disso).
- Nunca exponha tokens/senhas em arquivos versionados.
