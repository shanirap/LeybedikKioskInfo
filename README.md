# לייבעדיק Info Kiosk

Branded information kiosk for לייבעדיק - נגינה, שמחה, חינוך.
Built with ASP.NET Core 8 Web API (`server`) and React + TypeScript + Vite (`client`).

The institution logo is stored at `client/public/brand/institution-logo.svg` and is used by the app shell, login screen, and browser tab icon.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (LTS recommended)

## Run the backend

```bash
cd server
dotnet run
```

API listens on `http://localhost:5000`. Health check: `GET http://localhost:5000/api/health` → `OK`.

### Database (EF Core)

From `server`, apply migrations to LocalDB (connection string in `appsettings.Development.json`):

```bash
cd server
dotnet ef database update
```

Requires the EF CLI tool: `dotnet tool install --global dotnet-ef` (once per machine).

### Development seed users (local only)

Plaintext passwords are for local development until login is implemented. Hashes in the database use `PasswordHasher` (ASP.NET Core Identity algorithm).

| Email | Password | Role |
| --- | --- | --- |
| admin@leybedik.local | Admin123! | Admin |
| teacher@leybedik.local | Teacher123! | Teacher |

## Run the frontend

```bash
cd client
npm install
copy .env.example .env.local
npm run dev
```

Then open the URL shown in the terminal (typically `http://localhost:5173`).
Set `VITE_API_BASE_URL` in `.env.local` if the backend is not running at `http://localhost:5000/api`.

## Build (CI-style)

Backend:

```bash
cd server
dotnet build
```

Frontend:

```bash
cd client
npm install
npm run build
```

## Publish as One Website

To publish the React app and ASP.NET Core API together, run this from the repository root:

```powershell
.\publish.ps1
```

The script:

- installs frontend dependencies with `npm install`
- builds the React app
- copies `client/dist` into `server/wwwroot`
- publishes the ASP.NET Core app to `publish`

Run the published app:

```powershell
.\publish\server.exe
```

The backend serves API routes under `/api/*` and serves the React app for browser routes.

## Verify Everything

From the repository root:

```powershell
.\verify.ps1
```

This runs backend build, backend tests, frontend lint, frontend tests, and frontend build.

## Documentation

See [docs/technical-plan.md](docs/technical-plan.md).
