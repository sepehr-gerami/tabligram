$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Applies the ONE reviewed pending migration (stage2d_money_identity_story) with safety checks.
# Put this file and db-counts.ts in the project root, stop the dev server, then run:
#   powershell -ExecutionPolicy Bypass -File .\stage2f-apply.ps1

foreach ($f in "prisma\schema.prisma", "db-counts.ts", "package.json") {
  if (-not (Test-Path $f)) { throw "missing file: $f (run from the project root)" }
}

# 1) There must be exactly one pending migration and it must be the reviewed one
$prev = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$status = (npx prisma migrate status 2>&1 | Out-String)
$ErrorActionPreference = $prev
if ($status -notmatch "not yet been applied") { Write-Host $status; throw "No pending migration found. Nothing to apply." }
$pending = @([regex]::Matches($status, "\d{14}_[A-Za-z0-9_]+") | ForEach-Object { $_.Value } | Sort-Object -Unique)
if ($pending.Count -ne 1) { Write-Host $status; throw "Expected exactly one pending migration, found $($pending.Count). Stop and send me this output." }
$name = $pending[0]
if ($name -notlike "*_stage2d_money_identity_story") { throw "The pending migration is $name, not the reviewed stage2d one. Stop and send me this output." }
Write-Host "pending migration: $name"

# 2) The SQL file itself must be intact (the terminal printout can lose spaces; the file must not have lost any)
$sqlPath = "prisma\migrations\$name\migration.sql"
$sql = Get-Content $sqlPath -Raw -Encoding utf8
if ($sql -cmatch 'FOREIGNKEY|\bFROM"|\bON"') { throw "migration.sql contains glued keywords (broken SQL). Stop and send me this output." }
if ($sql -notmatch 'UPDATE "Campaign" SET "publishTypes"') { throw "migration.sql is missing the publishTypes copy statement. Stop and send me this output." }

if (Get-Process -Name node -ErrorAction SilentlyContinue) {
  $a = Read-Host "node is running (dev server?). Stop it first. Continue anyway? (y/N)"
  if ($a -ne "y") { throw "aborted by user" }
}

# 3) Backup right before applying
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bk = ".backup-apply-$stamp"
New-Item -ItemType Directory -Path $bk | Out-Null
Copy-Item "prisma\dev.db" "$bk\dev.db"
foreach ($ext in "-wal", "-shm", "-journal") {
  if (Test-Path "prisma\dev.db$ext") { Copy-Item "prisma\dev.db$ext" "$bk\" }
}
Write-Host "backup -> $bk"
$restore = "To restore the database:  Copy-Item `"$bk\dev.db`" prisma\dev.db -Force"

# 4) Row counts before
Write-Host "`n--- counts BEFORE ---"
npx tsx .\db-counts.ts before
if ($LASTEXITCODE -ne 0) { throw "could not take the row-count snapshot; nothing was applied" }

# 5) Apply
Write-Host "`n--- applying ---"
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Write-Host $restore -ForegroundColor Yellow; throw "migrate deploy failed. Send me this output." }

# 6) Regenerate the Prisma client (can fail if another program has the engine file open)
Write-Host "`n--- prisma generate ---"
npx prisma generate
$genFailed = ($LASTEXITCODE -ne 0)
if ($genFailed) { Write-Host "prisma generate failed (a program probably has the engine file open). Close the dev server and VS Code terminals, then run:  npx prisma generate" -ForegroundColor Yellow }

# 7) Compare
Write-Host "`n--- counts AFTER and checks ---"
npx tsx .\db-counts.ts after
$afterFailed = ($LASTEXITCODE -ne 0)
if ($afterFailed) { Write-Host $restore -ForegroundColor Yellow }

# 8) Type check
Write-Host "`n--- tsc ---"
npx tsc --noEmit
Write-Host ("tsc exit code: " + $LASTEXITCODE)

Write-Host "`nDone."
if ($afterFailed) { Write-Host "The data check reported a PROBLEM. Do not continue. Send me this output." -ForegroundColor Red }
else { Write-Host "Send me the full output above." }