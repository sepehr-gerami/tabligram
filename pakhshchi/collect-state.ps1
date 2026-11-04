$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

if (-not (Test-Path "prisma\schema.prisma")) { throw "run this from the project root (next to package.json)" }

$out = "tabligram-state.txt"
"=== TABLIGRAM STATE $(Get-Date -Format 'yyyy-MM-dd HH:mm') ===" | Out-File $out -Encoding utf8

function Add-Section($title, $body) {
  "`n===== $title =====" | Out-File $out -Append -Encoding utf8
  $body | Out-File $out -Append -Encoding utf8
}

# Database / migrations (read-only; no .env content is read)
Add-Section "PRISMA MIGRATE STATUS" (npx prisma migrate status 2>&1 | Out-String)
Add-Section "MIGRATION FOLDERS" ((Get-ChildItem prisma\migrations -Directory | Select-Object -ExpandProperty Name) -join "`n")
Add-Section "SCHEMA (prisma\schema.prisma)" (Get-Content prisma\schema.prisma -Raw -Encoding utf8)

# Types
Add-Section "TYPES (types\index.ts)" (Get-Content types\index.ts -Raw -Encoding utf8)
Add-Section "LINES WITH PublishType / story IN types\index.ts" (
  Select-String -Path types\index.ts -Pattern "PublishType|story" |
  ForEach-Object { $_.LineNumber.ToString() + ": " + $_.Line }
)

# TypeScript: the three open questions
Add-Section "TSC VERSION" (npx tsc --version 2>&1 | Out-String)
$listed = npx tsc --noEmit --listFilesOnly 2>&1
Add-Section "TSC FILE LIST (only the files that matter)" (
  $listed | Select-String -Pattern 'types[\\/]index|lib[\\/]constants|lib[\\/]data' | ForEach-Object { $_.Line }
)
$tsc = npx tsc --noEmit 2>&1
$count = @($tsc | Select-String "error TS").Count
Add-Section "TSC RESULT (errors: $count)" ($tsc | Select-Object -First 80)

# Project shape
Add-Section "LIB FILES" ((Get-ChildItem lib -File | Select-Object -ExpandProperty Name) -join "`n")
Add-Section "GIT STATUS" (git status --short 2>&1 | Out-String)
Add-Section "PACKAGE.JSON" (Get-Content package.json -Raw -Encoding utf8)

Get-Content $out -Raw -Encoding utf8 | Set-Clipboard
Write-Host "Done. The full report was copied to your clipboard - paste it into the chat."
Write-Host "(A copy is also saved in $out)"