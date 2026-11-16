# Status automático do WhatsApp Business

O publicador usa o **WhatsApp Web oficial**, em um perfil local exclusivo do Chrome. Não envia mensagens privadas, não publica em grupos e não importa contatos.

## Ativação

```powershell
.\scripts\whatsapp-status-parear.ps1
.\scripts\whatsapp-status-testar.ps1
.\scripts\whatsapp-status-agendar.ps1
.\scripts\energia-publicacao-agendar.ps1
```

O primeiro comando abre o Chrome oficial para escanear o QR uma única vez. Depois, a tarefa agendada verifica a fila a cada 2 minutos e publica apenas os vídeos novos que já passaram pelo robô. A tarefa também inicia no logon, volta após suspensão e tenta novamente quando houver falha temporária.

Os vídeos são publicados no Status com legenda e, em seguida, enviados em conversa privada para **Renan Silva** e **Henrique Figueira**, com a mesma descrição, para facilitar o repasse. O WhatsApp Web não oferece menção privada no editor de Status; digitar `@` seria apenas texto e não liberaria o botão de republicar.

## Energia no fim de semana

- sexta-feira, às 20:00, o computador entra em suspensão quando ficar ocioso;
- sábado e domingo, acorda às 11:50, permanece ativo até 13:00 e volta a suspender;
- sábado e domingo, acorda às 17:20, permanece ativo até 20:00 e volta a suspender;
- se alguém estiver usando o computador, a suspensão é adiada e depois cancelada com segurança ao atingir o limite;
- o computador deve permanecer na tomada, conectado à internet e sem ser desligado pelo menu do Windows.

## Proteções

- publicações anteriores à ativação não são repetidas;
- cada publicação ganha uma chave local de deduplicação;
- uma trava impede duas execuções simultâneas;
- o vídeo e a legenda são validados antes do upload;
- falhas geram log e captura de tela em `output/whatsapp-status/`;
- a fila é lida do estado confirmado no GitHub sem alterar o restante do projeto local;
- o log é limitado e rotacionado automaticamente;
- a sessão do navegador fica apenas em `controle/whatsapp-status-web-profile/`, fora do Git.

## Diagnóstico

```powershell
node .\scripts\whatsapp-status-web.js audit
.\scripts\whatsapp-status-sincronizar.ps1 -DryRun -SemAtualizarRepositorio
```

O WhatsApp não oferece API oficial para Status. Esta solução automatiza a interface oficial do WhatsApp Web e, por isso, depende do computador ligado, do Chrome instalado e da sessão continuar autorizada. Se o computador estiver desligado, a fila permanece no GitHub e é processada depois que o Windows voltar e o usuário entrar. Nenhum programa consegue executar localmente com o computador desligado.
