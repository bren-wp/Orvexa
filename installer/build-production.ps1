$ErrorActionPreference="Stop"

$root=Resolve-Path "$PSScriptRoot\.."
$app=Join-Path $root "apps\windows\Orvexa.App\Orvexa.App.csproj"
$publish=Join-Path $root "publish"
$dist=Join-Path $root "dist"
$meta=Get-Content (Join-Path $root "build\version.json") -Raw | ConvertFrom-Json
$version=$meta.version

$setupPublish=Join-Path $publish "win-x64"
$portablePublish=Join-Path $publish "portable-win-x64"
$portableBaseName="Orvexa-Portable-$version-x64"
$portableExe=Join-Path $dist "$portableBaseName.exe"
$portableZip=Join-Path $dist "$portableBaseName.zip"
$setup=Join-Path $dist "Orvexa-Setup-$version-x64.exe"

function Assert-NativeSuccess([string]$step) {
    if($LASTEXITCODE -ne 0) { throw "$step failed with exit code $LASTEXITCODE." }
}

Remove-Item $publish,$dist -Recurse -Force -ErrorAction SilentlyContinue
New-Item $setupPublish,$portablePublish,$dist -ItemType Directory -Force | Out-Null

dotnet restore $app
Assert-NativeSuccess "dotnet restore"

# Setup and ZIP use a normal unpackaged self-contained folder.
# Keeping the canonical Orvexa.App.exe name here also keeps Setup shortcuts
# and the orvexa:// protocol registration stable.
dotnet publish $app `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -o $setupPublish `
    /p:PublishSingleFile=false `
    /p:PublishTrimmed=false `
    /p:PublishReadyToRun=false `
    /p:EnableMsixTooling=true `
    /p:WindowsAppSDKSelfContained=true
Assert-NativeSuccess "dotnet folder publish"

$setupAppExe=Join-Path $setupPublish "Orvexa.App.exe"
if(-not (Test-Path $setupAppExe)) { throw "Orvexa.App.exe was not produced for Setup." }

# The Portable EXE must be published with its FINAL filename.
# Windows App SDK 1.8 single-file apps can fail during XAML startup if the
# published executable is renamed after publishing.
dotnet publish $app `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -o $portablePublish `
    /p:PortableAssemblyName=$portableBaseName `
    /p:PublishSingleFile=true `
    /p:PublishTrimmed=false `
    /p:PublishReadyToRun=false `
    /p:EnableMsixTooling=true `
    /p:IncludeNativeLibrariesForSelfExtract=true `
    /p:IncludeAllContentForSelfExtract=true `
    /p:EnableCompressionInSingleFile=true `
    /p:WindowsAppSDKSelfContained=true `
    /p:SelfContained=true
Assert-NativeSuccess "dotnet portable single-file publish"

$publishedPortableExe=Join-Path $portablePublish "$portableBaseName.exe"
if(-not (Test-Path $publishedPortableExe)) {
    throw "Portable single-file executable was not produced with its final release name."
}

$extraPortableFiles=@(
    Get-ChildItem $portablePublish -File -Recurse |
    Where-Object { $_.FullName -ne $publishedPortableExe }
)
if($extraPortableFiles.Count -gt 0) {
    throw "Portable publish produced unexpected external runtime/content files."
}

$signTool=(Get-Command signtool.exe -ErrorAction SilentlyContinue)
$thumbprint=$env:ORVEXA_SIGN_CERT_SHA1
$requireSigning=$env:ORVEXA_REQUIRE_SIGNING -eq "1"

function Sign-Artifact([string]$path) {
    if(-not $thumbprint) {
        if($requireSigning) {
            throw "Production signing is required, but ORVEXA_SIGN_CERT_SHA1 is not configured."
        }
        return
    }

    if(-not $signTool) {
        throw "signtool.exe is required when ORVEXA_SIGN_CERT_SHA1 is configured."
    }

    & $signTool.Source sign `
        /sha1 $thumbprint `
        /fd SHA256 `
        /td SHA256 `
        /tr http://timestamp.digicert.com `
        $path
    Assert-NativeSuccess "Authenticode signing"
}

Sign-Artifact $setupAppExe
Sign-Artifact $publishedPortableExe

# Copy without renaming: the publish-time name and release asset name are identical.
Copy-Item $publishedPortableExe $portableExe -Force
if(-not (Test-Path $portableExe)) { throw "Portable executable was not copied to dist." }

# ZIP remains the robust folder-based portable option.
Compress-Archive `
    -Path "$setupPublish\*" `
    -DestinationPath $portableZip `
    -CompressionLevel Optimal
if(-not (Test-Path $portableZip)) { throw "Portable archive was not produced." }

$iscc=(Get-Command ISCC.exe -ErrorAction SilentlyContinue)
if(-not $iscc) {
    throw "Inno Setup compiler (ISCC.exe) is required to build Setup.exe."
}

Push-Location "$root\installer"
try {
    & $iscc.Source "Orvexa.iss"
    Assert-NativeSuccess "Setup compiler"
}
finally {
    Pop-Location
}

if(-not (Test-Path $setup)) { throw "Setup.exe was not produced." }
Sign-Artifact $setup

$webDownloads=Join-Path $root "apps\web\downloads"
New-Item $webDownloads -ItemType Directory -Force | Out-Null
Copy-Item $setup (Join-Path $webDownloads "Orvexa-Setup-x64.exe") -Force

Copy-Item (Join-Path $root "build\version.json") (Join-Path $dist "version.json") -Force

$hashes=@($portableExe,$portableZip,$setup) |
    ForEach-Object { Get-FileHash -LiteralPath $_ -Algorithm SHA256 }
$hashes |
    ForEach-Object { "$($_.Hash)  $([IO.Path]::GetFileName($_.Path))" } |
    Set-Content (Join-Path $dist "SHA256SUMS.txt") -Encoding ascii

$hashes | Format-Table
