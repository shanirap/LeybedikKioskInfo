
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$clientPath = Join-Path $root "client"
$serverPath = Join-Path $root "server"
$serverProjectPath = Join-Path $serverPath "server.csproj"
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

function Clear-DirectoryContents {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,
        [string[]] $PreserveNames = @()
    )

    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
        return
    }

    Get-ChildItem -LiteralPath $Path -Force |
        Where-Object { $PreserveNames -notcontains $_.Name } |
        Remove-Item -Recurse -Force
}

function Invoke-ProductionFrontendBuild {
    param(
        [Parameter(Mandatory = $true)]
        [string] $ClientPath
    )

    $envLocalPath = Join-Path $ClientPath ".env.local"
    $envLocalBackup = Join-Path $ClientPath ".env.local.__publish_hidden"
    $hidEnvLocal = $false

    Remove-Item Env:VITE_API_BASE_URL -ErrorAction SilentlyContinue

    if (Test-Path $envLocalPath) {
        Write-Host "Temporarily excluding client/.env.local from production build..."
        Move-Item -LiteralPath $envLocalPath -Destination $envLocalBackup -Force
        $hidEnvLocal = $true
    }

    try {
        Invoke-NativeCommand { npm run build }
    }
    finally {
        if ($hidEnvLocal -and (Test-Path $envLocalBackup)) {
            Move-Item -LiteralPath $envLocalBackup -Destination $envLocalPath -Force
        }
    }
}

Push-Location $root

try {
    Write-Host "Installing frontend dependencies..."
    Push-Location $clientPath
    try {
        Invoke-NativeCommand { npm install }

        Write-Host "Building frontend..."
        Clear-DirectoryContents -Path $clientDistPath
        Invoke-ProductionFrontendBuild -ClientPath $clientPath
    }
    finally {
        Pop-Location
    }

    Write-Host "Copying frontend build to server/wwwroot..."
    Clear-DirectoryContents -Path $wwwrootPath -PreserveNames @(".gitkeep")
    Copy-Item (Join-Path $clientDistPath "*") $wwwrootPath -Recurse -Force

    Write-Host "Publishing backend..."
    $runningPublishedServers = Get-Process server -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -and $_.Path.StartsWith($publishPath, [StringComparison]::OrdinalIgnoreCase) }
    if ($runningPublishedServers) {
        throw "A published server is running from $publishPath. Stop it with Ctrl+C before publishing again."
    }

    Write-Host "Cleaning previous publish output..."
    if (Test-Path $publishPath) {
        Remove-Item $publishPath -Recurse -Force
    }

    Write-Host "Cleaning server build artifacts..."
    Invoke-NativeCommand { dotnet clean $serverProjectPath -c Release }

    Invoke-NativeCommand { dotnet publish $serverProjectPath -c Release -o $publishPath }

    Write-Host "Publish completed successfully."
    Write-Host "Output: $publishPath"
}
finally {
    Pop-Location
}
