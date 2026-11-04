param([switch]$Elevated)

$ErrorActionPreference = 'Stop'

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    try {
        $arguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -Elevated' -f $PSCommandPath
        $child = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -Verb RunAs -Wait -PassThru
        exit $child.ExitCode
    } catch {
        Write-Host 'Kurulum icin Windows yonetici izni gerekli. UAC penceresinde Evet secin.' -ForegroundColor Red
        Read-Host 'Cikmak icin Enter'
        exit 1
    }
}

$packageRoot = $PSScriptRoot
$masterScript = Join-Path $packageRoot 'installer\scripts\master-install.ps1'
$clientExe = Join-Path $packageRoot 'client\POS Kasa Sistemi.exe'

Write-Host 'POS Kasa Sistemi kurulumu' -ForegroundColor Cyan
Write-Host 'Bu bilgisayarda PostgreSQL kurulu ve calisiyor olmalidir.'
$postgres = Get-Service -ErrorAction SilentlyContinue | Where-Object {
    ($_.Name -like 'postgresql*' -or $_.DisplayName -like 'PostgreSQL*') -and $_.Status -eq 'Running'
} | Select-Object -First 1
if (-not $postgres) {
    Write-Host 'Calisan PostgreSQL servisi bulunamadi. PostgreSQL kurup servisini baslattiktan sonra tekrar deneyin.' -ForegroundColor Red
    Read-Host 'Cikmak icin Enter'
    exit 1
}

$securePassword = Read-Host 'PostgreSQL postgres kullanici sifresini girin' -AsSecureString
$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:POS_INSTALL_PG_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
    $arguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -InstallRoot "{1}"' -f $masterScript, $packageRoot
    Write-Host 'Veritabani ve backend kuruluyor...' -ForegroundColor Cyan
    $install = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WorkingDirectory $packageRoot -Wait -PassThru
    if ($install.ExitCode -ne 0) {
        Write-Host "Kurulum basarisiz (kod $($install.ExitCode)). Ekrandaki hata mesajini kontrol edin." -ForegroundColor Red
        Read-Host 'Cikmak icin Enter'
        exit $install.ExitCode
    }
} finally {
    Remove-Item Env:POS_INSTALL_PG_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
}

$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'POS Kasa Sistemi.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $clientExe
$shortcut.WorkingDirectory = Split-Path $clientExe -Parent
$shortcut.Save()

Start-Process -FilePath $clientExe -WorkingDirectory (Split-Path $clientExe -Parent)
Write-Host 'Kurulum tamamlandi. Masaustu kisayolu olusturuldu.' -ForegroundColor Green
