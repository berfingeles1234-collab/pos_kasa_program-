# Master installer - servis kaldirma (uninstall)
param(
    [Parameter(Mandatory = $true)][string]$InstallRoot
)

$ErrorActionPreference = 'SilentlyContinue'

$nssm = Join-Path $InstallRoot 'runtime\nssm\nssm.exe'
$serviceName = 'POS-Backend'

$svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $svc) { exit 0 }

if ($svc.Status -eq 'Running') {
    Stop-Service -Name $serviceName -Force
    Start-Sleep -Seconds 2
}

if (Test-Path $nssm) {
    & $nssm remove $serviceName confirm
}

exit 0
