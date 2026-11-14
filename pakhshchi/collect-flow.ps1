$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Read-only. Collects the order-flow API routes that already exist in the project (campaigns, orders, publisher,
# admin/payouts, ...) plus app\admin\page.tsx, copies everything to the clipboard and saves tabligram-flow.txt.
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\collect-flow.ps1

if (-not (Test-Path -LiteralPath "app\api")) { throw "run this from the project root (app\api not found)" }

$out = "tabligram-flow.txt"
$root = (Get-Location).Path.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
$skip = '^app[\\/]api[\\/](auth|banners|files)[\\/]|^app[\\/]api[\\/]admin[\\/](banners|uploads)[\\/]'

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("=== TABLIGRAM FLOW $(Get-Date -Format 'yyyy-MM-dd HH:mm') ===")

$routes = @(Get-ChildItem -LiteralPath "app\api" -Recurse -File -Filter "route.ts" | Sort-Object FullName)
$count = 0
foreach ($f in $routes) {
  $rel = $f.FullName.Substring($root.Length)
  if ($rel -match $skip) { continue }
  $count++
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("===== FILE: $rel =====")
  [void]$sb.AppendLine((Get-Content -LiteralPath $f.FullName -Raw -Encoding utf8))
}

foreach ($extra in "app\admin\page.tsx", "app\publisher\dashboard\page.tsx", "components\home\ad-banner-carousel.tsx", "components\home\hero.tsx") {
  if (Test-Path -LiteralPath $extra) {
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("===== FILE: $extra =====")
    [void]$sb.AppendLine((Get-Content -LiteralPath $extra -Raw -Encoding utf8))
  }
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("===== LIB FILES =====")
[void]$sb.AppendLine(((Get-ChildItem -LiteralPath "lib" -File | Select-Object -ExpandProperty Name) -join "`n"))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("===== ADMIN + CAMPAIGN + PUBLISHER COMPONENT FILES =====")
foreach ($dir in "components\admin", "components\campaigns", "components\publisher") {
  if (Test-Path -LiteralPath $dir) {
    [void]$sb.AppendLine(((Get-ChildItem -LiteralPath $dir -Recurse -File | ForEach-Object { $_.FullName.Substring($root.Length) }) -join "`n"))
  }
}

$text = $sb.ToString()
[System.IO.File]::WriteAllText((Join-Path (Get-Location).Path $out), $text, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "route files collected: $count"
Write-Host ("size: {0:N0} characters" -f $text.Length)
try {
  Set-Clipboard -Value $text
  Write-Host "Copied to the clipboard - paste it into the chat. (A copy is also in $out)"
} catch {
  Write-Host "Clipboard is not available here. Open $out, select all, copy and paste it into the chat."
}