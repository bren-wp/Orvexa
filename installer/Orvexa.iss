#define MyAppName "Orvexa"
#define MyAppVersion "0.0.10"
#define MyAppExeName "Orvexa.App.exe"
[Setup]
AppId={{2B56E793-5F72-4F50-89CE-0B8E27E4A18D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=Orvexa
DefaultDirName={localappdata}\Programs\Orvexa
DefaultGroupName=Orvexa
UninstallDisplayName=Orvexa
OutputDir=..\dist
OutputBaseFilename=Orvexa-Setup-0.0.10-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableWelcomePage=no
DisableFinishedPage=no
DisableReadyPage=no
DisableDirPage=no
PrivilegesRequired=lowest
ChangesAssociations=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
LicenseFile=LICENSE.txt
SetupIconFile=..\build\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
DisableProgramGroupPage=yes
SetupLogging=yes
AppMutex=Orvexa.Application
CloseApplications=yes
RestartApplications=no
[Files]
Source: "..\publish\win-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\Orvexa"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\Orvexa"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: unchecked
[Registry]
Root: HKCU; Subkey: "Software\Classes\orvexa"; ValueType: string; ValueName: ""; ValueData: "URL:Orvexa Protocol"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\orvexa"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\orvexa\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"
Root: HKCU; Subkey: "Software\Classes\orvexa\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""
[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Orvexa"; Flags: nowait postinstall skipifsilent
