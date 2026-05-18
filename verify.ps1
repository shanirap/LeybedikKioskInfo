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
    Write-Host "Building backend..."
    Invoke-NativeCommand { dotnet build .\server\server.csproj }

    Write-Host "Running backend tests..."
    Invoke-NativeCommand { dotnet test .\tests\server.Tests\server.Tests.csproj }

    Write-Host "Building frontend..."
    Push-Location .\client
    Invoke-NativeCommand { npm install }
    Invoke-NativeCommand { npm run lint }
    Invoke-NativeCommand { npm test }
    Invoke-NativeCommand { npm run build }
    Pop-Location

    Write-Host "Verification completed successfully."
}
finally {
    Pop-Location
}
