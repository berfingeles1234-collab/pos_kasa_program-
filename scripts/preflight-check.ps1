# POS Kasa - Kurulum on kontrol (preflight)
# Çalıştırma (proje kökünden):
#   npm run preflight
# veya:
#   powershell -ExecutionPolicy Bypass -File scripts/preflight-check.ps1

. "$PSScriptRoot\service-common.ps1"

$failCount = 0
$warnCount = 0

function Add-CheckResult {
    param(
        [bool]$Ok,
        [string]$Message,
        [string]$Detail = $null,
        [switch]$Warning
    )

    Write-CheckLine -Ok $Ok -Message $Message -Detail $Detail

    if (-not $Ok -and -not $Warning) {
        $script:failCount++
    } elseif (-not $Ok -and $Warning) {
        $script:warnCount++
    }
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' POS Kasa - Kurulum On Kontrol (Preflight)' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Node.js
try {
    $nodePath = Get-NodePath
    $nodeVersion = & node -v 2>$null
    Add-CheckResult -Ok $true -Message "Node.js bulundu ($nodeVersion)" -Detail $nodePath
} catch {
    Add-CheckResult -Ok $false -Message 'Node.js bulunamadi' -Detail 'https://nodejs.org/ - Node.js 20 LTS kurun'
}

# npm
$npmPath = Get-NpmPath
if ($npmPath) {
    $npmVersion = & npm -v 2>$null
    Add-CheckResult -Ok $true -Message "npm bulundu ($npmVersion)" -Detail $npmPath
} else {
    Add-CheckResult -Ok $false -Message 'npm bulunamadı' -Detail 'Node.js kurulumu ile birlikte gelmelidir'
}

# Backend klasörü
$BackendDir = $null
try {
    $BackendDir = Get-BackendDir
    Add-CheckResult -Ok $true -Message 'Backend klasörü bulundu' -Detail $BackendDir
} catch {
    Add-CheckResult -Ok $false -Message 'Backend klasörü bulunamadı' -Detail $_.Exception.Message
}

if (-not $BackendDir) {
    Write-Host ''
    Write-Host "Sonuc: $failCount hata - kuruluma devam edilemez." -ForegroundColor Red
    exit 1
}

$envSettings = Import-BackendEnvFile -BackendDir $BackendDir

# .env
$envFile = Join-Path $BackendDir '.env'
if (Test-Path $envFile) {
    Add-CheckResult -Ok $true -Message 'backend/.env bulundu' -Detail $envFile
} else {
    Add-CheckResult -Ok $false -Message 'backend/.env bulunamadı' -Detail 'copy .env.example .env ve düzenleyin'
}

# node_modules
$nodeModules = Join-Path $BackendDir 'node_modules'
if (Test-Path $nodeModules) {
    Add-CheckResult -Ok $true -Message 'backend/node_modules bulundu'
} else {
    Add-CheckResult -Ok $false -Message 'backend/node_modules bulunamadı' -Detail 'cd backend && npm install'
}

# NSSM (uyari - servis kurulumu icin gerekli)
$nssm = Get-NssmPath
if ($nssm) {
    Add-CheckResult -Ok $true -Message 'NSSM bulundu (Windows Service kurulumu için)' -Detail $nssm
} else {
    Add-CheckResult -Ok $false -Message 'NSSM bulunamadi' -Detail 'Servis kurulumu icin https://nssm.cc/download - simdilik npm start ile test edebilirsiniz' -Warning
}

# PostgreSQL servisi
$pgService = Test-PostgreSqlServiceRunning
Add-CheckResult -Ok $pgService.Ok -Message $pgService.Message -Detail $pgService.Detail

# pos_db ve bağlantı
if (Test-Path $envFile) {
    $pgConn = Test-PostgreSqlConnection -BackendDir $BackendDir
    Add-CheckResult -Ok $pgConn.Ok -Message $pgConn.Message -Detail $pgConn.Detail
} else {
    Add-CheckResult -Ok $false -Message 'PostgreSQL bağlantısı test edilemedi (.env yok)'
}

# Migration
if (Test-Path $envFile) {
    $migration = Test-MigrationsApplied -BackendDir $BackendDir
    Add-CheckResult -Ok $migration.Ok -Message $migration.Message -Detail $migration.Detail
} else {
    Add-CheckResult -Ok $false -Message 'Migration durumu kontrol edilemedi (.env yok)'
}

# Port
$portCheck = Test-PortAvailability -Port $envSettings.Port
Add-CheckResult -Ok $portCheck.Ok -Message $portCheck.Message -Detail $portCheck.Detail

# Health (port doluysa veya servis çalışıyorsa anlamlı)
$health = Test-HealthEndpoint -Port $envSettings.Port
if ($health.Ok) {
    Add-CheckResult -Ok $true -Message $health.Message -Detail $health.Detail
} elseif ($portCheck.InUse) {
    Add-CheckResult -Ok $false -Message $health.Message -Detail $health.Detail
} else {
    Add-CheckResult -Ok $false -Message $health.Message -Detail 'Servis kurulmadıysa normal - npm run service:install sonrasi tekrar kontrol edin' -Warning
}

# Windows Service durumu (bilgi)
$posService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($posService) {
    $statusLabel = $posService.Status
    $ok = $posService.Status -eq 'Running'
    Add-CheckResult -Ok $ok -Message "Windows Service '$ServiceName' kayitli - durum: $statusLabel"
} else {
    Add-CheckResult -Ok $false -Message "Windows Service '$ServiceName' henuz kurulmamis" -Detail 'cd backend && npm run service:install' -Warning
}

Write-Host ''
Write-Host '----------------------------------------'

if ($failCount -eq 0) {
    Write-Host "Sonuc: Temel kontroller gecti" -ForegroundColor Green
    if ($warnCount -gt 0) {
        Write-Host "Uyarı: $warnCount madde (servis kurulumu / health henüz hazır olmayabilir)" -ForegroundColor Yellow
    }
    Write-Host ''
    Write-Host 'Sonraki adımlar (henüz yapılmadıysa):'
    Write-Host '  cd backend'
    Write-Host '  npm install'
    Write-Host '  npm run db:migrate'
    Write-Host '  npm run db:seed'
    Write-Host '  npm run db:seed-license'
    Write-Host '  npm run service:install    (Yönetici PowerShell)'
    Write-Host '  npm run service:start'
    Write-Host '  npm run preflight          (tekrar kontrol)'
    exit 0
}

Write-Host "Sonuc: $failCount hata bulundu - kuruluma devam etmeden duzeltin." -ForegroundColor Red
Write-Host ''
exit 1
