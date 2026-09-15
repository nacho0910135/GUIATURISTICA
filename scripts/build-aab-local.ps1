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
$appJsonText = Get-Content -LiteralPath $appJsonPath -Raw -Encoding UTF8
$appConfig = $appJsonText | ConvertFrom-Json
$versionCode = [int]$appConfig.expo.android.versionCode

npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "Falló TypeScript." }
npm run lint
if ($LASTEXITCODE -ne 0) { throw "Falló lint." }

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
$manifestText = [regex]::Replace($manifestText, 'android:enableOnBackInvokedCallback="(?:true|false)"', 'android:enableOnBackInvokedCallback="true"', 1)
[IO.File]::WriteAllText($manifestPath, $manifestText, [Text.UTF8Encoding]::new($false))

$gradlePath = Join-Path $project "android\app\build.gradle"
$gradleText = Get-Content -LiteralPath $gradlePath -Raw -Encoding UTF8
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

# dexBuilderRelease can leave incomplete desugar/CMake state after an interrupted
# Windows build. Remove only the app's generated directories: Gradle's `clean`
# task also invokes CMake clean and can fail when codegen folders no longer exist.
$generatedDirectories = @(
    (Join-Path $project "android\app\build"),
    (Join-Path $project "android\app\.cxx")
)
$androidAppRoot = [IO.Path]::GetFullPath((Join-Path $project "android\app")) + [IO.Path]::DirectorySeparatorChar
foreach ($directory in $generatedDirectories) {
    $resolvedDirectory = [IO.Path]::GetFullPath($directory)
    if (-not $resolvedDirectory.StartsWith($androidAppRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Ruta generada fuera de android/app: $resolvedDirectory"
    }
    if (Test-Path -LiteralPath $resolvedDirectory) {
        Remove-Item -LiteralPath $resolvedDirectory -Recurse -Force
    }
}

$releaseAab = Join-Path $project "android\app\build\outputs\bundle\release\app-release.aab"
& "$project\android\gradlew.bat" -p "$project\android" bundleRelease --no-daemon --no-build-cache --console=plain
if ($LASTEXITCODE -ne 0 -and -not (Test-Path -LiteralPath $releaseAab)) { throw "Falló la compilación." }
if ($LASTEXITCODE -ne 0) { Write-Warning "Gradle perdió conexión con el daemon después de generar el AAB; se continuará con la verificación del artefacto." }

$versionName = $appConfig.expo.version
$outputDirectory = Join-Path $project "builds"
$output = Join-Path $outputDirectory "DescubriendoCR-v$versionName-build$versionCode.aab"
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
