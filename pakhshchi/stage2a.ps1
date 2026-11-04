$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "prisma\schema.prisma")) { throw "run this from the project root" }
Write-Host ("branch: " + (git rev-parse --abbrev-ref HEAD))

if (Get-Process -Name node -ErrorAction SilentlyContinue) {
  $a = Read-Host "node is running (dev server?). Stop it first. Continue anyway? (y/N)"
  if ($a -ne "y") { throw "aborted by user" }
}

# 1) backup
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bk = ".backup-stage2-$stamp"
New-Item -ItemType Directory -Path $bk | Out-Null
Copy-Item "prisma\dev.db" "$bk\dev.db"
foreach ($ext in "-wal", "-shm", "-journal") {
  if (Test-Path "prisma\dev.db$ext") { Copy-Item "prisma\dev.db$ext" "$bk\" }
}
Copy-Item "prisma\schema.prisma" "$bk\schema.prisma"
Copy-Item -Recurse "prisma\migrations" "$bk\migrations"
Write-Host "backup -> $bk"

# 2) duplicate env file (move to backup, never delete)
if (Test-Path "prisma\.env") {
  $a = (Select-String -Path ".env" -Pattern '^DATABASE_URL=').Line
  $b = (Select-String -Path "prisma\.env" -Pattern '^DATABASE_URL=').Line
  if ($a -and ($a -eq $b)) {
    Move-Item "prisma\.env" "$bk\prisma.env"
    Write-Host "moved prisma\.env into the backup folder"
  } else {
    throw "DATABASE_URL differs between .env and prisma\.env - resolve manually"
  }
}

# 3) schema: add priceStory (exists in DB, missing in schema)
$full = (Resolve-Path "prisma\schema.prisma").Path
$text = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)
if ($text -match '(?m)^\s*priceStory\s') {
  Write-Host "priceStory already in schema, skipping"
} else {
  $rx = [regex]'(?m)^[ \t]*priceReels[ \t]+Int[ \t]+@default\(0\)[ \t]*\r?$'
  $m = $rx.Matches($text)
  if ($m.Count -ne 1) { throw "expected exactly one priceReels line, found $($m.Count)" }
  $nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
  $line = "  priceStory    Int                @default(0) // deprecated: stories removed, column kept to preserve data"
  $text = $text.Insert($m[0].Index + $m[0].Length, $nl + $line)
  [System.IO.File]::WriteAllText($full, $text, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "schema updated"
}

# 4) validate + create migration WITHOUT applying
npx prisma validate
if ($LASTEXITCODE -ne 0) { throw "prisma validate failed" }
npx prisma migrate dev --create-only --name stage2_align_schema
if ($LASTEXITCODE -ne 0) { throw "migrate --create-only failed" }

$dir = Get-ChildItem "prisma\migrations" -Directory | Where-Object { $_.Name -like "*stage2_align_schema" } | Select-Object -First 1
$sql = Join-Path $dir.FullName "migration.sql"
Copy-Item $sql "$bk\migration-preview.sql"
Write-Host "`n===== GENERATED migration.sql (NOT applied) =====" -ForegroundColor Cyan
Get-Content $sql -Encoding utf8

Write-Host "`n===== GITIGNORE CHECK =====" -ForegroundColor Cyan
foreach ($p in "prisma/dev.db", $bk, "tabligram-stage1-extra.txt") {
  git check-ignore -q $p
  Write-Host ("{0} ignored: {1}" -f $p, ($LASTEXITCODE -eq 0))
}
Write-Host "`nDone. Nothing was applied to the database."