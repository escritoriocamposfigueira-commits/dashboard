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

function Invoke-NativeCaptured {
  param([string]$Executable, [string[]]$Parameters)
  # Windows PowerShell 5.1 raises NativeCommandError for redirected stderr.
  # Capture it as data here and let the caller handle the real exit code.
  $ErrorActionPreference = "Continue"
  $OutputLines = & $Executable @Parameters 2>&1
  $ExitCode = $LASTEXITCODE
  [pscustomobject]@{ Lines = @($OutputLines | ForEach-Object { "$_" }); ExitCode = $ExitCode }
}

Write-StatusLog "INICIO: sincronizacao do Status do WhatsApp."

if (-not $SemAtualizarRepositorio) {
  $Fetch = Invoke-NativeCaptured -Executable git -Parameters @("fetch", "--quiet", "origin")
  foreach ($Line in $Fetch.Lines) { Write-StatusLog "GIT: $Line" }
  if ($Fetch.ExitCode -eq 0) {
    $Head = Invoke-NativeCaptured -Executable git -Parameters @("symbolic-ref", "--short", "refs/remotes/origin/HEAD")
    $RemoteHead = if ($Head.ExitCode -eq 0) { $Head.Lines | Select-Object -First 1 } else { $null }
    if (-not $RemoteHead) { $RemoteHead = "origin/claude/campos-figueira-growth-qmjsux" }
    $RemoteState = Invoke-NativeCaptured -Executable git -Parameters @("show", "${RemoteHead}:controle/estado-publicacao.json")
    if ($RemoteState.ExitCode -eq 0) {
      [System.IO.File]::WriteAllText($RemoteStatePath, (($RemoteState.Lines -join "`n") + "`n"), $Utf8SemBom)
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
  $Execution = Invoke-NativeCaptured -Executable node -Parameters $Arguments
  foreach ($Line in $Execution.Lines) { if ($Line) { Write-StatusLog "$Line" } }
  if ($Execution.ExitCode -eq 0) {
    Write-StatusLog "SUCESSO: sincronizacao concluida."
    exit 0
  }
  if ($Tentativa -lt $Tentativas) { Start-Sleep -Seconds (10 * $Tentativa) }
}

Write-StatusLog "ERRO: sincronizacao falhou apos $Tentativas tentativas."
throw "Falha na sincronizacao do Status do WhatsApp. Consulte $LogPath"
