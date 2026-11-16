[CmdletBinding()]
param(
  [string]$Video = "public\videos-remotion-imoveis-v2-narrados\CF-620-LOCACAO-NARRADO.mp4",
  [string]$Legenda = "Sobrado em condomínio para locação no Mogi Moderno. Piscinas adulto e infantil, área gourmet e segurança para a família.`n`n📲 Chame no WhatsApp: (11) 2378-5643`nInforme: CF-620"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$AbsoluteVideo = Join-Path $RepoRoot $Video

if (-not (Test-Path -LiteralPath $AbsoluteVideo)) { throw "Vídeo não encontrado: $AbsoluteVideo" }
Set-Location -LiteralPath $RepoRoot
node .\scripts\whatsapp-status-web.js post --video $Video --caption $Legenda
if ($LASTEXITCODE -ne 0) { throw "O Status de teste não foi publicado." }
