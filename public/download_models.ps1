<#
.SYNOPSIS
Downloads Whisper models (ONNX) and configuration files for local usage.

.DESCRIPTION
This script downloads the specified Whisper model from Hugging Face for use with transformers.js locally.
It supports selecting quantization options and handles the 'no_attentions' revision for medium models.

.NOTES
File Name      : download_models.ps1
Author         : Antigravity
Prerequisite   : Internet connection
#>

$models = @(
    "Xenova/whisper-tiny",
    "Xenova/whisper-tiny.en",
    "Xenova/whisper-base",
    "Xenova/whisper-base.en",
    "Xenova/whisper-small",
    "Xenova/whisper-small.en",
    "Xenova/whisper-medium",
    "Xenova/whisper-medium.en",
    "Xenova/whisper-large-v2",
    "Xenova/whisper-large-v3",
    "distil-whisper/distil-medium.en",
    "distil-whisper/distil-large-v2"
)

Write-Host "Available Models:" -ForegroundColor Cyan
for ($i = 0; $i -lt $models.Count; $i++) {
    Write-Host "$($i + 1). $($models[$i])"
}

$selection = Read-Host "Select model number (e.g., 1)"
$index = [int]$selection - 1

if ($index -lt 0 -or $index -ge $models.Count) {
    Write-Host "Invalid selection." -ForegroundColor Red
    exit
}

$selectedModel = $models[$index]
Write-Host "Selected: $selectedModel" -ForegroundColor Green

$quantizedInput = Read-Host "Download quantized models (smaller, faster)? (Y/N) [Default: Y]"
$downloadQuantized = $true
if ($quantizedInput -eq "N" -or $quantizedInput -eq "n") {
    $downloadQuantized = $false
}

$unquantizedInput = Read-Host "Download unquantized (fp32) models (larger, more accurate)? (Y/N) [Default: N]"
$downloadUnquantized = $false
if ($unquantizedInput -eq "Y" -or $unquantizedInput -eq "y") {
    $downloadUnquantized = $true
}

if (-not $downloadQuantized -and -not $downloadUnquantized) {
    Write-Host "No model type selected. Going with Quantized by default." -ForegroundColor Yellow
    $downloadQuantized = $true
}

# Determine revision/branch
$branch = "main"
if ($selectedModel -like "*whisper-medium*") {
    $branch = "no_attentions"
    Write-Host "Using 'no_attentions' branch for medium model." -ForegroundColor Gray
}

$baseUrl = "https://huggingface.co/$selectedModel/resolve/$branch"
$targetDir = Join-Path (Join-Path $PSScriptRoot "models") $selectedModel
# Ensure target dir exists
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
}
$onnxDir = Join-Path $targetDir "onnx"
if (!(Test-Path $onnxDir)) {
    New-Item -ItemType Directory -Force -Path $onnxDir | Out-Null
}

$configFiles = @(
    "config.json",
    "generation_config.json",
    "preprocessor_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "vocab.json",
    "merges.txt",
    "normalizer.json",
    "added_tokens.json",
    "special_tokens_map.json",
    "quant_config.json"
)

$onnxFiles = @()

if ($downloadQuantized) {
    $onnxFiles += "encoder_model_quantized.onnx"
    $onnxFiles += "decoder_model_merged_quantized.onnx"
}
if ($downloadUnquantized) {
    $onnxFiles += "encoder_model.onnx"
    $onnxFiles += "decoder_model_merged.onnx"
}

# Function to download
function Save-OnlineFile {
    param($url, $output)
    Write-Host "Downloading $url ..." -NoNewline
    try {
        # Check if file already exists
        if (Test-Path $output) {
            Write-Host " [Exists, Skipping]" -ForegroundColor Yellow
            return
        }
        
        Invoke-WebRequest -Uri $url -OutFile $output -ErrorAction Stop
        Write-Host " [OK]" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq "NotFound") {
            Write-Host " [Not Found (Optional)]" -ForegroundColor Gray
        }
        else {
            Write-Host " [Error: $_]" -ForegroundColor Red
        }
    }
}

Write-Host "`nStarting Download to $targetDir `n" -ForegroundColor Cyan

foreach ($file in $configFiles) {
    $url = "$baseUrl/$file"
    $output = Join-Path $targetDir $file
    Save-OnlineFile -url $url -output $output
}

foreach ($file in $onnxFiles) {
    $url = "$baseUrl/onnx/$file"
    $output = Join-Path $onnxDir $file
    Save-OnlineFile -url $url -output $output
}

Write-Host "`nDownload Complete." -ForegroundColor Green
Write-Host "Press any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
