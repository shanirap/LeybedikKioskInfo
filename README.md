# Leybedik Info Kiosk

Branded information kiosk for Leybedik. The app is built with ASP.NET Core 8 Web API (`server`) and React + TypeScript + Vite (`client`).

The institution logo is stored at `client/public/brand/institution-logo.svg` and is used by the app shell, login screen, and browser tab icon.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js LTS](https://nodejs.org/)
- SQL Server LocalDB for development, or another SQL Server instance
- Docker, if you want to use the production Docker/MinIO deployment files
- EF Core CLI, installed once per machine:

```powershell
dotnet tool install --global dotnet-ef
```

## First-Time Setup

From the repository root:

```powershell
dotnet restore .\server\server.csproj
cd .\client
npm install
copy .env.example .env.local
cd ..
dotnet ef database update --project .\server\server.csproj
```

The development connection string is in `server/appsettings.Development.json`.

## Development Run

Backend terminal:

```powershell
cd .\server
dotnet run
```

API listens on `http://localhost:5000`. Health check: `GET http://localhost:5000/api/health` returns `OK`.

Frontend terminal:

```powershell
cd .\client
npm run dev
```

Open the URL shown by Vite, usually `http://localhost:5173`.
Set `VITE_API_BASE_URL` in `client/.env.local` if the backend is not running at `http://localhost:5000/api`.

Development seed users are created automatically when the backend runs in Development:

| Email | Password | Role |
| --- | --- | --- |
| `admin@leybedik.local` | `Admin123!` | Admin |
| `teacher@leybedik.local` | `Teacher123!` | Teacher |

## Verify Everything

From the repository root:

```powershell
.\verify.ps1
```

This is the main health check for the project. It runs:

- `dotnet restore`
- backend build
- backend tests
- frontend dependency install
- frontend lint
- frontend tests
- frontend build

## Publish as One Website

To publish the React app and ASP.NET Core API together:

```powershell
.\publish.ps1
```

The script installs frontend dependencies, cleans `client/dist`, builds the React app, copies `client/dist` into `server/wwwroot`, and publishes the ASP.NET Core app into `publish`.

Run the published app locally:

```powershell
.\run-publish-local.ps1
```

The local runner sets development-safe environment variables and runs the app from the `publish` directory so `wwwroot` is found correctly.

The backend serves API routes under `/api/*` and serves the React app for browser routes such as `/teacher-library`, `/admin/users`, and `/admin/instruments`.

## Production Configuration

For production, configure these environment variables on the host. Do not store production secrets in source control.

```powershell
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=<production SQL Server connection string>
Jwt__Secret=<strong secret at least 32 characters>
Jwt__Issuer=LeybedikInfoKiosk
Jwt__Audience=LeybedikInfoKioskClient
Jwt__ExpiryMinutes=120
Storage__RootPath=<absolute path outside the app folder>
Cors__AllowedOrigins__0=<frontend origin if hosted separately>
Database__AutoMigrate=false
BootstrapAdmin__Enabled=false
BootstrapAdmin__Email=<first admin email>
BootstrapAdmin__FullName=<first admin full name>
BootstrapAdmin__Password=<strong password at least 8 characters>
```

Production startup fails fast when required settings are missing or unsafe:

- `ConnectionStrings__DefaultConnection` is required and must not use LocalDB or localhost.
- `Jwt__Secret` must be at least 32 characters and must not use the development placeholder.
- `Jwt__Issuer` and `Jwt__Audience` are required.
- `Storage__Provider` must be `Local` or `S3`.
- With `Storage__Provider=Local`, `Storage__RootPath` must be an absolute path outside the published app folder.
- With `Storage__Provider=S3`, configure `Storage__S3__Endpoint`, `Storage__S3__Bucket`, `Storage__S3__AccessKey`, and `Storage__S3__SecretKey`.
- `Cors__AllowedOrigins__0` is only needed when the frontend is hosted on a different origin from the API.
- For a single-site deployment where ASP.NET Core serves the React app from `wwwroot`, leave CORS empty.
- `Database__AutoMigrate` defaults to `false`. Apply migrations manually before pilot launch.
- `BootstrapAdmin__Enabled=true` creates the first admin only when no admin exists. Disable it after first login.

### Production Database Migration

Production does not migrate automatically unless `Database__AutoMigrate=true`.

Apply migrations manually before starting the pilot:

```powershell
dotnet ef database update --project .\server\server.csproj
```

Or:

```powershell
.\scripts\apply-database-migrations.ps1
```

See [docs/production-database-migration.md](docs/production-database-migration.md).

### First Admin Bootstrap

For the first production deployment, set:

```powershell
BootstrapAdmin__Enabled=true
BootstrapAdmin__Email=<admin email>
BootstrapAdmin__FullName=<admin full name>
BootstrapAdmin__Password=<password at least 8 characters>
```

Rules:

- Runs only outside Development.
- Runs only when enabled.
- Runs only if zero admin users exist.
- Never logs the password.

After the first successful login, set `BootstrapAdmin__Enabled=false`.

### MinIO / S3-Compatible Storage

For a remote server deployment, the recommended file storage path is S3-compatible storage through MinIO:

```powershell
Storage__Provider=S3
Storage__S3__Endpoint=http://minio:9000
Storage__S3__Bucket=leybedik-materials
Storage__S3__AccessKey=<minio access key>
Storage__S3__SecretKey=<minio secret key>
Storage__S3__Region=us-east-1
Storage__S3__ForcePathStyle=true
```

The app also supports `Storage__Provider=Local` for local development and simple single-server deployments.

## Remote Server Deployment

The repository includes a production-oriented Docker Compose setup:

- `Dockerfile` builds the React client and ASP.NET Core server into one image.
- `docker-compose.production.yml` runs the app, MinIO, Caddy, and optionally SQL Server.
- `deploy/Caddyfile` terminates HTTPS and proxies traffic to the app.
- `.env.production.example` lists the required environment variables without real secrets.

Typical server setup:

```powershell
copy .env.production.example .env.production
```

Edit `.env.production` with the real domain, connection string, JWT secret, and MinIO passwords. Then run one of:

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

If you also want the bundled SQL Server container:

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml --profile with-sqlserver up -d --build
```

Only ports `80` and `443` should be exposed publicly. SQL Server and MinIO should stay internal unless there is a specific operational reason to expose them.

## Backups

Back up these production assets:

- SQL Server database
- Local storage folder configured by `Storage__RootPath`, or the MinIO/S3 bucket configured by `Storage__S3__Bucket`
- production environment variables and server configuration

You do not need to back up `publish`, `node_modules`, `bin`, `obj`, or `client/dist` because they can be rebuilt.

See [docs/backup-and-restore.md](docs/backup-and-restore.md).
See [docs/production-database-migration.md](docs/production-database-migration.md).
See [docs/deployment-smoke-test.md](docs/deployment-smoke-test.md) before opening the system to users.

## Documentation

See [docs/technical-plan.md](docs/technical-plan.md).
See [docs/deployment-smoke-test.md](docs/deployment-smoke-test.md) for the pilot go-live checklist.
