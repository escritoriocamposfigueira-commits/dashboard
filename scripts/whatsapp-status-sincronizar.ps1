[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$SemAtualizarRepositorio,
  [int]$Tentativas = 3
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $RepoRoot "logs"
$LogPath = Join-Path $LogDir "whatsapp-status.log"
$RemoteStatePath = Join-Path $RepoRoot "controle\whatsapp-status-publicacao-remota.json"

Set-Location -LiteralPath $RepoRoot
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if ((Test-Path -LiteralPath $LogPath) -and (Get-Item -LiteralPath $LogPath).Length -gt 5MB) {
  Move-Item -Force -LiteralPath $LogPath -Destination "$LogPath.1"
}

$Utf8SemBom = New-Object System.Text.UTF8Encoding($false)
# Windows PowerShell uses the console code page to decode native stdout.
# Git stores the JSON in UTF-8, including the success marker used by the queue.
[Console]::OutputEncoding = $Utf8SemBom

function Write-StatusLog {
  param([Parameter(Mandatory = $true)][string]$Message)
  $Line = "$(Get-Date -Format s) $Message"
  Write-Host $Line
  [System.IO.File]::AppendAllText($LogPath, "$Line`r`n", $Utf8SemBom)
}

Write-StatusLog "INICIO: sincronizacao do Status do WhatsApp."

if (-not $SemAtualizarRepositorio) {
  $FetchOutput = & git fetch --quiet origin 2>&1
  $FetchExitCode = $LASTEXITCODE
  foreach ($Line in $FetchOutput) { Write-StatusLog "GIT: $Line" }
  if ($FetchExitCode -eq 0) {
    $RemoteHead = (& git symbolic-ref --short refs/remotes/origin/HEAD 2>$null)
    if (-not $RemoteHead) { $RemoteHead = "origin/claude/campos-figueira-growth-qmjsux" }
    $RemoteState = & git show "${RemoteHead}:controle/estado-publicacao.json" 2>&1
    if ($LASTEXITCODE -eq 0) {
      [System.IO.File]::WriteAllText($RemoteStatePath, (($RemoteState -join "`n") + "`n"), $Utf8SemBom)
    } else {
      Write-StatusLog "AVISO: estado remoto indisponivel; usando o estado local."
    }
  } else {
    Write-StatusLog "AVISO: GitHub indisponivel; usando o estado local."
  }
}
if (Test-Path -LiteralPath $RemoteStatePath) {
  $env:WHATSAPP_PUBLICATION_STATE = $RemoteStatePath
}

$Arguments = @(".\scripts\whatsapp-status-web.js", "sync")
if ($DryRun) { $Arguments += "--dry-run" }
for ($Tentativa = 1; $Tentativa -le [Math]::Max(1, $Tentativas); $Tentativa++) {
  Write-StatusLog "TENTATIVA: $Tentativa/$Tentativas"
  $NodeOutput = & node @Arguments 2>&1
  $NodeExitCode = $LASTEXITCODE
  foreach ($Line in $NodeOutput) { Write-StatusLog "$Line" }
  if ($NodeExitCode -eq 0) {
    Write-StatusLog "SUCESSO: sincronizacao concluida."
    exit 0
  }
  if ($Tentativa -lt $Tentativas) { Start-Sleep -Seconds (10 * $Tentativa) }
}

Write-StatusLog "ERRO: sincronizacao falhou apos $Tentativas tentativas."
throw "Falha na sincronizacao do Status do WhatsApp. Consulte $LogPath"
