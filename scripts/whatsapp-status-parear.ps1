[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$TaskName = "Campos Figueira - Status WhatsApp"
Set-Location -LiteralPath $RepoRoot

Write-Host "Abrindo o WhatsApp Web oficial em um perfil exclusivo..." -ForegroundColor Cyan
node .\scripts\whatsapp-status-web.js pair
if ($LASTEXITCODE -ne 0) { throw "O pareamento oficial não foi concluído." }
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Enable-ScheduledTask -TaskName $TaskName | Out-Null
  Start-ScheduledTask -TaskName $TaskName
}
Write-Host "Pareamento oficial concluído. A sessão ficou somente neste computador." -ForegroundColor Green
