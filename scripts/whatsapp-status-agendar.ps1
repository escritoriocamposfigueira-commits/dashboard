[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$SyncScript = Join-Path $RepoRoot "scripts\whatsapp-status-sincronizar.ps1"
$TaskName = "Campos Figueira - Status WhatsApp"

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$SyncScript`""
$TriggerContinuo = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 2)
$TriggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger @($TriggerContinuo, $TriggerLogon) -Settings $Settings -Description "Publica no Status pessoal do WhatsApp os novos vídeos já aprovados pelo robô." -Force | Out-Null
Write-Host "Agendamento instalado: a cada 2 minutos e ao entrar no Windows." -ForegroundColor Green
