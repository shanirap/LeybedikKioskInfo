$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot

try {
    Write-Host "Building backend..."
    dotnet build .\server\server.csproj

    Write-Host "Running backend tests..."
    dotnet test .\tests\server.Tests\server.Tests.csproj

    Write-Host "Building frontend..."
    Push-Location .\client
    npm install
    npm run lint
    npm test
    npm run build
    Pop-Location

    Write-Host "Verification completed successfully."
}
finally {
    Pop-Location
}
