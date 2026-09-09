param([switch]$IncrementVersion)

$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $project

$jdkCandidates = @(
    $env:JAVA_HOME,
    "C:\Users\jose1\AppData\Local\Temp\codex-jdk17-descubriendo\jdk",
    "C:\Program Files\Android\Android Studio\jbr"
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "bin\java.exe")) }

if (-not $jdkCandidates) {
    throw "No se encontró Java. Instalá JDK 17 o configurá JAVA_HOME."
}

$env:JAVA_HOME = $jdkCandidates[0]
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:NODE_ENV = "production"

$keystore = Join-Path $project "@nacho091011__descubriendo-cr.jks"
if (-not (Test-Path $keystore)) { throw "No se encontró el keystore: $keystore" }

$credentialsText = git show "3174fb5^:credentials.json" 2>$null | Out-String
if (-not $credentialsText.Trim()) { throw "No se encontraron las credenciales locales de firma." }
$credentials = $credentialsText | ConvertFrom-Json

$env:DESCUBRIENDO_KEYSTORE_PATH = $keystore
$env:DESCUBRIENDO_STORE_PASSWORD = $credentials.android.keystore.keystorePassword
$env:DESCUBRIENDO_KEY_ALIAS = $credentials.android.keystore.keyAlias
$env:DESCUBRIENDO_KEY_PASSWORD = $credentials.android.keystore.keyPassword

$appJsonPath = Join-Path $project "app.json"
$appJsonText = Get-Content -LiteralPath $appJsonPath -Raw
$appConfig = $appJsonText | ConvertFrom-Json
$versionCode = [int]$appConfig.expo.android.versionCode

if ($IncrementVersion) {
    $versionCode++
    $appJsonText = [regex]::Replace(
        $appJsonText,
        '"versionCode"\s*:\s*\d+',
        "`"versionCode`": $versionCode",
        1
    )
    [IO.File]::WriteAllText($appJsonPath, $appJsonText, [Text.UTF8Encoding]::new($false))
}

$gradlePath = Join-Path $project "android\app\build.gradle"
$gradleText = Get-Content -LiteralPath $gradlePath -Raw
$gradleText = [regex]::Replace($gradleText, 'versionCode\s+\d+', "versionCode $versionCode", 1)
[IO.File]::WriteAllText($gradlePath, $gradleText, [Text.UTF8Encoding]::new($false))

npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "Falló TypeScript." }
npm run lint
if ($LASTEXITCODE -ne 0) { throw "Falló lint." }

& "$project\android\gradlew.bat" -p "$project\android" bundleRelease --console=plain
if ($LASTEXITCODE -ne 0) { throw "Falló la compilación." }

$versionName = $appConfig.expo.version
$outputDirectory = Join-Path $project "builds"
$output = Join-Path $outputDirectory "DescubriendoCR-v$versionName-build$versionCode.aab"
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
Copy-Item -LiteralPath "$project\android\app\build\outputs\bundle\release\app-release.aab" -Destination $output -Force

$verification = & "$env:JAVA_HOME\bin\jarsigner.exe" -verify $output 2>&1
if ($LASTEXITCODE -ne 0 -or -not ($verification -match "jar verified")) {
    throw "La firma del AAB no es válida."
}

$hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash
Write-Host ""
Write-Host "AAB generado: $output"
Write-Host "Version code: $versionCode"
Write-Host "SHA-256: $hash"
