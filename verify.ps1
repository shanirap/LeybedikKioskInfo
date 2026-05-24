$ErrorActionPreference = "Stop"

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock] $Command
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE`: $Command"
    }
}

Push-Location $PSScriptRoot

try {
    Write-Host "Restoring backend..."
    Invoke-NativeCommand { dotnet restore .\server\server.csproj }

    Write-Host "Building backend..."
    Invoke-NativeCommand { dotnet build .\server\server.csproj }

    Write-Host "Running backend tests..."
    Invoke-NativeCommand { dotnet test .\tests\server.Tests\server.Tests.csproj }

    Write-Host "Installing frontend dependencies..."
    Push-Location .\client
    Invoke-NativeCommand { npm install }

    Write-Host "Linting frontend..."
    Invoke-NativeCommand { npm run lint }

    Write-Host "Running frontend tests..."
    Invoke-NativeCommand { npm test }

    Write-Host "Building frontend..."
    Invoke-NativeCommand { npm run build }
    Pop-Location

    Write-Host "Verification completed successfully."
}
finally {
    Pop-Location
}
