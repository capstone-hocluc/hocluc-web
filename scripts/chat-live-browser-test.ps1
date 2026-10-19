# Pair with BE scripts/chat-live-test.ps1 -Browser. Real API only, fresh owned server/manifest.
$ErrorActionPreference = 'Stop'
$result = 1
$original = Get-Location
$previousManifest = $env:CHAT_LIVE_MANIFEST
$ready = $false
$repo = Split-Path -Parent $PSScriptRoot
$manifest = [IO.Path]::GetFullPath((Join-Path $repo '..\mentor-chat-be\target\chat-live-harness\browser-ready.json'))
$started = [DateTime]::UtcNow
try {
    Set-Location $repo
    $deadline = [DateTime]::UtcNow.AddMinutes(3)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ((Test-Path -LiteralPath $manifest) -and (Get-Item -LiteralPath $manifest).LastWriteTimeUtc -ge $started) { $ready = $true; break }
        Start-Sleep -Milliseconds 250
    }
    if (-not $ready) { throw 'Fresh owned browser backend manifest was not published within 3 minutes.' }
    $data = Get-Content -Raw -LiteralPath $manifest | ConvertFrom-Json
    if ($data.backend -notmatch '^http://127\.0\.0\.1:[0-9]+$') { throw 'Refusing non-loopback backend.' }
    $env:CHAT_LIVE_MANIFEST = $manifest
    & npx.cmd tsc --noEmit -p tsconfig.e2e.json
    if ($LASTEXITCODE -ne 0) { throw 'Live E2E typecheck failed.' }
    & npx.cmd playwright test --config playwright.live.config.ts
    $result = $LASTEXITCODE
} catch {
    Write-Error $_ -ErrorAction Continue; $result = 1
} finally {
    # Keeper release is cleanup coordination only, never a claim that browser assertions passed.
    if ($ready) { Set-Content -LiteralPath (Join-Path (Split-Path -Parent $manifest) 'browser-done.marker') -Value 'browser-run-ended' -Encoding ascii }
    $env:CHAT_LIVE_MANIFEST = $previousManifest
    Set-Location $original
}
exit $result
