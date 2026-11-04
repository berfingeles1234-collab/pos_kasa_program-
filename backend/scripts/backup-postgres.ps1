# PostgreSQL yedek — Windows
# Kullanım (backend klasöründen):
#   powershell -ExecutionPolicy Bypass -File scripts\backup-postgres.ps1

$ErrorActionPreference = 'Stop'

$BackendDir = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $BackendDir '.env'

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
        $parts = $_ -split '=', 2
        if ($parts.Count -eq 2) {
            $name = $parts[0].Trim()
            $value = $parts[1].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

$BackupDir = $env:BACKUP_DIR
if (-not $BackupDir) { $BackupDir = '.\backups' }
if (-not [System.IO.Path]::IsPathRooted($BackupDir)) {
    $BackupDir = Join-Path $BackendDir ($BackupDir -replace '^\./', '')
}
$RetentionDays = if ($env:BACKUP_RETENTION_DAYS) { [int]$env:BACKUP_RETENTION_DAYS } else { 30 }

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    throw @"
pg_dump bulunamadı.
PostgreSQL kurulumunda 'Command Line Tools' seçili olmalı veya pg_dump PATH'e eklenmeli.
Örnek PATH: C:\Program Files\PostgreSQL\16\bin
"@
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupFile = Join-Path $BackupDir "pos_backup_$timestamp.sql"
$gzipFile = "$backupFile.gz"

$DbHost = if ($env:DB_HOST) { $env:DB_HOST } else { 'localhost' }
$DbPort = if ($env:DB_PORT) { $env:DB_PORT } else { '5432' }
$DbName = if ($env:DB_NAME) { $env:DB_NAME } else { 'pos_db' }
$DbUser = if ($env:DB_USER) { $env:DB_USER } else { 'postgres' }
$DbPassword = $env:DB_PASSWORD

if ($env:DATABASE_URL) {
    Write-Host 'Yedek alınıyor (DATABASE_URL)...'
    & pg_dump $env:DATABASE_URL | Out-File -FilePath $backupFile -Encoding utf8
} else {
    Write-Host "Yedek alınıyor (${DbUser}@${DbHost}:${DbPort}/${DbName})..."
    $env:PGPASSWORD = $DbPassword
    & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName | Out-File -FilePath $backupFile -Encoding utf8
}

if (-not (Test-Path $backupFile) -or (Get-Item $backupFile).Length -eq 0) {
    Remove-Item $backupFile -ErrorAction SilentlyContinue
    throw 'Yedek dosyası oluşturulamadı veya boş. .env veritabanı ayarlarını kontrol edin.'
}

# Gzip (PowerShell 5+ / .NET)
$inputStream = [System.IO.File]::OpenRead($backupFile)
$outputStream = [System.IO.File]::Create($gzipFile)
$gzip = New-Object System.IO.Compression.GzipStream($outputStream, [System.IO.Compression.CompressionMode]::Compress)
$inputStream.CopyTo($gzip)
$gzip.Close(); $outputStream.Close(); $inputStream.Close()
Remove-Item $backupFile

Write-Host "Yedek oluşturuldu: $gzipFile" -ForegroundColor Green

if ($RetentionDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem $BackupDir -Filter 'pos_backup_*.sql.gz' |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        ForEach-Object {
            Remove-Item $_.FullName
            Write-Host "Eski yedek silindi: $($_.Name)"
        }
}

Write-Host 'Tamamlandı.'
