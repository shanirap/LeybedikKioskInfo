# Backup and Restore

This project stores important production data in SQL Server and in the configured file storage. In production that storage can be either a local folder (`Storage__Provider=Local`) or an S3-compatible bucket such as MinIO (`Storage__Provider=S3`). The published app output can be rebuilt and does not need to be treated as primary data.

## What To Back Up

- SQL Server database used by `ConnectionStrings__DefaultConnection`
- Local storage folder configured by `Storage__RootPath`, when using `Storage__Provider=Local`
- MinIO/S3 bucket configured by `Storage__S3__Bucket`, when using `Storage__Provider=S3`
- Production environment variables and hosting configuration

## What Does Not Need Backup

- `publish`
- `client/node_modules`
- `client/dist`
- `server/bin`
- `server/obj`
- `tests/server.Tests/bin`
- `tests/server.Tests/obj`

These folders are generated and can be recreated from source.

## Suggested Schedule

- Daily SQL Server database backup
- Daily backup of the local storage folder or MinIO/S3 bucket
- Weekly off-machine backup for both database and storage files
- Backup production environment variables after every configuration change

## Restore Steps

1. Restore the SQL Server database backup.
2. Restore the file storage:
   - For local storage, restore the storage folder to the path configured by `Storage__RootPath`.
   - For MinIO/S3, restore the bucket contents to the bucket configured by `Storage__S3__Bucket`.
3. Configure production environment variables:
   - `ASPNETCORE_ENVIRONMENT`
   - `ConnectionStrings__DefaultConnection`
   - `Jwt__Secret`
   - `Jwt__Issuer`
   - `Jwt__Audience`
   - `Jwt__ExpiryMinutes`
   - `Storage__Provider`
   - `Storage__RootPath`
   - `Storage__S3__Endpoint`
   - `Storage__S3__Bucket`
   - `Storage__S3__AccessKey`
   - `Storage__S3__SecretKey`
   - `Storage__S3__Region`
   - `Storage__S3__ForcePathStyle`
   - `Cors__AllowedOrigins__0`, only when the frontend is hosted separately
4. Publish or copy the app build.
5. Start the app.
6. Smoke test login, upload, preview, download, and admin material management.

## Notes

No physical material files are deleted by the current soft-delete/archive flow. Archived materials remain in the database and storage folder unless a future maintenance process removes them.

For MinIO, make sure the MinIO data volume is included in server-level backups. If you use `docker-compose.production.yml`, the bucket data is stored in the `minio_data` Docker volume.
