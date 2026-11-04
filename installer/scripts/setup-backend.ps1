# Master installer - migration ve seed
param(
    [Parameter(Mandatory = $true)][string]$InstallRoot,
    [string]$PgPassword = ''
)

. "$PSScriptRoot\common.ps1" -InstallRoot $InstallRoot

Write-Step 'Veritabani semasi ve baslangic verileri yukleniyor...'

Ensure-InstallPaths

if (-not (Test-Path (Join-Path $BackendDir 'node_modules'))) {
    Write-Fail 'backend/node_modules bulunamadi. Kurulum paketi eksik.'
    exit 1
}

try {
    Write-Host '  - Migration calistiriliyor...' -ForegroundColor DarkGray
    Invoke-BundledNode -ScriptRelativePath 'src\db\migrate.js'
    Write-Ok 'Migration tamamlandi'

    Write-Host '  - Demo veriler yukleniyor...' -ForegroundColor DarkGray
    Invoke-BundledNode -ScriptRelativePath 'src\db\seed.js'
    Write-Ok 'Seed tamamlandi'

    Write-Host '  - Lisans verileri yukleniyor...' -ForegroundColor DarkGray
    Invoke-BundledNode -ScriptRelativePath 'src\db\seed-license.js'
    Write-Ok 'Lisans seed tamamlandi'
} catch {
    Write-Fail $_.Exception.Message
    exit 1
}

exit 0
