# Master installer - tum adimlari sirayla calistirir (Inno Setup cagirir)
param(
    [Parameter(Mandatory = $true)][string]$InstallRoot,
    [string]$PgPassword = $env:POS_INSTALL_PG_PASSWORD
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptName,
        [hashtable]$ExtraArgs = @{}
    )

    $scriptPath = Join-Path $scriptDir $ScriptName
    $params = @{
        InstallRoot = $InstallRoot
    }
    if ($ExtraArgs.ContainsKey('PgPassword')) {
        $params['PgPassword'] = $ExtraArgs['PgPassword']
    }

    & $scriptPath @params
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

Invoke-Step -ScriptName 'preinstall-check.ps1' -ExtraArgs @{ PgPassword = $PgPassword }
Invoke-Step -ScriptName 'setup-database.ps1' -ExtraArgs @{ PgPassword = $PgPassword }
Invoke-Step -ScriptName 'setup-backend.ps1' -ExtraArgs @{ PgPassword = $PgPassword }
Invoke-Step -ScriptName 'install-backend-service.ps1'
Invoke-Step -ScriptName 'postinstall-healthcheck.ps1'

exit 0
