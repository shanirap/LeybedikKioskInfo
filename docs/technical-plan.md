# לייבעדיק Info Kiosk - Technical Plan

## System Goal

Provide an information kiosk for teachers to browse approved teaching materials and for admins to manage users, instruments, assignments, and the material approval workflow.

The user interface is branded for לייבעדיק - נגינה, שמחה, חינוך, with the institution logo served from `client/public/brand/institution-logo.svg`.

## Implemented MVP

- ASP.NET Core 8 Web API with EF Core and SQL Server LocalDB for local development.
- React + TypeScript + Vite client.
- Hebrew RTL user interface with institution branding.
- JWT login with Admin and Teacher roles.
- Teacher library for approved materials.
- Material upload workflow with file storage outside `wwwroot`.
- Admin approval and rejection flow for uploaded materials.
- Admin user management, instrument management, and teacher-instrument assignments.
- Audit log for admin actions across users, instruments, and materials.
- Basic global error handling with ProblemDetails-style responses.

## Roles

- **Admin**: full access to material review, user management, instrument management, and audit logs.
- **Teacher**: access to approved materials for assigned instruments and upload of new materials for review.

## Main Entities

- **User**: account with Admin or Teacher role.
- **Instrument**: catalog item that can be assigned to teachers.
- **UserInstrument**: teacher-to-instrument assignment.
- **Material**: uploaded file metadata with approval state and instrument ownership.
- **AuditLog**: admin action history.

## Security Rules

- A Teacher may access only approved materials whose `InstrumentId` is assigned to that teacher.
- An Admin may access all materials and management endpoints.
- JWT secrets are development-only in `appsettings.Development.json`; production must supply `Jwt:Secret` from a secure source.
- Demo seed users and materials are created only when the app runs in the Development environment.

## Local Run

Backend:

```bash
cd server
dotnet ef database update
dotnet run
```

Frontend:

```bash
cd client
npm install
copy .env.example .env.local
npm run dev
```

The default local API URL is `http://localhost:5000/api`. Configure the client with `VITE_API_BASE_URL` and server CORS with `Cors:AllowedOrigins`.

## Verification

Backend build:

```bash
cd server
dotnet build
```

Frontend build:

```bash
cd client
npm run build
```

Server tests:

```bash
dotnet test tests/server.Tests/server.Tests.csproj
```

Full local verification:

```powershell
.\verify.ps1
```
