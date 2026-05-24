# Production Database Migration

Production does **not** apply EF Core migrations automatically unless you explicitly enable it.

## Default behavior

- **Development**: migrations run automatically on startup, then demo data is seeded.
- **Production / Testing**: migrations do **not** run unless `Database__AutoMigrate=true`.

For a pilot deployment, apply migrations manually before starting the app.

## Prerequisites

Install the EF Core CLI once:

```powershell
dotnet tool install --global dotnet-ef
```

Ensure `ConnectionStrings__DefaultConnection` points to the production SQL Server database.

## Apply migrations manually

From the repository root:

```powershell
dotnet ef database update --project .\server\server.csproj
```

Or use the helper script:

```powershell
.\scripts\apply-database-migrations.ps1
```

Optional: pass a connection string for a one-off run:

```powershell
.\scripts\apply-database-migrations.ps1 -ConnectionString "Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True"
```

## Optional automatic migration on startup

Only use this when you intentionally want the app to migrate itself on boot:

```powershell
Database__AutoMigrate=true
```

Keep this `false` for normal pilot/production deployments unless your deployment process depends on it.

## Verify

After migration:

1. Confirm the app starts without database errors.
2. Sign in with the first admin account.
3. Run the checklist in [deployment-smoke-test.md](deployment-smoke-test.md).
