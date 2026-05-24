# Deployment Smoke Test

Run this checklist after deploying to the remote server and before opening the system to users.

## Pre-flight

- [ ] Production environment variables configured
- [ ] Database migration applied (`dotnet ef database update --project server/server.csproj`)
- [ ] Storage path configured outside the app folder (`Storage__RootPath` for Local, or S3/MinIO settings)
- [ ] JWT secret, issuer, audience, and connection string configured
- [ ] HTTPS certificate valid on the public domain

See [production-database-migration.md](production-database-migration.md) for migration steps.

## Infrastructure

- Public domain resolves to the server.
- `https://<domain>` opens the app with a valid certificate.
- `http://<domain>` redirects to HTTPS.
- `GET https://<domain>/api/health` returns `OK`.
- SQL Server is not exposed publicly.
- MinIO API and console are not exposed publicly unless intentionally protected.

## Authentication

- [ ] First admin login works
- Admin can sign in.
- Teacher can sign in.
- Invalid credentials show a clear error.
- Logout works and protected pages redirect to login.

For the first production admin, enable bootstrap once:

```powershell
BootstrapAdmin__Enabled=true
BootstrapAdmin__Email=<admin email>
BootstrapAdmin__FullName=<admin full name>
BootstrapAdmin__Password=<strong password at least 8 chars>
```

Disable `BootstrapAdmin__Enabled` after the first successful login.

## Materials

- [ ] Upload works
- Teacher can upload a valid PDF/image/document.
- Uploaded material appears in "החומרים שלי".
- Admin can see the pending material.
- [ ] Preview works
- Admin can preview the file.
- Preview page `/materials/:id/preview` loads after browser refresh.
- [ ] Approve/reject works
- Admin can approve the material.
- Admin can reject a material when needed.
- [ ] Teacher library works
- Teacher can see the approved material in the library.
- [ ] Download works
- Download works and returns the original file.
- Teacher cannot like material they uploaded.
- Teacher can like another teacher's approved material only once.

## Admin

- Admin can create/edit users.
- Admin can assign instruments to a teacher.
- Admin safeguards still work: no self-deactivation and no removal of the last active admin.
- Audit log shows recent admin actions.

## Storage And Backup

- New uploads appear in the configured storage backend.
- With MinIO, the object appears in the configured bucket.
- [ ] Backup configured
- Backup job or manual backup command is documented and tested.
- [ ] Restore tested once
- A small restore test has been performed in a non-production location.

See [backup-and-restore.md](backup-and-restore.md).

## Browser Routes

Refresh these routes directly in the browser:

- `/teacher-library`
- `/upload-material`
- `/my-uploads`
- `/account`
- `/materials/1/preview` using a real material id
- `/admin/users`
- `/admin/instruments`
- `/admin/pending-materials`
- `/admin/audit-logs`
