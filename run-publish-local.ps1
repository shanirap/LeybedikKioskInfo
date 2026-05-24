$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$publishPath = Join-Path $root "publish"
$serverExePath = Join-Path $publishPath "server.exe"

if (-not (Test-Path $serverExePath)) {
    throw "Published server was not found. Run .\publish.ps1 first."
}

if (-not $env:ASPNETCORE_ENVIRONMENT) {
    $env:ASPNETCORE_ENVIRONMENT = "Development"
}

if (-not $env:Jwt__Secret) {
    $env:Jwt__Secret = "local-publish-secret-key-at-least-32-chars"
}

if (-not $env:Jwt__Issuer) {
    $env:Jwt__Issuer = "LeybedikInfoKiosk"
}

if (-not $env:Jwt__Audience) {
    $env:Jwt__Audience = "LeybedikInfoKioskClient"
}

if (-not $env:Jwt__ExpiryMinutes) {
    $env:Jwt__ExpiryMinutes = "120"
}

if (-not $env:ConnectionStrings__DefaultConnection) {
    $env:ConnectionStrings__DefaultConnection = "Server=(localdb)\MSSQLLocalDB;Database=LeybedikInfoKioskDb;Trusted_Connection=True;TrustServerCertificate=True;"
}

Push-Location $publishPath

try {
    Write-Host "Running published app from $publishPath"
    Write-Host "Open http://localhost:5000"
    .\server.exe
}
finally {
    Pop-Location
}
