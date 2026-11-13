$token = [Environment]::GetEnvironmentVariable("CAPTADOR_INTERNAL_TOKEN", "User")
if ([string]::IsNullOrWhiteSpace($token)) {
  throw "Token local do CRM não encontrado. Execute novamente a implantação segura do captador."
}
$token | Set-Clipboard
Write-Host "Token do CRM copiado para a área de transferência. Cole no botão 'Token' do painel."
