# Sales Commission

Commission calculation for the outdoor sales staff of Hanuman Beverages. Angular 22 frontend, .NET 10 API, PostgreSQL.
Scope and decisions: [docs/01-plan-and-scoping.md](docs/01-plan-and-scoping.md).

Status: Milestone 1 (core demo with mock data) – plans, monthly calculation, dashboard, results with
full breakdown, rep mobile view, role-based access. Plans/employees are read-only in the UI for now.

## Run it locally

Needs the .NET 10 SDK and Node.js. Run each command from the repository root, in its own terminal.

1. Database (portable PostgreSQL in `.pg`, port 5433; first run creates the database and login):

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\start-db.ps1
   ```

   The portable binaries are not in git. Extract the PostgreSQL 17 Windows binaries zip so that
   `.pg\pgsql\bin\pg_ctl.exe` exists. With Docker available, `docker compose up -d` also works (port 5433).

2. API (applies the migration and seeds mock data on first start, takes a minute or two):

   ```powershell
   dotnet run --project backend/src/SalesCommission.Api --launch-profile http
   ```

3. Frontend:

   ```powershell
   npm --prefix frontend start
   ```

Open http://localhost:4200. Demo logins (`admin`, `finance`, `manager`, `supervisor`, `rep` at `@hanuman.local`)
share the password in `backend/src/SalesCommission.Api/appsettings.Development.json` (`Seed:DevPassword`).
Choose a period in the header; Admin/Finance press **Calculate** on the dashboard.

To reseed from scratch, drop the schema (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`) and restart the API.

## Tests

```powershell
dotnet test backend
npm --prefix frontend test -- --watch=false
```
