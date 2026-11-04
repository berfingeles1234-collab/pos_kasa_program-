# Master installer - ortak yardimcilar
param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot
)

$ErrorActionPreference = 'Stop'

$script:InstallRoot = $InstallRoot
$script:BackendDir = Join-Path $InstallRoot 'backend'
$script:ClientDir = Join-Path $InstallRoot 'client'
$script:RuntimeDir = Join-Path $InstallRoot 'runtime'
$script:NodeExe = Join-Path $InstallRoot 'runtime\node\node.exe'
$script:NssmExe = Join-Path $InstallRoot 'runtime\nssm\nssm.exe'
$script:ClientExe = Join-Path $InstallRoot 'client\POS Kasa Sistemi.exe'
$script:LogsDir = Join-Path $InstallRoot 'logs'
$script:ServiceName = 'POS-Backend'
$script:DbName = 'pos_db'
$script:DbUser = 'postgres'
$script:DbHost = 'localhost'
$script:DbPort = 5432
$script:ApiPort = 4001

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host ">> $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "OK  $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host "HATA: $Message" -ForegroundColor Red
}

function Write-Warn {
    param([string]$Message)
    Write-Host "UYARI: $Message" -ForegroundColor Yellow
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-PsqlPath {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($ver in 18, 17, 16, 15, 14) {
        $candidate = "C:\Program Files\PostgreSQL\$ver\bin\psql.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    return $null
}

function Get-PostgreSqlServices {
    return @(Get-Service -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -like 'postgresql*' -or $_.DisplayName -like 'PostgreSQL*'
    })
}

function Invoke-Psql {
    param(
        [Parameter(Mandatory = $true)][string]$Query,
        [Parameter(Mandatory = $true)][string]$PgPassword,
        [string]$Database = 'postgres'
    )

    $psql = Get-PsqlPath
    if (-not $psql) {
        throw 'PostgreSQL psql araci bulunamadi.'
    }

    $prev = $env:PGPASSWORD
    try {
        $env:PGPASSWORD = $PgPassword
        $output = & $psql -h $script:DbHost -p $script:DbPort -U $script:DbUser -d $Database -tAc $Query 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw ($output | Out-String).Trim()
        }
        return ($output | Out-String).Trim()
    } finally {
        if ($null -eq $prev) {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        } else {
            $env:PGPASSWORD = $prev
        }
    }
}

function New-RandomSecret {
    param([int]$Length = 48)
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

function Invoke-BundledNode {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptRelativePath,
        [string[]]$NodeArgs = @()
    )

    if (-not (Test-Path $script:NodeExe)) {
        throw "Paketlenmis Node.js bulunamadi: $($script:NodeExe)"
    }

    $target = Join-Path $script:BackendDir $ScriptRelativePath
    if (-not (Test-Path $target)) {
        throw "Script bulunamadi: $target"
    }

    Push-Location $script:BackendDir
    try {
        & $script:NodeExe $target @NodeArgs
        if ($LASTEXITCODE -ne 0) {
            throw "Node script basarisiz (exit $LASTEXITCODE): $ScriptRelativePath"
        }
    } finally {
        Pop-Location
    }
}

function Test-PortFree {
    param([int]$Port)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

function Test-HealthApi {
    param([int]$Port = 4001, [int]$TimeoutSec = 5)

    $url = "http://localhost:$Port/api/v1/health"
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $TimeoutSec
        $body = $response.Content | ConvertFrom-Json
        return @{
            Ok = ($response.StatusCode -eq 200 -and $body.status -eq 'ok' -and $body.database.status -eq 'connected')
            Url = $url
            Body = $body
        }
    } catch {
        return @{ Ok = $false; Url = $url; Body = $null }
    }
}

function Ensure-InstallPaths {
    if (-not (Test-Path $script:BackendDir)) {
        throw "Backend klasoru eksik: $($script:BackendDir)"
    }
    if (-not (Test-Path $script:NodeExe)) {
        throw "Node runtime eksik: $($script:NodeExe)"
    }
    if (-not (Test-Path $script:NssmExe)) {
        throw "NSSM eksik: $($script:NssmExe)"
    }
    New-Item -ItemType Directory -Force -Path $script:LogsDir | Out-Null
}
