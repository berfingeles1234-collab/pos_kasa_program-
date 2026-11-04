# POS Kasa Sistemi - Master Installer build script
# Gelistirici makinede calistirin: npm run build:master

$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$InstallerDir = Join-Path $ProjectRoot 'installer'
$StagingDir = Join-Path $InstallerDir 'staging'
$RuntimeDir = Join-Path $InstallerDir 'runtime'
$OutputDir = Join-Path $InstallerDir 'output'
$FrontendConfig = Join-Path $ProjectRoot 'frontend\js\config.js'
$OriginalFrontendConfig = Get-Content -LiteralPath $FrontendConfig -Raw

function Write-Step([string]$Message) {
    Write-Host "`n>> $Message" -ForegroundColor Cyan
}

function Ensure-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name bulunamadi. PATH'e ekleyin."
    }
}

try {
    Write-Step 'POS Kasa Master Installer derleniyor...'
    Ensure-Command 'node'
    Ensure-Command 'npm'

    # Her derleme temiz staging ile başlar; çalışan backend bağımlılıklarına dokunulmaz.
    if (Test-Path $StagingDir) {
        Remove-Item -LiteralPath $StagingDir -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $StagingDir | Out-Null

    # 1) On-prem ayarlı Electron istemcisi
    Write-Step 'Electron uygulamasi paketleniyor (onprem)...'
    Push-Location $ProjectRoot
    try {
        npm run config:onprem
        if ($LASTEXITCODE -ne 0) { throw 'config:onprem basarisiz' }
        npx electron-builder --dir
        if ($LASTEXITCODE -ne 0) { throw 'electron-builder --dir basarisiz' }
    } finally {
        Pop-Location
    }

    $unpacked = Join-Path $ProjectRoot 'dist\win-unpacked'
    if (-not (Test-Path $unpacked)) {
        throw "Electron win-unpacked bulunamadi: $unpacked"
    }
    Copy-Item $unpacked (Join-Path $StagingDir 'client') -Recurse -Force

    # 2) Backend kaynakları ve yalnızca production bağımlılıkları staging'e kurulur.
    Write-Step 'Backend production bagimliliklari hazirlaniyor...'
    $backendDir = Join-Path $ProjectRoot 'backend'
    $stageBackend = Join-Path $StagingDir 'backend'
    New-Item -ItemType Directory -Force -Path $stageBackend | Out-Null
    Copy-Item (Join-Path $backendDir 'package.json') $stageBackend -Force
    Copy-Item (Join-Path $backendDir 'package-lock.json') $stageBackend -Force
    Copy-Item (Join-Path $backendDir 'src') $stageBackend -Recurse -Force
    Push-Location $stageBackend
    try {
        npm ci --omit=dev
        if ($LASTEXITCODE -ne 0) { throw 'Backend production bagimliliklari kurulamadi' }
    } finally {
        Pop-Location
    }

    # 2b) Kurulum betikleri ve tek dosyalı ZIP kurulum başlatıcısı
    $stageInstallerScripts = Join-Path $StagingDir 'installer\scripts'
    New-Item -ItemType Directory -Force -Path $stageInstallerScripts | Out-Null
    Copy-Item (Join-Path $InstallerDir 'scripts\*') $stageInstallerScripts -Recurse -Force
    Copy-Item (Join-Path $InstallerDir 'package-setup.ps1') (Join-Path $StagingDir 'Kurulum.ps1') -Force
    Copy-Item (Join-Path $InstallerDir 'KURULUM-REHBERI.txt') $StagingDir -Force

    # 3) Taşınabilir Node.js runtime
    Write-Step 'Node.js runtime kopyalaniyor...'
    $nodeSource = (Get-Command node).Source
    $nodeDir = Split-Path $nodeSource -Parent
    $stageNode = Join-Path $StagingDir 'runtime\node'
    New-Item -ItemType Directory -Force -Path $stageNode | Out-Null
    $nodeFiles = @('node.exe', 'node.dll', 'libnode.dll', 'icu*.dll', 'v8*.dll', 'zlib*.dll', 'uv*.dll', 'brotli*.dll', 'cares*.dll', 'nghttp2*.dll', 'openssl*.dll', 'llhttp*.dll')
    foreach ($pattern in $nodeFiles) {
        Get-ChildItem $nodeDir -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName $stageNode -Force
        }
    }
    if (-not (Test-Path (Join-Path $stageNode 'node.exe'))) {
        Copy-Item $nodeSource $stageNode -Force
    }

    # 4) NSSM
    Write-Step 'NSSM kontrol ediliyor...'
    $nssmCandidates = @(
        (Join-Path $RuntimeDir 'nssm\nssm.exe'),
        'C:\Program Files\nssm\nssm.exe',
        'C:\Tools\nssm\nssm.exe'
    )
    $nssmSource = $nssmCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $nssmSource) {
        throw "NSSM bulunamadi. nssm.exe dosyasini installer\runtime\nssm\ konumuna koyun."
    }
    $stageNssm = Join-Path $StagingDir 'runtime\nssm'
    New-Item -ItemType Directory -Force -Path $stageNssm | Out-Null
    Copy-Item $nssmSource $stageNssm -Force

    # 5) Inno Setup derlemesi
    Write-Step 'Inno Setup derleniyor...'
    $iscc = $null
    $isccCmd = Get-Command iscc -ErrorAction SilentlyContinue
    if ($isccCmd) { $iscc = $isccCmd.Source }
    if (-not $iscc -and (Test-Path "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe")) {
        $iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
    }
    if (-not $iscc -and (Test-Path "$env:ProgramFiles\Inno Setup 6\ISCC.exe")) {
        $iscc = "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
    }
    if (-not $iscc) {
        Write-Step 'Inno Setup yok; ZIP kurulum paketi hazirlaniyor...'
        New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
        $zipPath = Join-Path $OutputDir 'POS-Kasa-Sistemi-Kurulum.zip'
        if (Test-Path $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
        Compress-Archive -Path (Join-Path $StagingDir '*') -DestinationPath $zipPath -CompressionLevel Optimal
        if (-not (Test-Path $zipPath)) { throw 'Kurulum arsivi olusturulamadi.' }
        Write-Host "`nBasarili!`nKurulum paketi: $zipPath`nKurulum: arsivi acip Kurulum.ps1 dosyasini calistirin." -ForegroundColor Green
        return
    }

    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
    & $iscc (Join-Path $InstallerDir 'setup.iss')
    if ($LASTEXITCODE -ne 0) { throw 'Inno Setup derlemesi basarisiz.' }

    $setupExe = Join-Path $OutputDir 'POS-Kasa-Sistemi-Setup.exe'
    if (-not (Test-Path $setupExe)) { throw "Kurulum dosyasi olusmadi: $setupExe" }
    Write-Host "`nBasarili!`nSetup dosyasi: $setupExe" -ForegroundColor Green
} finally {
    # Derleme profili kaynak config.js dosyasını değiştirmesin.
    Set-Content -LiteralPath $FrontendConfig -Value $OriginalFrontendConfig -NoNewline -Encoding UTF8
}
