$landingRoot = $PSScriptRoot
$landingHtml = [IO.File]::ReadAllText((Join-Path $landingRoot 'index.html'))
$publicRoot = Split-Path $landingRoot -Parent
$logoScript = [IO.File]::ReadAllText((Join-Path $publicRoot 'hocluc-logo.js'))
$landingHtml = $landingHtml.Replace('<script src="/hocluc-logo.js"></script>', ('<script>' + [Environment]::NewLine + $logoScript + [Environment]::NewLine + '</script>'))
$favicon = [IO.File]::ReadAllBytes((Join-Path $publicRoot 'hocluc-favicon.svg'))
$faviconData = [Convert]::ToBase64String($favicon)
$landingHtml = $landingHtml.Replace('href="/hocluc-favicon.svg"', ('href="data:image/svg+xml;base64,' + $faviconData + '"'))
Get-ChildItem -LiteralPath (Join-Path $landingRoot 'assets') -File -Recurse | Where-Object { $_.Extension -in '.png', '.webp', '.ttf' } | ForEach-Object {
    $assetRelative = $_.FullName.Substring($landingRoot.Length + 1).Replace('\', '/')
    $mimeType = switch ($_.Extension.ToLowerInvariant()) {
        '.ttf' { 'font/ttf' }
        '.webp' { 'image/webp' }
        default { 'image/png' }
    }
    $encodedAsset = [Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName))
    $landingHtml = $landingHtml.Replace($assetRelative, ('data:' + $mimeType + ';base64,' + $encodedAsset))
}
$fontLicense = [IO.File]::ReadAllText((Join-Path $landingRoot 'assets/fonts/OFL.txt'))
$fontLicense = [regex]::Replace($fontLicense, '[\t ]+(?=\r?$)', '', [System.Text.RegularExpressions.RegexOptions]::Multiline)
$landingHtml = $landingHtml.Replace('</head>', ('<!-- Nunito font license' + [Environment]::NewLine + $fontLicense + [Environment]::NewLine + '--></head>'))
[IO.File]::WriteAllText((Join-Path $landingRoot 'hocluc-standalone.html'), $landingHtml)
