# Local human session paired with BE chat-live-test.ps1 -Browser -LocalHours 8.
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$manifest = [IO.Path]::GetFullPath((Join-Path $repo '..\mentor-chat-be\target\chat-live-harness\browser-ready.json'))
$started = [DateTime]::UtcNow
$previous = @{}
$original = Get-Location
try {
    $deadline = [DateTime]::UtcNow.AddMinutes(3)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ((Test-Path -LiteralPath $manifest) -and (Get-Item -LiteralPath $manifest).LastWriteTimeUtc -ge $started) { break }
        Start-Sleep -Milliseconds 250
    }
    if (-not (Test-Path -LiteralPath $manifest) -or (Get-Item -LiteralPath $manifest).LastWriteTimeUtc -lt $started) { throw 'Fresh owned backend not ready.' }
    $data = Get-Content -Raw -LiteralPath $manifest | ConvertFrom-Json
    if ($data.backend -notmatch '^http://127\.0\.0\.1:[0-9]+$') { throw 'Refusing a non-loopback backend.' }
    foreach ($name in @('CHAT_LOCAL_BACKEND', 'VITE_API_BASE_URL', 'VITE_MENTOR_CHAT_ENABLED')) {
        $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    }
    $env:CHAT_LOCAL_BACKEND = $data.backend
    $env:VITE_API_BASE_URL = 'http://127.0.0.1:5184'
    $env:VITE_MENTOR_CHAT_ENABLED = 'true'
    Set-Location $repo
    & npx.cmd vite --config vite.local.config.ts
    if ($LASTEXITCODE -ne 0) { throw 'Local frontend exited with an error.' }
} finally {
    foreach ($entry in $previous.GetEnumerator()) { [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process') }
    Set-Location $original
}
