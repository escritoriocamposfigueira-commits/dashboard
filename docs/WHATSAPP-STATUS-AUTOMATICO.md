# Status automático do WhatsApp Business

O publicador usa o **WhatsApp Web oficial**, em um perfil local exclusivo do Chrome. Não publica em grupos nem importa contatos. As únicas cópias privadas vão para os dois contatos internos autorizados.

## Ativação

```powershell
.\scripts\whatsapp-status-parear.ps1
.\scripts\whatsapp-status-testar.ps1
.\scripts\whatsapp-status-agendar.ps1
.\scripts\energia-publicacao-agendar.ps1
```

O primeiro comando abre o Chrome oficial para escanear o QR quando for necessário vincular a sessão. Depois a tarefa roda sem janela de navegador, às **12h30 e 16h30** (Brasília), e publica somente MP4 aprovados já confirmados em uma das redes. Não há disparo a cada dois minutos nem no logon.

O Status é publicado com legenda antes de qualquer cópia em conversa privada. As cópias seguem para **Renan Silva** e **Henrique Figueira**. Se um contato não estiver disponível, a cópia fica pendente para o próximo horário, sem impedir os Status. A cópia privada não equivale a uma menção no Status.

## Energia no fim de semana

- sexta-feira, às 20:00, o computador entra em suspensão quando ficar ocioso;
- sábado e domingo, acorda às 11:50, permanece ativo até 13:00 e volta a suspender;
- sábado e domingo, acorda às 15:50, permanece ativo até 17:00 e volta a suspender;
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

Não há endpoint documentado na API oficial da Meta para publicar Status orgânico. Esta solução automatiza a interface do WhatsApp Web e depende do computador acordado em um horário agendado, da internet, do Chrome e da sessão vinculada. Se o computador estiver desligado, a fila permanece no GitHub até o próximo horário em que o Windows e a sessão estiverem disponíveis.
