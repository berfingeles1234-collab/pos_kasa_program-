# Master installer - on kurulum kontrolleri
param(
    [Parameter(Mandatory = $true)][string]$InstallRoot,
    [string]$PgPassword = ''
)

. "$PSScriptRoot\common.ps1" -InstallRoot $InstallRoot

Write-Step 'Sistem kontrolleri yapiliyor...'

if (-not (Test-IsAdmin)) {
    Write-Fail 'Kurulum yonetici yetkisi gerektirir. Setup.exe''ye sag tiklayip Yonetici olarak calistirin.'
    exit 1
}
Write-Ok 'Yonetici yetkisi mevcut'

try {
    Ensure-InstallPaths
    Write-Ok 'Kurulum dosyalari tamam'
} catch {
    Write-Fail $_.Exception.Message
    exit 1
}

if (-not (Test-Path $ClientExe)) {
    Write-Fail "POS uygulamasi bulunamadi: $ClientExe"
    exit 1
}
Write-Ok 'POS masaustu uygulamasi bulundu'

$pgServices = Get-PostgreSqlServices
if ($pgServices.Count -eq 0) {
    Write-Fail 'PostgreSQL kurulu degil.'
    Write-Host ''
    Write-Host 'Bu surumde PostgreSQL onceden kurulmus olmalidir.' -ForegroundColor Yellow
    Write-Host 'Indirin: https://www.postgresql.org/download/windows/' -ForegroundColor Yellow
    Write-Host 'Kurulumdan sonra Setup.exe''yi tekrar calistirin.' -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'Not: Faz 2''de PostgreSQL sessiz kurulumu eklenecektir.' -ForegroundColor DarkGray
    exit 2
}

$running = @($pgServices | Where-Object { $_.Status -eq 'Running' })
if ($running.Count -eq 0) {
    Write-Fail 'PostgreSQL servisi calismiyor. services.msc uzerinden baslatin.'
    exit 3
}
Write-Ok "PostgreSQL calisiyor ($($running[0].DisplayName))"

if (-not (Get-PsqlPath)) {
    Write-Fail 'PostgreSQL psql araci bulunamadi. Kurulumda Command Line Tools secin.'
    exit 4
}
Write-Ok 'PostgreSQL psql araci bulundu'

if ([string]::IsNullOrWhiteSpace($PgPassword)) {
    Write-Fail 'PostgreSQL sifresi girilmedi.'
    exit 5
}

try {
    $null = Invoke-Psql -Query 'SELECT 1' -PgPassword $PgPassword
    Write-Ok 'PostgreSQL baglantisi basarili'
} catch {
    Write-Fail 'PostgreSQL sifresi hatali veya baglanti kurulamadi.'
    Write-Host $_.Exception.Message -ForegroundColor DarkGray
    exit 6
}

if (-not (Test-PortFree -Port $ApiPort)) {
    $existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existing -and $existing.Status -eq 'Running') {
        Write-Warn "Port $ApiPort kullanimda - mevcut POS-Backend servisi guncellenecek"
    } else {
        Write-Fail "Port $ApiPort baska bir uygulama tarafindan kullaniliyor."
        exit 7
    }
} else {
    Write-Ok "Port $ApiPort uygun"
}

$freeGb = (Get-PSDrive -Name C).Free / 1GB
if ($freeGb -lt 1) {
    Write-Fail 'Yetersiz disk alani (en az 1 GB gerekli).'
    exit 8
}
Write-Ok ('Disk alani yeterli ({0:N1} GB bos)' -f $freeGb)

Write-Ok 'On kontroller tamamlandi'
exit 0
