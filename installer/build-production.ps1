$ErrorActionPreference="Stop"

$root=Resolve-Path "$PSScriptRoot\.."
$app=Join-Path $root "apps\windows\Orvexa.App\Orvexa.App.csproj"
$publish=Join-Path $root "publish"
$dist=Join-Path $root "dist"
$portable=Join-Path $dist "Orvexa-Portable-0.0.5-x64.zip"
$setup=Join-Path $dist "Orvexa-Setup-0.0.5-x64.exe"

function Assert-NativeSuccess([string]$step) {
    if($LASTEXITCODE -ne 0) { throw "$step failed with exit code $LASTEXITCODE." }
}

Remove-Item $publish,$dist -Recurse -Force -ErrorAction SilentlyContinue
New-Item $publish,$dist -ItemType Directory -Force | Out-Null

dotnet restore $app
Assert-NativeSuccess "dotnet restore"

dotnet publish $app `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -o "$publish\win-x64" `
    /p:PublishSingleFile=false `
    /p:WindowsAppSDKSelfContained=true
Assert-NativeSuccess "dotnet publish"

$appExe=Join-Path $publish "win-x64\Orvexa.App.exe"
if(-not (Test-Path $appExe)) { throw "Orvexa.App.exe was not produced." }

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

Sign-Artifact $appExe

Compress-Archive `
    -Path "$publish\win-x64\*" `
    -DestinationPath $portable `
    -CompressionLevel Optimal

if(-not (Test-Path $portable)) { throw "Portable archive was not produced." }

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

$hashes=@($portable,$setup) | ForEach-Object { Get-FileHash -LiteralPath $_ -Algorithm SHA256 }
$hashes |
    ForEach-Object { "$($_.Hash)  $([IO.Path]::GetFileName($_.Path))" } |
    Set-Content (Join-Path $dist "SHA256SUMS.txt") -Encoding ascii

$hashes | Format-Table