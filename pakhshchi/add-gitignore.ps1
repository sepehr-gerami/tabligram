$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Appends only the lines that are missing from .gitignore. Nothing else in the file is touched.
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\add-gitignore.ps1

$path = ".gitignore"
$wanted = @(".backup-*/", "tabligram-*.txt", "audit.txt", "pakhshchi-dump.txt")

$existing = @()
$raw = ""
if (Test-Path $path) {
  $existing = @(Get-Content $path -Encoding utf8)
  $raw = [System.IO.File]::ReadAllText((Resolve-Path $path).Path)
}

$missing = @($wanted | Where-Object { $existing -notcontains $_ })

if ($missing.Count -eq 0) {
  Write-Host "Nothing to add: all lines are already in .gitignore"
} else {
  $nl = if ($raw.Contains("`r`n")) { "`r`n" } else { "`n" }
  $prefix = if ($raw.Length -gt 0 -and -not $raw.EndsWith("`n")) { $nl } else { "" }
  $block = $prefix + $nl + "# Tabligram: local backups and generated reports" + $nl + ($missing -join $nl) + $nl
  $full = Join-Path (Get-Location).Path $path
  [System.IO.File]::AppendAllText($full, $block, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Added to .gitignore:"
  foreach ($m in $missing) { Write-Host "  $m" }
}

Write-Host "`nChecking what git ignores now:"
$samples = @()
$samples += Get-ChildItem -Directory -Force -Filter ".backup-*" | ForEach-Object { $_.Name + "/" }
$samples += Get-ChildItem -File -Force -Filter "tabligram-*.txt" | ForEach-Object { $_.Name }
foreach ($f in "audit.txt", "pakhshchi-dump.txt") { if (Test-Path $f) { $samples += $f } }
foreach ($s in $samples) {
  git check-ignore -q $s
  Write-Host ("{0}  ignored: {1}" -f $s, ($LASTEXITCODE -eq 0))
}
Write-Host "`nDone. Run  git status --short  to see the result (the backup folders should no longer be listed)."