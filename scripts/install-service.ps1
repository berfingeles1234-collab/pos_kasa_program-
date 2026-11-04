# POS Backend - Windows Service kurulumu (NSSM)
# Yonetici PowerShell: cd backend; npm run service:install

. "$PSScriptRoot\service-common.ps1"

Write-Host ''
Write-Host 'POS Backend - Service Kurulumu' -ForegroundColor Cyan
Write-Host '===============================' -ForegroundColor Cyan
Write-Host ''

$BackendDir = Get-BackendDir
$envSettings = Import-BackendEnvFile -BackendDir $BackendDir

try {
    Test-BackendPrerequisites -BackendDir $BackendDir -RequireNssm -RequireMigrations
} catch {
    Write-Host 'On kosullar saglanamadi:' -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ''
    Write-Host 'Once calistirin: npm run preflight' -ForegroundColor Yellow
    exit 1
}

$nssm = Get-NssmPath
if (-not $nssm) {
    Write-ServiceHelp
    exit 1
}

$portCheck = Test-PortAvailability -Port $envSettings.Port
if (-not $portCheck.Ok) {
    Write-Host $portCheck.Message -ForegroundColor Red
    Write-Host $portCheck.Detail
    exit 1
}

if ($portCheck.InUse) {
    Write-Host $portCheck.Message -ForegroundColor Yellow
    $existingHealth = Test-HealthEndpoint -Port $envSettings.Port
    if ($existingHealth.Ok) {
        Write-Host 'Health zaten OK - servis kurulumuna gerek yok.' -ForegroundColor Green
        exit 0
    }
}

$nodePath = Get-NodePath
$serverJs = Join-Path $BackendDir 'src\server.js'
$logsDir = Join-Path $BackendDir 'logs'
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Servis zaten kayitli: $ServiceName (durum: $($existing.Status))" -ForegroundColor Yellow
    Write-Host 'Kaldirmak icin: npm run service:uninstall'
    exit 1
}

Write-Host "Backend dizini : $BackendDir"
Write-Host "Node.js        : $nodePath"
Write-Host "NSSM           : $nssm"
Write-Host "Port           : $($envSettings.Port)"
Write-Host "Servis adi     : $ServiceName"
Write-Host ''

& $nssm install $ServiceName $nodePath $serverJs
& $nssm set $ServiceName AppDirectory $BackendDir
& $nssm set $ServiceName DisplayName $ServiceDisplayName
& $nssm set $ServiceName Description $ServiceDescription
& $nssm set $ServiceName Start SERVICE_AUTO_START
& $nssm set $ServiceName AppStdout (Join-Path $logsDir 'service-out.log')
& $nssm set $ServiceName AppStderr (Join-Path $logsDir 'service-error.log')
& $nssm set $ServiceName AppRotateFiles 1
& $nssm set $ServiceName AppRotateBytes 10485760

Write-Host 'Servis baslatiliyor...' -ForegroundColor Cyan
Start-Service -Name $ServiceName

$health = Wait-HealthEndpoint -Port $envSettings.Port -Retries 12 -DelaySec 2

Write-Host ''
if ($health.Ok) {
    Write-Host 'Servis kuruldu ve health kontrolu basarili.' -ForegroundColor Green
    Write-Host "Health: http://localhost:$($envSettings.Port)/api/v1/health"
} else {
    Write-Host 'Servis kuruldu ancak health kontrolu basarisiz.' -ForegroundColor Red
    Write-Host $health.Message
    Write-Host $health.Detail
    Write-Host ''
    Write-Host 'Loglar:' (Join-Path $logsDir 'service-error.log')
    exit 1
}

Write-Host 'Loglar :' (Join-Path $logsDir 'service-out.log')
