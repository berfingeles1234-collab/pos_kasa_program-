# Master installer - health kontrolu
param(
    [Parameter(Mandatory = $true)][string]$InstallRoot,
    [string]$PgPassword = ''
)

. "$PSScriptRoot\common.ps1" -InstallRoot $InstallRoot

Write-Step 'Sistem saglik kontrolu yapiliyor...'

$maxRetries = 15
$health = @{ Ok = $false }

for ($i = 1; $i -le $maxRetries; $i++) {
    $health = Test-HealthApi -Port $ApiPort -TimeoutSec 4
    if ($health.Ok) { break }
    Write-Host "  Bekleniyor... ($i/$maxRetries)" -ForegroundColor DarkGray
    Start-Sleep -Seconds 2
}

if (-not $health.Ok) {
    Write-Fail 'Backend saglik kontrolu basarisiz.'
    Write-Host "URL: $($health.Url)" -ForegroundColor DarkGray
    Write-Host 'Log: ' (Join-Path $LogsDir 'service-error.log') -ForegroundColor DarkGray
    exit 1
}

Write-Ok 'API ve veritabani baglantisi saglikli'
Write-Ok "Health: $($health.Url)"
Write-Host ''
Write-Host 'Kurulum basariyla tamamlandi.' -ForegroundColor Green
Write-Host 'POS Kasa Sistemi aciliyor...' -ForegroundColor Green

exit 0
