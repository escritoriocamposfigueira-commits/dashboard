# TROCA DE TOKEN — Passo a Passo Leigo

> Use este guia toda vez que trocar a senha do Facebook ou receber alerta de token vencendo.
> Tempo estimado: 10 minutos.

---

## Quando usar este guia

- Você trocou a senha do Facebook
- O robô parou de publicar
- Você recebeu alerta "token expirando em X dias"
- Erro no GitHub Actions: "OAuthException" ou "token expired"

---

## PASSO 1 — Verifique o App da Meta

1. Acesse **developers.facebook.com** (entre com sua conta do Facebook)
2. No canto superior direito: **"Meus Apps"**
3. Procure o app **"POST AUTOMATICO CLAUDE"**
   - ✅ Se existir → clique nele → vá ao Passo 2
   - ❌ Se não existir → crie um novo (veja abaixo)

### Se precisar criar o App do zero:
1. Clique em **"Criar App"**
2. Tipo: **"Outros"** → Próximo → **"Empresas"** → Próximo
3. Nome do app: `POST AUTOMATICO CLAUDE`
4. E-mail de contato: `escritoriocamposfigueira@gmail.com`
5. Clique em **"Criar App"**
6. Em **Configurações > Básico**: copie o **ID do Aplicativo** e a **Chave Secreta do Aplicativo**

---

## PASSO 2 — Copie o ID e a Chave Secreta

Em **Configurações > Básico** (dentro do app):
- **ID do Aplicativo**: algo como `123456789012345` → anote
- **Chave Secreta**: clique em "Mostrar" → anote

---

## PASSO 3 — Gere um Token Curto (dura 1 hora)

1. Acesse **developers.facebook.com/tools/explorer**
2. No canto superior direito, selecione o app **"POST AUTOMATICO CLAUDE"**
3. Clique em **"Gerar token de acesso"**
4. Uma janela vai abrir pedindo login no Facebook — entre com sua conta
5. Marque TODAS as permissões solicitadas, especialmente:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_content_publish`
6. Clique em **"Gerar"** e copie o token curto gerado

---

## PASSO 4 — Troque pelo Token Permanente (no PC)

Abra o **PowerShell** na pasta `C:\Users\Henrique\Documents\GitHub\dashboard` e rode:

```powershell
node trocar-token.js SEU_APP_ID SEU_APP_SECRET TOKEN_CURTO_GERADO
```

Exemplo:
```powershell
node trocar-token.js 123456789 abcdef1234567 EAABwzLixnjYBOxxxxxx
```

O script vai:
1. Trocar pelo token longo (60 dias)
2. Buscar o Page Token permanente da página "Escritório Campos Figueira"
3. Salvar automaticamente em `.env.local`
4. Mostrar "✅ Pronto!" ao final

---

## PASSO 5 — Atualize o GitHub Secret

O robô usa o token que está no GitHub. Você precisa atualizar:

1. Abra `C:\Users\Henrique\Documents\GitHub\dashboard\.env.local`
2. Copie o valor completo de `META_PAGE_TOKEN=...`
3. Acesse **github.com/escritoriocamposfigueira-commits/dashboard**
4. Clique em **Settings → Secrets and variables → Actions**
5. Clique em **`META_PAGE_TOKEN`** → **"Update secret"**
6. Cole o novo token → **"Update secret"**

---

## PASSO 6 — Teste se funcionou

No PowerShell:
```powershell
node scripts/verificar-token-diario.js
```

Se aparecer ✅, está pronto. Se aparecer ❌, refaça os passos 1-5.

---

## PASSO 7 — Reprocesse a fila parada (se necessário)

Se o robô ficou parado por mais de 1 dia, rode no PowerShell:
```powershell
node scripts/publicar-agora.js
```

Isso publica o próximo imóvel imediatamente sem esperar o cron das 09h/18h.

---

## Dicas importantes

- **NUNCA** troque a senha do Facebook sem logo em seguida renovar o token (siga este guia)
- O token page permanente **NÃO expira** por si só — ele só invalida quando você troca a senha
- Se o robô enviar alerta "token expirando", você ainda tem 7 dias para agir
- Guarde o APP_ID e APP_SECRET num lugar seguro (gerenciador de senhas)

---

## Contatos de suporte

- Problemas técnicos: verificar logs em **github.com/escritoriocamposfigueira-commits/dashboard → Actions**
- Cada publicação aparece como uma execução do workflow "Publicar imóveis"
