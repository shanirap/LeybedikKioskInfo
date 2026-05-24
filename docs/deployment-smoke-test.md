# Deployment Smoke Test

Run this checklist after deploying to the remote server and before opening the system to users.

## Infrastructure

- Public domain resolves to the server.
- `https://<domain>` opens the app with a valid certificate.
- `http://<domain>` redirects to HTTPS.
- `GET https://<domain>/api/health` returns `OK`.
- SQL Server is not exposed publicly.
- MinIO API and console are not exposed publicly unless intentionally protected.

## Authentication

- Admin can sign in.
- Teacher can sign in.
- Invalid credentials show a clear error.
- Logout works and protected pages redirect to login.

## Materials

- Teacher can upload a valid PDF/image/document.
- Uploaded material appears in "החומרים שלי".
- Admin can see the pending material.
- Admin can preview the file.
- Admin can approve the material.
- Teacher can see the approved material in the library.
- Preview page `/materials/:id/preview` loads after browser refresh.
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
- Backup job or manual backup command is documented and tested.
- A small restore test has been performed in a non-production location.

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
