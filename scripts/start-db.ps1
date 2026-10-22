# Starts the local PostgreSQL used for development (portable binaries in .pg\pgsql).
# First run also creates the data folder, the 'commission' login and the 'sales_commission' database.
# Matches the connection string in backend\src\SalesCommission.Api\appsettings.Development.json.
param([int]$Port = 5433)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root '.pg\pgsql\bin'
$data = Join-Path $root '.pg\data'
$log = Join-Path $root '.pg\postgres.log'

if (-not (Test-Path (Join-Path $bin 'pg_ctl.exe'))) {
    throw "PostgreSQL binaries not found in $bin. Extract the portable zip so that .pg\pgsql\bin\pg_ctl.exe exists."
}

if (-not (Test-Path (Join-Path $data 'PG_VERSION'))) {
    $pwFile = Join-Path $env:TEMP 'sc-pg-superuser.pw'
    Set-Content -Path $pwFile -Value ([guid]::NewGuid().ToString('N')) -NoNewline
    & (Join-Path $bin 'initdb.exe') -D $data -U postgres -A scram-sha-256 --pwfile=$pwFile -E UTF8 --locale=C
    Remove-Item $pwFile -Force
    if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
    $firstRun = $true
}

& (Join-Path $bin 'pg_ctl.exe') status -D $data *> $null
if ($LASTEXITCODE -ne 0) {
    & (Join-Path $bin 'pg_ctl.exe') start -D $data -l $log -o "-p $Port" -w
    if ($LASTEXITCODE -ne 0) { throw "pg_ctl start failed, see $log" }
}

if ($firstRun) {
    # The superuser password is random and discarded; use the local socket-less 'trust' override just for setup.
    $hba = Join-Path $data 'pg_hba.conf'
    $original = Get-Content $hba -Raw
    Set-Content $hba ($original -replace 'scram-sha-256', 'trust')
    & (Join-Path $bin 'pg_ctl.exe') reload -D $data | Out-Null
    $psql = Join-Path $bin 'psql.exe'
    & $psql -h localhost -p $Port -U postgres -c "CREATE ROLE commission LOGIN PASSWORD 'commission_dev' CREATEDB;"
    & $psql -h localhost -p $Port -U postgres -c "CREATE DATABASE sales_commission OWNER commission ENCODING 'UTF8' TEMPLATE template0;"
    Set-Content $hba $original
    & (Join-Path $bin 'pg_ctl.exe') reload -D $data | Out-Null
}

Write-Host "PostgreSQL is running on localhost:$Port (database sales_commission, user commission)."
