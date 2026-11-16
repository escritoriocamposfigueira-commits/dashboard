[CmdletBinding()]
param(
  [int]$ManterAcordadoMinutos = 0,
  [int]$AguardarOciosidadeMinutos = 120,
  [int]$OciosidadeMinutos = 10,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $RepoRoot "logs"
$LogPath = Join-Path $LogDir "energia-publicacao.log"
$SyncTask = "Campos Figueira - Status WhatsApp"
$Utf8SemBom = New-Object System.Text.UTF8Encoding($false)
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-EnergyLog {
  param([Parameter(Mandatory = $true)][string]$Message)
  $Line = "$(Get-Date -Format s) $Message"
  [System.IO.File]::AppendAllText($LogPath, "$Line`r`n", $Utf8SemBom)
}

if (-not ("EnergyPublication.Native" -as [type])) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
namespace EnergyPublication {
  public static class Native {
    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
    [DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);
    [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO info);
    [DllImport("powrprof.dll", SetLastError=true)] public static extern bool SetSuspendState(bool hibernate, bool forceCritical, bool disableWakeEvent);
  }
}
"@
}

function Get-IdleSeconds {
  $Info = New-Object EnergyPublication.Native+LASTINPUTINFO
  $Info.cbSize = [Runtime.InteropServices.Marshal]::SizeOf($Info)
  if (-not [EnergyPublication.Native]::GetLastInputInfo([ref]$Info)) { return 0 }
  $Elapsed = [Environment]::TickCount64 - [uint64]$Info.dwTime
  return [Math]::Max(0, [Math]::Floor($Elapsed / 1000))
}

$EsContinuous = 0x80000000
$EsSystemRequired = 0x00000001
$KeepUntil = (Get-Date).AddMinutes([Math]::Max(0, $ManterAcordadoMinutos))
$Deadline = $KeepUntil.AddMinutes([Math]::Max(1, $AguardarOciosidadeMinutos))

if ($DryRun) {
  Write-EnergyLog "DRY-RUN: manter $ManterAcordadoMinutos min; aguardar ociosidade $AguardarOciosidadeMinutos min; limite ocioso $OciosidadeMinutos min."
  exit 0
}

try {
  [void][EnergyPublication.Native]::SetThreadExecutionState($EsContinuous -bor $EsSystemRequired)
  Write-EnergyLog "JANELA INICIADA: acordado por $ManterAcordadoMinutos minutos."
  Start-ScheduledTask -TaskName $SyncTask -ErrorAction SilentlyContinue

  while ((Get-Date) -lt $KeepUntil) {
    Start-Sleep -Seconds 30
  }

  while ((Get-Date) -lt $Deadline) {
    $IdleSeconds = Get-IdleSeconds
    if ($IdleSeconds -ge ($OciosidadeMinutos * 60)) {
      Write-EnergyLog "SUSPENDENDO: computador ocioso por $([Math]::Floor($IdleSeconds / 60)) minutos."
      [void][EnergyPublication.Native]::SetThreadExecutionState($EsContinuous)
      [void][EnergyPublication.Native]::SetSuspendState($false, $false, $false)
      exit 0
    }
    Start-Sleep -Seconds 60
  }

  Write-EnergyLog "SUSPENSAO CANCELADA: houve uso do computador ate o fim da janela."
} catch {
  Write-EnergyLog "ERRO: $($_.Exception.Message)"
  throw
} finally {
  [void][EnergyPublication.Native]::SetThreadExecutionState($EsContinuous)
}
