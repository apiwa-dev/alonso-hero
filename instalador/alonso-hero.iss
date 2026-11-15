; Instalador de Alonso Hero (Inno Setup 6).
; Compilar: ISCC.exe /DMyAppVersion=1.0.0 instalador\alonso-hero.iss
#define MyAppName "Alonso Hero"
#ifndef MyAppVersion
  #define MyAppVersion "0.0.0"
#endif
#define PowerShell "{sys}\WindowsPowerShell\v1.0\powershell.exe"
; Las comillas se escriben cuádruples: el preprocesador las reduce a dobles, que es como Inno las espera dentro de Parameters.
#define Lanzar "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """"{app}\iniciar.ps1"""""

[Setup]
AppId={{197EF040-F710-40E8-B6C9-1E923EE0F418}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher=Alonso Hero
AppPublisherURL=https://github.com/apiwa-dev/alonso-hero
AppSupportURL=https://github.com/apiwa-dev/alonso-hero/issues
SourceDir=..
OutputDir=dist
OutputBaseFilename=AlonsoHero-Instalador-{#MyAppVersion}
DefaultDirName={localappdata}\Programs\Alonso Hero
DisableProgramGroupPage=yes
DisableDirPage=yes
PrivilegesRequired=lowest
SetupIconFile=img\icono.ico
UninstallDisplayIcon={app}\img\icono.ico
UninstallDisplayName={#MyAppName}
LicenseFile=LICENSE
WizardStyle=modern
Compression=lzma2
SolidCompression=yes
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany=Alonso Hero
VersionInfoDescription=Instalador de Alonso Hero
VersionInfoCopyright=Licencia MIT

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "escritorio"; Description: "Crear un icono en el escritorio"; GroupDescription: "Iconos:"

[Files]
Source: "index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "iniciar.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "servidor.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "css\*"; DestDir: "{app}\css"; Flags: ignoreversion
Source: "js\*"; DestDir: "{app}\js"; Flags: ignoreversion
Source: "img\*"; DestDir: "{app}\img"; Flags: ignoreversion
Source: "musica\LEEME.txt"; DestDir: "{app}\musica"; Flags: onlyifdoesntexist

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{#PowerShell}"; Parameters: "{#Lanzar}"; WorkingDir: "{app}"; IconFilename: "{app}\img\icono.ico"; Comment: "Juego de rock"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{#PowerShell}"; Parameters: "{#Lanzar}"; WorkingDir: "{app}"; IconFilename: "{app}\img\icono.ico"; Comment: "Juego de rock"; Tasks: escritorio

[Run]
Filename: "{#PowerShell}"; Parameters: "{#Lanzar}"; Description: "¡Jugar ahora!"; Flags: postinstall nowait skipifsilent runhidden

[UninstallRun]
; Cierra el mini servidor local del juego si está abierto.
Filename: "{#PowerShell}"; Parameters: "-NoProfile -Command ""try {{ Invoke-WebRequest http://127.0.0.1:47823/salir -UseBasicParsing -TimeoutSec 2 | Out-Null }} catch {{ }}"""; Flags: runhidden; RunOnceId: "CerrarServidor"
