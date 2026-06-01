$port = 3007
$logFile = "$env:TEMP\nxdev_search2.log"

Write-Host "Starting dev server on port $port..."
$proc = Start-Process -PassThru -WindowStyle Hidden -FilePath "cmd" -ArgumentList "/c npx next dev --port $port > `"$logFile`" 2>&1"

Write-Host "Waiting for server..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  if (Select-String -Path $logFile -Pattern "Ready in" -Quiet) {
    $ready = $true
    break
  }
}

if (-not $ready) {
  Write-Host "Server did not start in time"
  $proc.Kill()
  exit 1
}

Write-Host "Server ready! Testing queries..."

function Test-Query {
  param($Query, $Label)
  Write-Host "`n=== $Label ==="
  $url = "http://localhost:$port/api/movies?q=$([Uri]::EscapeDataString($Query))&limit=60"
  $result = curl.exe -s -w "`nHTTP_CODE: %{http_code}`nTIME: %{time_total}s`nSIZE: %{size_download} bytes" $url -m 30
  Write-Host $result
}

Test-Query "Tình Cảm" "Tình Cảm"
Test-Query "Bố Già" "Bố Già"
Test-Query "hanh dong" "hanh dong"
Test-Query "anime" "anime"
Test-Query "zzzzznotexist" "No results"

Write-Host "`nDone! Stopping server..."
$proc.Kill()
