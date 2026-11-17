[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$SyncScript = Join-Path $RepoRoot "scripts\whatsapp-status-sincronizar.ps1"
$TaskName = "Campos Figueira - Status WhatsApp"

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$SyncScript`""
$TriggerMeioDia = New-ScheduledTaskTrigger -Daily -At "12:30"
$TriggerTarde = New-ScheduledTaskTrigger -Daily -At "16:30"
$Settings = New-ScheduledTaskSettingsSet -WakeToRun -RunOnlyIfNetworkAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger @($TriggerMeioDia, $TriggerTarde) -Settings $Settings -Description "Publica no Status pessoal do WhatsApp às 12:30 e 16:30, após as publicações do robô." -Force | Out-Null
Write-Host "Agendamento instalado: diariamente às 12:30 e 16:30, sem disparo no logon." -ForegroundColor Green
