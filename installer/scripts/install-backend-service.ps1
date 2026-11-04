# Master installer - Windows Service (NSSM)
param(
    [Parameter(Mandatory = $true)][string]$InstallRoot,
    [string]$PgPassword = ''
)

. "$PSScriptRoot\common.ps1" -InstallRoot $InstallRoot

Write-Step 'Backend servisi kuruluyor...'

Ensure-InstallPaths

$serviceLogOut = Join-Path $LogsDir 'service-out.log'
$serviceLogErr = Join-Path $LogsDir 'service-error.log'
$serverJs = Join-Path $BackendDir 'src\server.js'

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Warn "Mevcut '$ServiceName' servisi kaldiriliyor..."
    if ($existing.Status -eq 'Running') {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    & $NssmExe remove $ServiceName confirm
    Start-Sleep -Seconds 1
}

& $NssmExe install $ServiceName $NodeExe $serverJs
& $NssmExe set $ServiceName AppDirectory $BackendDir
& $NssmExe set $ServiceName DisplayName 'POS Kasa Backend API'
& $NssmExe set $ServiceName Description 'POS Kasa Sistemi Node.js API'
& $NssmExe set $ServiceName Start SERVICE_AUTO_START
& $NssmExe set $ServiceName AppStdout $serviceLogOut
& $NssmExe set $ServiceName AppStderr $serviceLogErr
& $NssmExe set $ServiceName AppRotateFiles 1
& $NssmExe set $ServiceName AppRotateBytes 10485760

Start-Service -Name $ServiceName
Start-Sleep -Seconds 2

$svc = Get-Service -Name $ServiceName
if ($svc.Status -ne 'Running') {
    Write-Fail 'POS-Backend servisi baslatilamadi.'
    Write-Host "Log: $serviceLogErr" -ForegroundColor DarkGray
    exit 1
}

Write-Ok "Windows Service '$ServiceName' kuruldu ve calisiyor"
exit 0
