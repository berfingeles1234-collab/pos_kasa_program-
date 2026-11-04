; POS Kasa Sistemi - Master Installer (Inno Setup 6)
; Derleme: npm run build:master  (veya ISCC.exe setup.iss)

#define MyAppName "POS Kasa Sistemi"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "POS Kasa"
#define MyStaging "staging"

[Setup]
AppId={{A7B3C9E1-4F2D-4A8B-9C6E-1D5F8A2B3C4D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\POS Kasa Sistemi
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=POS-Kasa-Sistemi-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupLogging=yes
UninstallDisplayIcon={app}\client\POS Kasa Sistemi.exe

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"

[Tasks]
Name: "desktopicon"; Description: "Masaustu kisayolu olustur"; GroupDescription: "Ek kisayollar:"; Flags: checkedonce

[Files]
Source: "{#MyStaging}\client\*"; DestDir: "{app}\client"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#MyStaging}\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: ".env"
Source: "{#MyStaging}\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "scripts\*"; DestDir: "{app}\installer\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\client\POS Kasa Sistemi.exe"; WorkingDir: "{app}\client"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\client\POS Kasa Sistemi.exe"; WorkingDir: "{app}\client"; Tasks: desktopicon

[Run]
Filename: "{app}\client\POS Kasa Sistemi.exe"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent; Check: ShouldLaunchApp

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File ""{app}\installer\scripts\uninstall-service.ps1"" -InstallRoot ""{app}"""; Flags: runhidden waituntilterminated; RunOnceId: "StopPosService"

[Code]
var
  PgPasswordPage: TInputQueryWizardPage;
  InstallSuccess: Boolean;

procedure InitializeWizard;
begin
  PgPasswordPage := CreateInputQueryPage(wpSelectDir,
    'PostgreSQL Baglantisi',
    'PostgreSQL onceden kurulu olmalidir.',
    'Lutfen PostgreSQL ''postgres'' kullanicisinin sifresini girin.' +
    #13#10 + 'Bu sifre yalnizca yerel veritabani kurulumu icin kullanilir.');
  PgPasswordPage.Add('PostgreSQL sifresi:', True);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = PgPasswordPage.ID then
  begin
    if Length(Trim(PgPasswordPage.Values[0])) = 0 then
    begin
      MsgBox('PostgreSQL sifresi bos olamaz.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function GetPgPassword(Param: String): String;
begin
  Result := PgPasswordPage.Values[0];
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  Params: String;
begin
  if CurStep = ssPostInstall then
  begin
    InstallSuccess := False;
    Params := '-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File "' +
      ExpandConstant('{app}\installer\scripts\master-install.ps1') +
      '" -InstallRoot "' + ExpandConstant('{app}') +
      '" -PgPassword "' + GetPgPassword('') + '"';

    if Exec('powershell.exe', Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    begin
      if ResultCode = 0 then
        InstallSuccess := True
      else if ResultCode = 2 then
        MsgBox('PostgreSQL kurulu degil.' + #13#10 +
          'Lutfen PostgreSQL kurun ve Setup''i tekrar calistirin.' + #13#10 + #13#10 +
          'https://www.postgresql.org/download/windows/', mbError, MB_OK)
      else
        MsgBox('Kurulum tamamlanamadi (hata kodu: ' + IntToStr(ResultCode) + ').' + #13#10 +
          'Detay icin log klasorune bakin:' + #13#10 +
          ExpandConstant('{app}\logs'), mbError, MB_OK);
    end
    else
      MsgBox('Kurulum betigi calistirilamadi.', mbError, MB_OK);
  end;
end;

function ShouldLaunchApp: Boolean;
begin
  Result := InstallSuccess;
end;

function InitializeUninstall(): Boolean;
begin
  Result := True;
end;
