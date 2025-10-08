# convert_and_place.ps1
# Converts .png to .jpg and moves to storybook pages folder

param (
    [Parameter(Mandatory=$false, ValueFromRemainingArguments=$true)]
    [string[]]$InputFiles
)

# Set your destination folder
$dest = "C:\Users\Admin\love_and_sharing_website_0\stories\wordless\harbinger_dawn\pages"

# Counter starts at 1 for page01.jpg
$i = 1

foreach ($file in $InputFiles) {
    if ($file.ToLower().EndsWith(".png")) {
        $pageNum = "{0:D2}" -f $i
        $jpgPath = "$dest\page$pageNum.jpg"

        # Use Python PIL to convert
        python - <<EOF
from PIL import Image
Image.open(r'''$file''').convert("RGB").save(r'''$jpgPath''', "JPEG")
EOF

        Write-Host "✅ Converted: $file → $jpgPath"
        $i++
    }
    else {
        Write-Host "⚠️ Skipped (not PNG): $file"
    }
}
