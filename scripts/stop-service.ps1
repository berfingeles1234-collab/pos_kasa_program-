# POS Backend — Windows Service durdur
# Çalıştırma: PowerShell Yönetici olarak

. "$PSScriptRoot\service-common.ps1"

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host "Servis bulunamadı: $ServiceName" -ForegroundColor Yellow
    exit 0
}

if ($existing.Status -eq 'Stopped') {
    Write-Host "Servis zaten durmuş: $ServiceName" -ForegroundColor Yellow
    exit 0
}

Stop-Service -Name $ServiceName -Force
Write-Host "Servis durduruldu: $ServiceName" -ForegroundColor Green
