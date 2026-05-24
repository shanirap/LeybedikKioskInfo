param(
    [string] $ConnectionString
)

$ErrorActionPreference = "Stop"

Push-Location (Split-Path -Parent $PSScriptRoot)

try {
    if ($ConnectionString) {
        $env:ConnectionStrings__DefaultConnection = $ConnectionString
        Write-Host "Using connection string from -ConnectionString parameter."
    }
    elseif (-not $env:ConnectionStrings__DefaultConnection) {
        Write-Host "Using connection string from appsettings / environment."
    }

    Write-Host "Applying EF Core migrations..."
    dotnet ef database update --project .\server\server.csproj
}
finally {
    Pop-Location
}
