$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$clientPath = Join-Path $root "client"
$serverPath = Join-Path $root "server"
$clientDistPath = Join-Path $clientPath "dist"
$wwwrootPath = Join-Path $serverPath "wwwroot"
$publishPath = Join-Path $root "publish"

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

Push-Location $root

try {
    Write-Host "Installing frontend dependencies..."
    Push-Location $clientPath
    Invoke-NativeCommand { npm install }

    Write-Host "Building frontend..."
    if (Test-Path $clientDistPath) {
        Remove-Item $clientDistPath -Recurse -Force
    }
    Invoke-NativeCommand { npm run build }
    Pop-Location

    Write-Host "Copying frontend build to server/wwwroot..."
    if (Test-Path $wwwrootPath) {
        Remove-Item $wwwrootPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $wwwrootPath | Out-Null
    Copy-Item (Join-Path $clientDistPath "*") $wwwrootPath -Recurse -Force

    Write-Host "Publishing backend..."
    $runningPublishedServers = Get-Process server -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -and $_.Path.StartsWith($publishPath, [StringComparison]::OrdinalIgnoreCase) }
    if ($runningPublishedServers) {
        throw "A published server is running from $publishPath. Stop it with Ctrl+C before publishing again."
    }

    if (Test-Path $publishPath) {
        Remove-Item $publishPath -Recurse -Force
    }
    Invoke-NativeCommand { dotnet publish (Join-Path $serverPath "server.csproj") -c Release -o $publishPath }

    Write-Host "Publish completed successfully."
    Write-Host "Output: $publishPath"
}
finally {
    Pop-Location
}
