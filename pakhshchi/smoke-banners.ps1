param([string]$BaseUrl = "http://localhost:3000")

$ErrorActionPreference = "Stop"
$origin = $BaseUrl
$pass = 0
$failed = 0
$cookieFile = "cookies.txt"
if (Test-Path $cookieFile) { Remove-Item $cookieFile -Force }

function Check($name, $ok, $detail) {
  if ($ok) { Write-Host "PASS  $name" -ForegroundColor Green; $script:pass++ }
  else { Write-Host "FAIL  $name  -> $detail" -ForegroundColor Red; $script:failed++ }
}

# تابع امن برای ارسال JSON (با استفاده از فایل موقت برای جلوگیری از باگ پاورشل)
function CallJson($method, $path, $jsonObj) {
  $tmpFile = [System.IO.Path]::GetTempFileName()
  $jsonStr = $jsonObj | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText($tmpFile, $jsonStr, [System.Text.Encoding]::UTF8)
  
  $res = curl.exe -s -w "__HTTP_STATUS__%{http_code}" -X $method "$BaseUrl$path" -H "Origin: $origin" -H "Content-Type: application/json; charset=utf-8" -d "@$tmpFile" -b $cookieFile -c $cookieFile
  
  Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
  
  $status = ($res -split "__HTTP_STATUS__")[-1]
  $content = ($res -split "__HTTP_STATUS__")[0]
  return @{ Status = $status; Body = $content }
}

# 0) Server check
$ping = curl.exe -s -o NUL -w "%{http_code}" -X GET "$BaseUrl/api/banners"
Check "server answers GET /api/banners" ($ping -eq "200") "status $ping"

# 1) Logged-out checks
$noAuth = CallJson "POST" "/api/admin/banners" @{title="x"; link="/"}
Check "logged-out POST /api/admin/banners is refused (401)" ($noAuth.Status -eq "401") "status $($noAuth.Status)"

$noAuthList = curl.exe -s -o NUL -w "%{http_code}" -X GET "$BaseUrl/api/admin/banners"
Check "logged-out GET /api/admin/banners is refused (401)" ($noAuthList -eq "401") "status $noAuthList"

# 2) Login
$mobile = Read-Host "Admin mobile number"
$sec = Read-Host "Admin password" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
$pw = $pw.Trim()

$login = CallJson "POST" "/api/auth/login" @{mobile=$mobile; password=$pw}
$pw = $null
Check "admin login works" ($login.Status -eq "200" -and $login.Body -match '"isAdmin":true') "status $($login.Status) body $($login.Body)"
if ($login.Status -ne "200" -or $login.Body -notmatch '"isAdmin":true') { throw "login failed or this account is not an admin" }

# 3) CSRF
$evil = curl.exe -s -o NUL -w "%{http_code}" -X POST "$BaseUrl/api/admin/banners" -H "Origin: https://evil.example" -H "Content-Type: application/json" -d '{"title":"csrf test","link":"/"}' -b $cookieFile
Check "request from another origin is refused (403)" ($evil -eq "403") "status $evil"

# 4) Uploads
$fakeImage = "fake.png"
Set-Content -Path $fakeImage -Value "<html><script>alert(1)</script></html>" -Encoding UTF8
$bad = curl.exe -s -o NUL -w "%{http_code}" -X POST "$BaseUrl/api/admin/uploads?kind=banner" -H "Origin: $origin" -H "Content-Type: image/png" --data-binary "@$fakeImage" -b $cookieFile
Check "fake image (HTML sent as image/png) is refused (400)" ($bad -eq "400") "status $bad"

$pngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
$realPng = "real.png"
[IO.File]::WriteAllBytes((Resolve-Path .).Path + "\$realPng", [Convert]::FromBase64String($pngB64))
$upBody = curl.exe -s -w "__HTTP_STATUS__%{http_code}" -X POST "$BaseUrl/api/admin/uploads?kind=banner" -H "Origin: $origin" -H "Content-Type: image/png" --data-binary "@$realPng" -b $cookieFile
$upStatus = ($upBody -split "__HTTP_STATUS__")[-1]
$upContent = ($upBody -split "__HTTP_STATUS__")[0]
Check "real PNG upload works (201)" ($upStatus -eq "201") "status $upStatus body $upContent"
$imageUrl = $null
if ($upStatus -eq "201") { $imageUrl = ($upContent | ConvertFrom-Json).url }

if ($imageUrl) {
    $file = curl.exe -s -o NUL -w "%{http_code} %{content_type}" -X GET "$BaseUrl$imageUrl"
  Check "the uploaded image is served publicly as image/png" ($file -match "^200 image/png") "status $file"
}
$traversal = curl.exe -s -o NUL -w "%{http_code}" -X GET "$BaseUrl/api/files/banners/..%2F..%2Fpackage.json"
Check "path traversal on the file route is refused (404)" ($traversal -eq "404") "status $traversal"

# 5) Banner CRUD
$badBanner = CallJson "POST" "/api/admin/banners" @{title="Smoke test banner"; link="javascript:alert(1)"}
Check "banner with a javascript: link is refused (400)" ($badBanner.Status -eq "400") "status $($badBanner.Status)"

$payload = @{ title = "Smoke test banner"; link = "/campaigns/new"; placement = "HERO"; sortOrder = 9000; isActive = $true }
if ($imageUrl) { $payload.desktopImage = $imageUrl }
$create = CallJson "POST" "/api/admin/banners" $payload
Check "admin can create a banner (201)" ($create.Status -eq "201") "status $($create.Status) body $($create.Body)"
if ($create.Status -ne "201") { throw "cannot continue without the created banner" }
$id = ($create.Body | ConvertFrom-Json).id

$pub = curl.exe -s -X GET "$BaseUrl/api/banners?placement=HERO"
Check "the active banner shows in the public list" ($pub -match $id) "not found in public list"
Check "the public list hides internal fields (createdById, isActive)" (($pub -notmatch "createdById") -and ($pub -notmatch "isActive")) "internal fields leaked"

$off = CallJson "PATCH" "/api/admin/banners/$id" @{isActive=$false}
Check "admin can deactivate it (200)" ($off.Status -eq "200") "status $($off.Status) body $($off.Body)"
$pub2 = curl.exe -s -X GET "$BaseUrl/api/banners?placement=HERO"
Check "the deactivated banner disappears from the public list" ($pub2 -notmatch $id) "still listed"

$badWindow = CallJson "PATCH" "/api/admin/banners/$id" @{startsAt="2026-12-20T00:00:00.000Z"; endsAt="2026-12-10T00:00:00.000Z"}
Check "end-before-start schedule is refused (400)" ($badWindow.Status -eq "400") "status $($badWindow.Status)"

$del = curl.exe -s -o NUL -w "%{http_code}" -X DELETE "$BaseUrl/api/admin/banners/$id" -H "Origin: $origin" -b $cookieFile
Check "admin can delete it (200)" ($del -eq "200") "status $del"
$again = curl.exe -s -o NUL -w "%{http_code}" -X DELETE "$BaseUrl/api/admin/banners/$id" -H "Origin: $origin" -b $cookieFile
Check "deleting it twice gives 404" ($again -eq "404") "status $again"

if ($imageUrl) {
   $gone = curl.exe -s -o NUL -w "%{http_code}" -X GET "$BaseUrl$imageUrl"
  Check "the unused image file was cleaned up (404)" ($gone -eq "404") "status $gone"
}

# 6) Admin page redirect
$page = curl.exe -s -o NUL -w "%{http_code}" -X GET "$BaseUrl/admin" --max-redirs 0
Check "logged-out visitor is redirected away from /admin" ($page -match "^30[0-9]") "status $page"

# Cleanup temp files
Remove-Item $fakeImage -ErrorAction SilentlyContinue
Remove-Item $realPng -ErrorAction SilentlyContinue
Remove-Item $cookieFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Passed: $pass   Failed: $failed"
if ($failed -eq 0) { Write-Host "RESULT: OK" -ForegroundColor Green } else { Write-Host "RESULT: PROBLEM - send me this output" -ForegroundColor Red }