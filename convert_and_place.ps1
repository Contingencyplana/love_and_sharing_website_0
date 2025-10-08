# convert_and_place.ps1
# Converts incoming .png files to sequential JPEG pages for Harbinger Dawn storybook.
# Usage examples:
#   pwsh ./convert_and_place.ps1 .\inbox\*.png
#   pwsh ./convert_and_place.ps1 (Get-ChildItem *.png)

param (
    [Parameter(Mandatory = $false, ValueFromRemainingArguments = $true)]
    [string[]]$InputFiles
)

$dest = "C:\Users\Admin\love_and_sharing_website_0\stories\wordless\harbinger_dawn\pages"

if (-not $InputFiles -or $InputFiles.Count -eq 0) {
    Write-Host "⚠️  No input files provided. Drag PNGs onto the script or pass paths explicitly." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
}

$i = 1

foreach ($file in $InputFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "⚠️  Skipped (missing file): $file" -ForegroundColor Yellow
        continue
    }

    if ([System.IO.Path]::GetExtension($file).ToLowerInvariant() -ne ".png") {
        Write-Host "⚠️  Skipped (not PNG): $file" -ForegroundColor Yellow
        continue
    }

    $pageNum = "{0:D2}" -f $i
    $jpgPath = Join-Path $dest "page$pageNum.jpg"

    $escapedSrc = $file.Replace("'", "''")
    $escapedDest = $jpgPath.Replace("'", "''")
    $pyCommand = "from PIL import Image; Image.open(r'''$escapedSrc''').convert('RGB').save(r'''$escapedDest''', 'JPEG')"

    $pythonOutput = & python -c $pyCommand 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Host "✅ Converted: $file → $jpgPath"
        $i++
    }
    else {
        Write-Host "❌ Python error converting $file" -ForegroundColor Red
        if ($pythonOutput) {
            Write-Host $pythonOutput
        }
    }
}

if ($i -gt 1) {
    $total = $i - 1
    Write-Host "✨ Done. $total JPEG page(s) ready in $dest" -ForegroundColor Cyan
}
else {
    Write-Host "⚠️  No PNGs were converted." -ForegroundColor Yellow
}
