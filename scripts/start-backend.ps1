# Kullanıcı oturum açtığında yerel POS API'sini çalışır durumda tutar.
$ErrorActionPreference = 'Stop'
$apiUrl = 'http://localhost:4001/api/v1/health'

try {
    $health = Invoke-RestMethod -Uri $apiUrl -TimeoutSec 3
    if ($health.status -eq 'ok' -and $health.database.status -eq 'connected') {
        exit 0
    }
} catch {
    # API henüz başlamadı; aşağıda başlat.
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot 'backend'
$serverPath = Join-Path $backendDir 'src\server.js'
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node -or -not (Test-Path $serverPath)) {
    exit 1
}

Start-Process -FilePath $node.Source -ArgumentList 'src/server.js' `
    -WorkingDirectory $backendDir -WindowStyle Hidden

for ($attempt = 0; $attempt -lt 15; $attempt++) {
    Start-Sleep -Seconds 1
    try {
        $health = Invoke-RestMethod -Uri $apiUrl -TimeoutSec 2
        if ($health.status -eq 'ok' -and $health.database.status -eq 'connected') {
            exit 0
        }
    } catch {
        # Sunucunun başlamasını bekle.
    }
}

exit 1
