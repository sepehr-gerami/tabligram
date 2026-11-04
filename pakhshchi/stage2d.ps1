$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# This script NEVER applies a migration. It only creates one and prints it, so you can read the SQL first.
# Put this file and schema.new.txt in the project root (next to package.json), stop the dev server, then run:
#   powershell -ExecutionPolicy Bypass -File .\stage2d.ps1

# The new schema can be named schema.new.txt or schema.new.prisma; either works.
$newSchemaFile = $null
foreach ($candidate in "schema.new.txt", "schema.new.prisma") { if (Test-Path $candidate) { $newSchemaFile = $candidate; break } }
if (-not $newSchemaFile) { throw "missing schema.new.txt (or schema.new.prisma) next to this script" }
foreach ($f in "prisma\schema.prisma", "package.json") {
  if (-not (Test-Path $f)) { throw "missing file: $f (run from the project root)" }
}
Write-Host "new schema file: $newSchemaFile"

# 0) Refuse to start if the database is not clean (this is what went wrong last time)
$prev = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$status = (npx prisma migrate status 2>&1 | Out-String)
$ErrorActionPreference = $prev
if ($status -match "not yet been applied") { Write-Host $status; throw "A migration is still pending. Stop here and send me this output." }
if ($status -notmatch "up to date") { Write-Host $status; throw "The database is not reported as up to date. Stop here and send me this output." }
Write-Host "migrate status: up to date"

if (Get-Process -Name node -ErrorAction SilentlyContinue) {
  $a = Read-Host "node is running (dev server?). Stop it first. Continue anyway? (y/N)"
  if ($a -ne "y") { throw "aborted by user" }
}

# 1) Sanity checks on both schema files
$cur = Get-Content "prisma\schema.prisma" -Raw -Encoding utf8
$new = Get-Content $newSchemaFile -Raw -Encoding utf8
if ($cur -match "(?m)^model\s+(Hold|Deposit)\s") { throw "prisma\schema.prisma already contains Hold/Deposit - nothing to do. Stop and tell me." }
if ($cur -notmatch "(?m)^model\s+InstaPage\s") { throw "prisma\schema.prisma does not look like the Tabligram schema" }
foreach ($m in "User", "PublisherProfile", "InstaPage", "Campaign", "Order", "Deposit", "Hold", "Payment", "OrderProof", "Banner", "AuditLog") {
  if ($new -notmatch "(?m)^model\s+$m\s") { throw "$newSchemaFile is missing model $m" }
}

# 2) Backup (database, schema, migrations)
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bk = ".backup-stage2d-$stamp"
New-Item -ItemType Directory -Path $bk | Out-Null
Copy-Item "prisma\dev.db" "$bk\dev.db"
foreach ($ext in "-wal", "-shm", "-journal") {
  if (Test-Path "prisma\dev.db$ext") { Copy-Item "prisma\dev.db$ext" "$bk\" }
}
Copy-Item "prisma\schema.prisma" "$bk\schema.prisma"
Copy-Item -Recurse "prisma\migrations" "$bk\migrations"
Write-Host "backup -> $bk"

# 3) Swap the schema, validate, restore on failure
Copy-Item $newSchemaFile "prisma\schema.prisma" -Force
npx prisma validate
if ($LASTEXITCODE -ne 0) {
  Copy-Item "$bk\schema.prisma" "prisma\schema.prisma" -Force
  throw "prisma validate failed; the old schema was restored from the backup"
}

# 4) Create the migration WITHOUT applying it
$name = "stage2d_money_identity_story"
npx prisma migrate dev --create-only --name $name
if ($LASTEXITCODE -ne 0) {
  Copy-Item "$bk\schema.prisma" "prisma\schema.prisma" -Force
  throw "migrate --create-only failed; the old schema was restored from the backup"
}

# 5) Find the NEWEST migration with that name (the previous script printed the wrong one)
$dir = Get-ChildItem "prisma\migrations" -Directory | Where-Object { $_.Name -like "*_$name" } | Sort-Object Name -Descending | Select-Object -First 1
if (-not $dir) { throw "migration folder not found (no schema change detected?)" }
$sqlPath = Join-Path $dir.FullName "migration.sql"
$sql = Get-Content $sqlPath -Raw -Encoding utf8
if ($sql -match "This is an empty migration") { throw "the generated migration is empty; send me this output" }

# 6) Copy the legacy single publish type into the new list column (the only data statement)
if ($sql -match '"publishTypes"') {
  $extra = "`n`n-- Copy the legacy single publish type into the new list column`nUPDATE ""Campaign"" SET ""publishTypes"" = ""publishType"" WHERE ""publishTypes"" = '';`n"
  [System.IO.File]::AppendAllText($sqlPath, $extra, (New-Object System.Text.UTF8Encoding($false)))
}

Copy-Item $sqlPath "$bk\migration-preview.sql"
Write-Host "`n===== NEWEST MIGRATION: $($dir.Name) (NOT applied) =====" -ForegroundColor Cyan
Get-Content $sqlPath -Encoding utf8

Write-Host "`n===== STATEMENTS THAT CHANGE OR REMOVE EXISTING DATA/TABLES =====" -ForegroundColor Yellow
$hits = Get-Content $sqlPath -Encoding utf8 | Select-String -Pattern "^\s*(DROP|DELETE|UPDATE)\b"
if ($hits) { $hits | ForEach-Object { $_.Line } } else { Write-Host "(none)" }

Write-Host "`n===== SCHEMA DIFF SUMMARY =====" -ForegroundColor Cyan
git diff --no-index --stat "$bk\schema.prisma" "prisma\schema.prisma"

Write-Host "`nDone. NOTHING was applied to the database."
Write-Host "Send me the output above. After I confirm the SQL, you will run:  npx prisma migrate deploy   then   npx prisma generate"