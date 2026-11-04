# POS Backend — Windows Service başlat
# Çalıştırma: PowerShell Yönetici olarak

. "$PSScriptRoot\service-common.ps1"

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host "Servis bulunamadı: $ServiceName" -ForegroundColor Red
    Write-Host 'Önce kurun: ..\scripts\install-service.ps1'
    exit 1
}

if ($existing.Status -eq 'Running') {
    Write-Host "Servis zaten çalışıyor: $ServiceName" -ForegroundColor Green
    exit 0
}

Start-Service -Name $ServiceName
Write-Host "Servis başlatıldı: $ServiceName" -ForegroundColor Green
Write-Host 'Kontrol: http://localhost:4001/api/v1/health'
