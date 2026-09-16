param([switch]$IncrementVersion)

$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $project
. (Join-Path $project ".signing.local.ps1")

$jdkCandidates = @(
    "C:\Users\jose1\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2",
    "C:\Users\jose1\AppData\Local\Temp\codex-jdk17-descubriendo\jdk",
    $env:JAVA_HOME,
    "C:\Program Files\Android\Android Studio\jbr"
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "bin\java.exe")) }

if (-not $jdkCandidates) {
    throw "No se encontró Java. Instalá JDK 17 o configurá JAVA_HOME."
}

$env:JAVA_HOME = $jdkCandidates[0]
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:NODE_ENV = "production"

$keystore = $env:DESCUBRIENDO_KEYSTORE_PATH
if (-not $keystore -or -not (Test-Path -LiteralPath $keystore)) { throw "Falta DESCUBRIENDO_KEYSTORE_PATH o no apunta a un archivo existente." }
$requiredSigningVariables = 'DESCUBRIENDO_STORE_PASSWORD', 'DESCUBRIENDO_KEY_ALIAS', 'DESCUBRIENDO_KEY_PASSWORD'
foreach ($name in $requiredSigningVariables) {
    if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Falta la variable de firma $name." }
}

$appJsonPath = Join-Path $project "app.json"
$appJsonText = Get-Content -LiteralPath $appJsonPath -Raw -Encoding UTF8
$appConfig = $appJsonText | ConvertFrom-Json
$versionCode = [int]$appConfig.expo.android.versionCode
$expectedAndroidPackage = "com.descubriendo.cr"
if ($appConfig.expo.android.package -ne $expectedAndroidPackage) {
    throw "Package Android incorrecto: $($appConfig.expo.android.package). Debe ser $expectedAndroidPackage."
}

npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "Falló TypeScript." }
npm run lint
if ($LASTEXITCODE -ne 0) { throw "Falló lint." }
npm run check:resilience
if ($LASTEXITCODE -ne 0) { throw "Falló la protección de red/Supabase." }
npm run check:categories
if ($LASTEXITCODE -ne 0) { throw "Supabase no entregó el catálogo antes de compilar." }

$adsFiles = @(
    (Join-Path $project "package.json"),
    (Join-Path $project "app.config.js"),
    (Join-Path $project "android\app\src\main\AndroidManifest.xml")
)
if (Select-String -Path $adsFiles -Pattern 'react-native-google-mobile-ads', 'com.google.android.gms.ads.APPLICATION_ID' -SimpleMatch -Quiet) {
    throw "Google Mobile Ads debe permanecer desactivado hasta configurar un App ID de producción."
}

if ($IncrementVersion) {
    $versionCode++
    $appJsonText = [regex]::Replace(
        $appJsonText,
        '"versionCode"\s*:\s*\d+',
        "`"versionCode`": $versionCode",
        1
    )
}

$manifestPath = Join-Path $project "android\app\src\main\AndroidManifest.xml"
$manifestText = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8
$manifestText = [regex]::Replace($manifestText, 'android:enableOnBackInvokedCallback="(?:true|false)"', 'android:enableOnBackInvokedCallback="false"', 1)
[IO.File]::WriteAllText($manifestPath, $manifestText, [Text.UTF8Encoding]::new($false))

$gradlePath = Join-Path $project "android\app\build.gradle"
$gradleText = Get-Content -LiteralPath $gradlePath -Raw -Encoding UTF8
if (-not $gradleText.Contains("applicationId '$expectedAndroidPackage'")) {
    throw "android/app/build.gradle no genera $expectedAndroidPackage."
}
$gradleText = [regex]::Replace($gradleText, 'versionCode\s+\d+', "versionCode $versionCode", 1)
$releaseSigning = @'
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file(System.getenv('DESCUBRIENDO_KEYSTORE_PATH'))
            storePassword System.getenv('DESCUBRIENDO_STORE_PASSWORD')
            keyAlias System.getenv('DESCUBRIENDO_KEY_ALIAS')
            keyPassword System.getenv('DESCUBRIENDO_KEY_PASSWORD')
        }
    }
'@
$gradleText = [regex]::Replace($gradleText, '(?s)    signingConfigs \{.*?\r?\n    \}\r?\n    buildTypes \{', ($releaseSigning + "`r`n    buildTypes {"), 1)
$gradleText = [regex]::Replace($gradleText, '(?s)(buildTypes\s*\{\s*debug\s*\{.*?\}\s*release\s*\{.*?signingConfig\s*=\s*)signingConfigs\.debug', '${1}signingConfigs.release', 1)
[IO.File]::WriteAllText($gradlePath, $gradleText, [Text.UTF8Encoding]::new($false))

$versionName = $appConfig.expo.version
$outputDirectory = Join-Path $project "builds"
$output = Join-Path $outputDirectory "DescubriendoCR-v$versionName-build$versionCode.aab"
$releaseAab = Join-Path $project "android\app\build\outputs\bundle\release\app-release.aab"
if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Force }
$gradleArguments = @('-p', "$project\android", 'bundleRelease', '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a', '--no-daemon', '--no-build-cache', '--console=plain')
& "$project\android\gradlew.bat" @gradleArguments
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Gradle falló; se reintentará una vez conservando los artefactos ya generados."
    & "$project\android\gradlew.bat" @gradleArguments
}
if ($LASTEXITCODE -ne 0) { throw "Falló la compilación de Gradle después del reintento." }
if (-not (Test-Path -LiteralPath $releaseAab)) { throw "Gradle terminó sin generar el AAB." }

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
Copy-Item -LiteralPath $releaseAab -Destination $output -Force

$verification = & "$env:JAVA_HOME\bin\jarsigner.exe" -verify $output 2>&1
if ($LASTEXITCODE -ne 0 -or -not ($verification -match "jar verified")) {
    throw "La firma del AAB no es válida."
}

$certificatePattern = '(?s)-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----'
$ErrorActionPreference = "Continue"
try {
    $expectedCertificate = [regex]::Match(((& "$env:JAVA_HOME\bin\keytool.exe" -exportcert -rfc -keystore $keystore -storepass $env:DESCUBRIENDO_STORE_PASSWORD -alias $env:DESCUBRIENDO_KEY_ALIAS 2>$null) -join "`n"), $certificatePattern).Value -replace '\s', ''
    $expectedCertificateExitCode = $LASTEXITCODE
    $actualCertificate = [regex]::Match(((& "$env:JAVA_HOME\bin\keytool.exe" -printcert -rfc -jarfile $output 2>$null) -join "`n"), $certificatePattern).Value -replace '\s', ''
    $actualCertificateExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = "Stop"
}
if ($expectedCertificateExitCode -ne 0 -or $actualCertificateExitCode -ne 0 -or -not $expectedCertificate -or $expectedCertificate -ne $actualCertificate) {
    throw "El AAB no está firmado con el certificado de producción esperado."
}

if ($IncrementVersion) {
    [IO.File]::WriteAllText($appJsonPath, $appJsonText, [Text.UTF8Encoding]::new($false))
}

$hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash
Write-Host ""
Write-Host "AAB generado: $output"
Write-Host "Version code: $versionCode"
Write-Host "SHA-256: $hash"
