# Master installer - veritabani ve .env
param(
    [Parameter(Mandatory = $true)][string]$InstallRoot,
    [Parameter(Mandatory = $true)][string]$PgPassword
)

. "$PSScriptRoot\common.ps1" -InstallRoot $InstallRoot

Write-Step 'Veritabani hazirlaniyor...'

Ensure-InstallPaths

try {
    $exists = Invoke-Psql -Query "SELECT 1 FROM pg_database WHERE datname='$DbName'" -PgPassword $PgPassword
    if ($exists -eq '1') {
        Write-Ok "Veritabani '$DbName' zaten mevcut"
    } else {
        Invoke-Psql -Query "CREATE DATABASE $DbName" -PgPassword $PgPassword | Out-Null
        Write-Ok "Veritabani '$DbName' olusturuldu"
    }
} catch {
    Write-Fail "Veritabani olusturulamadi: $($_.Exception.Message)"
    exit 1
}

$jwtSecret = New-RandomSecret -Length 48
$envPath = Join-Path $BackendDir '.env'

$envContent = @"
PORT=$ApiPort
NODE_ENV=production

DB_HOST=$DbHost
DB_PORT=$DbPort
DB_NAME=$DbName
DB_USER=$DbUser
DB_PASSWORD=$PgPassword
DB_SSL=false
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000

DATABASE_URL=postgresql://${DbUser}:$([Uri]::EscapeDataString($PgPassword))@${DbHost}:${DbPort}/${DbName}

JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=12h
CORS_ORIGIN=*

BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30
"@

Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Write-Ok ".env dosyasi olusturuldu: $envPath"

exit 0
