$out = "tabligram-stage1-extra.txt"
"=== STAGE1 EXTRA $(Get-Date -Format 'yyyy-MM-dd HH:mm') ===" | Out-File $out -Encoding utf8

function Add-Section($title, $body) {
  "`n===== $title =====" | Out-File $out -Append -Encoding utf8
  $body | Out-File $out -Append -Encoding utf8
}

# 1) TypeScript
$tsc = npx tsc --noEmit 2>&1
$tscErrors = @($tsc | Select-String "error TS").Count
if ($LASTEXITCODE -ne 0 -and $tscErrors -eq 0) { Write-Host "WARNING: tsc failed to run properly" -ForegroundColor Yellow }
Add-Section "TSC (errors: $tscErrors, exit: $LASTEXITCODE)" ($tsc | Select-Object -First 150)
Write-Host "tsc errors: $tscErrors"

# 2) Tooling
Add-Section "TOOLING" @(
  "eslint config: " + ((Get-ChildItem -Name "eslint.config.*", ".eslintrc*" -ErrorAction SilentlyContinue) -join ", "),
  "test config: " + ((Get-ChildItem -Name "vitest.config.*", "jest.config.*" -ErrorAction SilentlyContinue) -join ", ")
)

# 3) File tree
$root = (Get-Location).Path + "\"
Add-Section "FILE TREE" (Get-ChildItem -Recurse -File -Path app, components, lib, types, prisma |
  ForEach-Object { $_.FullName.Replace($root, "") })

# 4) Who uses store / identity / verification
$src = Get-ChildItem -Recurse -Include *.ts, *.tsx -Path app, components, lib, types, prisma
Add-Section "USERS OF STORE/IDENTITY/VERIFICATION" ($src |
  Select-String -Pattern "lib/store|lib/identity|lib/verification|useStore" -List |
  ForEach-Object { $_.Path.Replace($root, "") })

# 5) Files I have not seen yet
$files = @(
  "components\layout\site-header.tsx", "components\layout\site-footer.tsx",
  "components\layout\panel-shell.tsx", "components\ui\input.tsx",
  "components\ui\field.tsx", "components\ui\misc.tsx",
  "components\shared\ready-gate.tsx", "components\shared\status-badge.tsx",
  "components\home\hero.tsx", "components\home\ad-banner-carousel.tsx", ".gitignore"
)
foreach ($f in $files) {
  if (Test-Path $f) { Add-Section "FILE: $f" (Get-Content $f -Raw -Encoding utf8) }
  else { Add-Section "FILE: $f" "MISSING" }
}

Write-Host "Done -> $out"