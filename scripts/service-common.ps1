# Shared helpers for preflight and Windows Service scripts.

$ErrorActionPreference = 'Stop'

$script:ServiceName = 'POS-Backend'
$script:ServiceDisplayName = 'POS Kasa Backend API'
$script:ServiceDescription = 'POS Kasa Sistemi Node.js API (PostgreSQL)'

function Get-ProjectRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Get-BackendDir {
    $cwd = Get-Location
    if (Test-Path (Join-Path $cwd.Path 'src\server.js')) {
        return $cwd.Path
    }

    $fromCwd = Join-Path $cwd.Path 'backend'
    if (Test-Path (Join-Path $fromCwd 'src\server.js')) {
        return (Resolve-Path $fromCwd).Path
    }

    $fromScript = Join-Path (Get-ProjectRoot) 'backend'
    if (Test-Path (Join-Path $fromScript 'src\server.js')) {
        return (Resolve-Path $fromScript).Path
    }

    throw 'Backend klasoru bulunamadi. Komutu proje kokunden veya backend klasorunden calistirin.'
}

function Get-NpmPath {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npm) { return $null }
    return $npm.Source
}

function Get-NodePath {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        throw "Node.js bulunamadi.`nLutfen Node.js 20 LTS kurun: https://nodejs.org/"
    }
    return $node.Source
}

function Import-BackendEnvFile {
    param([Parameter(Mandatory = $true)][string]$BackendDir)

    $settings = @{
        Port         = 4001
        DbHost       = 'localhost'
        DbPort       = 5432
        DbName       = 'pos_db'
        DbUser       = 'postgres'
        DbPassword   = ''
        DatabaseUrl  = ''
    }

    $envFile = Join-Path $BackendDir '.env'
    if (-not (Test-Path $envFile)) { return $settings }

    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) { return }
        $parts = $line -split '=', 2
        if ($parts.Count -ne 2) { return }
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        switch ($name) {
            'PORT' { if ($value) { $settings.Port = [int]$value } }
            'DB_HOST' { if ($value) { $settings.DbHost = $value } }
            'DB_PORT' { if ($value) { $settings.DbPort = [int]$value } }
            'DB_NAME' { if ($value) { $settings.DbName = $value } }
            'DB_USER' { if ($value) { $settings.DbUser = $value } }
            'DB_PASSWORD' { $settings.DbPassword = $value }
            'DATABASE_URL' { $settings.DatabaseUrl = $value }
        }
    }

    return $settings
}

function Get-PsqlPath {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($ver in 18, 17, 16, 15, 14, 13) {
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

function Test-PostgreSqlServiceRunning {
    $services = Get-PostgreSqlServices
    if ($services.Count -eq 0) {
        return @{
            Ok = $false
            Message = 'PostgreSQL Windows servisi bulunamadi'
            Detail = 'postgresql.org uzerinden PostgreSQL kurun'
        }
    }

    $running = @($services | Where-Object { $_.Status -eq 'Running' })
    if ($running.Count -eq 0) {
        $names = ($services | ForEach-Object { $_.Name }) -join ', '
        return @{
            Ok = $false
            Message = 'PostgreSQL servisi calismiyor'
            Detail = "Servisler: $names | services.msc uzerinden baslatin"
        }
    }

    $label = ($running | ForEach-Object { $_.DisplayName }) -join ', '
    return @{
        Ok = $true
        Message = "PostgreSQL calisiyor ($label)"
        Detail = $null
    }
}

function Invoke-PsqlQuery {
    param(
        [Parameter(Mandatory = $true)][string]$Query,
        [Parameter(Mandatory = $true)][hashtable]$EnvSettings,
        [string]$Database = 'postgres'
    )

    $psql = Get-PsqlPath
    if (-not $psql) {
        throw 'psql bulunamadi. PostgreSQL Command Line Tools kurulu olmali.'
    }

    $targetDb = if ($Database -eq 'postgres') { 'postgres' } else { $EnvSettings.DbName }
    $args = @('-h', $EnvSettings.DbHost, '-p', $EnvSettings.DbPort, '-U', $EnvSettings.DbUser, '-d', $targetDb, '-tAc', $Query)

    $previousPassword = $env:PGPASSWORD
    try {
        $env:PGPASSWORD = $EnvSettings.DbPassword
        $output = & $psql @args 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw ($output | Out-String).Trim()
        }
        return ($output | Out-String).Trim()
    } finally {
        if ($null -eq $previousPassword) {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        } else {
            $env:PGPASSWORD = $previousPassword
        }
    }
}

function Test-PostgreSqlDatabaseExists {
    param([Parameter(Mandatory = $true)][hashtable]$EnvSettings)

    try {
        $dbName = $EnvSettings.DbName
        $result = Invoke-PsqlQuery -Query "SELECT 1 FROM pg_database WHERE datname='$dbName'" -EnvSettings $EnvSettings
        if ($result -eq '1') {
            return @{
                Ok = $true
                Message = "Veritabani '$dbName' bulundu"
                Detail = $null
            }
        }
        return @{
            Ok = $false
            Message = "Veritabani '$dbName' bulunamadi"
            Detail = "psql -U $($EnvSettings.DbUser) -c `"CREATE DATABASE $dbName;`""
        }
    } catch {
        return @{
            Ok = $false
            Message = 'PostgreSQL baglantisi kurulamadi'
            Detail = $_.Exception.Message
        }
    }
}

function Test-PostgreSqlConnection {
    param([Parameter(Mandatory = $true)][string]$BackendDir)

    $envSettings = Import-BackendEnvFile -BackendDir $BackendDir
    $envFile = Join-Path $BackendDir '.env'

    if (-not (Test-Path $envFile)) {
        return @{
            Ok = $false
            Message = 'PostgreSQL baglantisi test edilemedi (.env yok)'
            Detail = 'backend/.env olusturun'
        }
    }

    $dbCheck = Test-PostgreSqlDatabaseExists -EnvSettings $envSettings
    if (-not $dbCheck.Ok) { return $dbCheck }

    $connLabel = '{0}@{1}:{2}/{3}' -f $envSettings.DbUser, $envSettings.DbHost, $envSettings.DbPort, $envSettings.DbName
    return @{
        Ok = $true
        Message = "PostgreSQL baglantisi basarili ($connLabel)"
        Detail = $null
    }
}

function Test-MigrationsApplied {
    param([Parameter(Mandatory = $true)][string]$BackendDir)

    $envSettings = Import-BackendEnvFile -BackendDir $BackendDir
    $migrationsDir = Join-Path $BackendDir 'src\db\migrations'

    if (-not (Test-Path $migrationsDir)) {
        return @{ Ok = $false; Message = 'Migration klasoru bulunamadi'; Detail = $migrationsDir }
    }

    $expectedFiles = @(Get-ChildItem $migrationsDir -Filter '*.sql' | Sort-Object Name)
    if ($expectedFiles.Count -eq 0) {
        return @{ Ok = $false; Message = 'Migration dosyasi bulunamadi'; Detail = $migrationsDir }
    }

    try {
        if (-not (Get-PsqlPath)) {
            return @{
                Ok = $false
                Message = 'Migration durumu kontrol edilemedi (psql yok)'
                Detail = 'PostgreSQL bin klasorunu PATH''e ekleyin'
            }
        }

        $tableExists = Invoke-PsqlQuery `
            -Query "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='schema_migrations'" `
            -EnvSettings $envSettings `
            -Database $envSettings.DbName

        if ($tableExists -ne '1') {
            return @{
                Ok = $false
                Message = 'Migration uygulanmamis (schema_migrations tablosu yok)'
                Detail = 'cd backend; npm run db:migrate'
            }
        }

        $appliedCountRaw = Invoke-PsqlQuery `
            -Query 'SELECT COUNT(*)::text FROM schema_migrations' `
            -EnvSettings $envSettings `
            -Database $envSettings.DbName
        $appliedCount = [int]$appliedCountRaw
        $expectedCount = $expectedFiles.Count

        if ($appliedCount -lt $expectedCount) {
            return @{
                Ok = $false
                Message = "Migration eksik ($appliedCount / $expectedCount uygulandi)"
                Detail = 'cd backend; npm run db:migrate'
            }
        }

        return @{
            Ok = $true
            Message = "Migration uygulanmis ($appliedCount dosya)"
            Detail = ($expectedFiles | ForEach-Object { $_.Name }) -join ', '
        }
    } catch {
        return @{
            Ok = $false
            Message = 'Migration durumu kontrol edilemedi'
            Detail = $_.Exception.Message
        }
    }
}

function Test-PortAvailability {
    param([Parameter(Mandatory = $true)][int]$Port)

    $inUse = $false
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        $listener.Stop()
    } catch {
        $inUse = $true
    }

    if (-not $inUse) {
        return @{ Ok = $true; Message = "Port $Port bos"; Detail = $null; InUse = $false }
    }

    $health = Test-HealthEndpoint -Port $Port -TimeoutSec 3
    if ($health.Ok) {
        return @{
            Ok = $true
            Message = "Port $Port kullanimda - POS API zaten calisiyor"
            Detail = $health.Detail
            InUse = $true
        }
    }

    $pids = ''
    try {
        $match = netstat -ano | Select-String ":$Port\s" | Select-Object -First 1
        if ($match) { $pids = ($match -split '\s+')[-1] }
    } catch { $pids = 'bilinmiyor' }

    return @{
        Ok = $false
        Message = "Port $Port baska bir surec tarafindan kullaniliyor"
        Detail = "PID: $pids | cakisan uygulamayi durdurun veya .env PORT degistirin"
        InUse = $true
    }
}

function Test-HealthEndpoint {
    param([int]$Port = 4001, [int]$TimeoutSec = 5)

    $url = "http://localhost:$Port/api/v1/health"

    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $TimeoutSec
        $body = $response.Content | ConvertFrom-Json

        if ($response.StatusCode -eq 200 -and $body.status -eq 'ok' -and $body.database.status -eq 'connected') {
            return @{ Ok = $true; Message = 'Backend health calisiyor (API + veritabani bagli)'; Detail = $url }
        }

        if ($response.StatusCode -eq 503 -or $body.database.status -ne 'connected') {
            $dbStatus = $body.database.status
            return @{
                Ok = $false
                Message = 'Backend calisiyor ancak veritabani baglantisi yok'
                Detail = "$url | database.status: $dbStatus"
            }
        }

        return @{ Ok = $false; Message = 'Backend health beklenmeyen yanit dondurdu'; Detail = $response.Content }
    } catch {
        return @{ Ok = $false; Message = 'Backend health yanit vermiyor'; Detail = "$url | $($_.Exception.Message)" }
    }
}

function Wait-HealthEndpoint {
    param([int]$Port = 4001, [int]$Retries = 10, [int]$DelaySec = 2)

    $health = @{ Ok = $false; Message = 'Health kontrolu basarisiz'; Detail = $null }
    for ($i = 1; $i -le $Retries; $i++) {
        $health = Test-HealthEndpoint -Port $Port
        if ($health.Ok) { return $health }
        Start-Sleep -Seconds $DelaySec
    }
    return $health
}

function Test-BackendPrerequisites {
    param(
        [Parameter(Mandatory = $true)][string]$BackendDir,
        [switch]$RequireNssm,
        [switch]$RequireMigrations
    )

    $issues = @()
    $envSettings = Import-BackendEnvFile -BackendDir $BackendDir

    try { $null = Get-NodePath } catch { $issues += $_.Exception.Message }

    $envFile = Join-Path $BackendDir '.env'
    if (-not (Test-Path $envFile)) {
        $issues += ".env dosyasi bulunamadi: $envFile`nOrnek: copy .env.example .env"
    }

    if (-not (Test-Path (Join-Path $BackendDir 'node_modules'))) {
        $issues += 'node_modules bulunamadi. Backend klasorunde: npm install'
    }

    if (-not (Test-Path (Join-Path $BackendDir 'src\server.js'))) {
        $issues += 'src\server.js bulunamadi'
    }

    if ($RequireNssm -and -not (Get-NssmPath)) {
        $issues += 'NSSM bulunamadi. https://nssm.cc/download'
    }

    if (Test-Path $envFile) {
        $pgConn = Test-PostgreSqlConnection -BackendDir $BackendDir
        if (-not $pgConn.Ok) { $issues += "$($pgConn.Message)`n$($pgConn.Detail)" }
    }

    $portCheck = Test-PortAvailability -Port $envSettings.Port
    if (-not $portCheck.Ok) { $issues += "$($portCheck.Message)`n$($portCheck.Detail)" }

    if ($RequireMigrations) {
        $migrationCheck = Test-MigrationsApplied -BackendDir $BackendDir
        if (-not $migrationCheck.Ok) { $issues += "$($migrationCheck.Message)`n$($migrationCheck.Detail)" }
    }

    if ($issues.Count -gt 0) { throw ($issues -join "`n`n") }
}

function Get-NssmPath {
    $bundledNssm = Join-Path (Get-ProjectRoot) 'installer\runtime\nssm\nssm.exe'
    foreach ($candidate in @('nssm', 'C:\Program Files\nssm\nssm.exe', 'C:\Program Files (x86)\nssm\nssm.exe', 'C:\Tools\nssm\nssm.exe', $bundledNssm)) {
        if ($candidate -eq 'nssm') {
            $cmd = Get-Command nssm -ErrorAction SilentlyContinue
            if ($cmd) { return $cmd.Source }
        } elseif (Test-Path $candidate) {
            return $candidate
        }
    }
    return $null
}

function Write-ServiceHelp {
    Write-Host ''
    Write-Host 'NSSM kurulu degil.' -ForegroundColor Yellow
    Write-Host 'Indirin: https://nssm.cc/download'
    Write-Host 'Gecici test: cd backend; npm start'
    Write-Host 'Health: http://localhost:4001/api/v1/health'
}

function Write-CheckLine {
    param([bool]$Ok, [string]$Message, [string]$Detail = $null)

    if ($Ok) {
        Write-Host ('{0} {1}' -f [char]0x2713, $Message) -ForegroundColor Green
    } else {
        Write-Host ('{0} {1}' -f [char]0x2717, $Message) -ForegroundColor Red
    }
    if ($Detail) {
        Write-Host "     $Detail" -ForegroundColor DarkGray
    }
}
