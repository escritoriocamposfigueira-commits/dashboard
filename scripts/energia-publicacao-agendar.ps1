[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$EnergyScript = Join-Path $RepoRoot "scripts\energia-publicacao.ps1"
$PowerShell = "powershell.exe"
$BaseArguments = "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$EnergyScript`""

function Install-EnergyTask {
  param(
    [string]$Name,
    [string[]]$Days,
    [string]$At,
    [int]$KeepAwake,
    [int]$WaitIdle
  )
  $Action = New-ScheduledTaskAction -Execute $PowerShell -Argument "$BaseArguments -ManterAcordadoMinutos $KeepAwake -AguardarOciosidadeMinutos $WaitIdle -OciosidadeMinutos 10"
  $Trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 1 -DaysOfWeek $Days -At $At
  $Settings = New-ScheduledTaskSettingsSet -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 5) -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $Name -Action $Action -Trigger $Trigger -Settings $Settings -Description "Gerencia a janela de energia para publicacoes automaticas." -Force | Out-Null
}

Install-EnergyTask -Name "Campos Figueira - Sexta suspender" -Days Friday -At "20:00" -KeepAwake 0 -WaitIdle 240
Install-EnergyTask -Name "Campos Figueira - Fim de semana meio-dia" -Days Saturday,Sunday -At "11:50" -KeepAwake 70 -WaitIdle 120
Install-EnergyTask -Name "Campos Figueira - Fim de semana tarde" -Days Saturday,Sunday -At "17:20" -KeepAwake 160 -WaitIdle 120

Write-Host "Energia automatica instalada: sexta 20:00; sabado e domingo 11:50 e 17:20." -ForegroundColor Green
