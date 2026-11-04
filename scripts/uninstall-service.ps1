# POS Backend — Windows Service kaldırma
# Çalıştırma: PowerShell Yönetici olarak

. "$PSScriptRoot\service-common.ps1"

$nssm = Get-NssmPath
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $existing) {
    Write-Host "Kayıtlı servis bulunamadı: $ServiceName" -ForegroundColor Yellow
    exit 0
}

if ($existing.Status -eq 'Running') {
    Stop-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 2
}

if ($nssm) {
    & $nssm remove $ServiceName confirm
} else {
    sc.exe delete $ServiceName | Out-Null
}

Write-Host "Servis kaldırıldı: $ServiceName" -ForegroundColor Green
