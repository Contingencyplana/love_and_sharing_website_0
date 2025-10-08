# convert_and_place.ps1
# Converts incoming .png files to sequential JPEG pages for Harbinger Dawn storybook.
# Usage examples:
#   pwsh ./convert_and_place.ps1 .\inbox\*.png
#   pwsh ./convert_and_place.ps1 (Get-ChildItem *.png)

[CmdletBinding()]
param (
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$InputFiles
)

$dest = "C:\Users\Admin\love_and_sharing_website_0\stories\wordless\harbinger_dawn\pages"

if (-not $InputFiles -or $InputFiles.Count -eq 0) {
    Write-Warning "No input files provided. Supply PNG paths or drag them onto the script."
    return
}

if (-not (Test-Path -LiteralPath $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

$index = 1
$converted = 0

foreach ($file in $InputFiles) {
    if (-not (Test-Path -LiteralPath $file)) {
        Write-Warning "Skipped (missing file): $file"
        continue
    }

    if ([System.IO.Path]::GetExtension($file).ToLowerInvariant() -ne ".png") {
        Write-Warning "Skipped (not PNG): $file"
        continue
    }

    $pageId = "{0:D2}" -f $index
    $jpgPath = Join-Path -Path $dest -ChildPath "page$pageId.jpg"

    $escapedSrc = $file.Replace("'", "''")
    $escapedDest = $jpgPath.Replace("'", "''")
    $pythonCode = "from PIL import Image; Image.open(r'''$escapedSrc''').convert('RGB').save(r'''$escapedDest''', 'JPEG')"

    $pythonOutput = & python -c $pythonCode 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Information "Converted: $file -> $jpgPath" -InformationAction Continue
        $index++
        $converted++
    }
    else {
        Write-Error "Python error converting $file`n$pythonOutput"
    }
}

if ($converted -gt 0) {
    Write-Information "$converted JPEG page(s) written to $dest" -InformationAction Continue
}
else {
    Write-Warning "No PNG files were converted."
}
