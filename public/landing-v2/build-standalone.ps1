$landingRoot = $PSScriptRoot
$landingHtml = [IO.File]::ReadAllText((Join-Path $landingRoot 'index.html'))
Get-ChildItem -LiteralPath (Join-Path $landingRoot 'assets') -File -Recurse | Where-Object { $_.Extension -in '.png', '.ttf' } | ForEach-Object {
    $assetRelative = $_.FullName.Substring($landingRoot.Length + 1).Replace('\', '/')
    $mimeType = if ($_.Extension -eq '.ttf') { 'font/ttf' } else { 'image/png' }
    $encodedAsset = [Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName))
    $landingHtml = $landingHtml.Replace($assetRelative, ('data:' + $mimeType + ';base64,' + $encodedAsset))
}
$fontLicense = [IO.File]::ReadAllText((Join-Path $landingRoot 'assets/fonts/OFL.txt'))
$landingHtml = $landingHtml.Replace('</head>', ('<!-- Nunito font license' + [Environment]::NewLine + $fontLicense + [Environment]::NewLine + '--></head>'))
[IO.File]::WriteAllText((Join-Path $landingRoot 'hocluc-standalone.html'), $landingHtml)
