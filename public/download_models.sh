#!/bin/bash

# Available models
models=(
    "Xenova/whisper-tiny"
    "Xenova/whisper-tiny.en"
    "Xenova/whisper-base"
    "Xenova/whisper-base.en"
    "Xenova/whisper-small"
    "Xenova/whisper-small.en"
    "Xenova/whisper-medium"
    "Xenova/whisper-medium.en"
    "Xenova/whisper-large-v2"
    "Xenova/whisper-large-v3"
    "distil-whisper/distil-medium.en"
    "distil-whisper/distil-large-v2"
)

echo "Available Models:"
for i in "${!models[@]}"; do
    echo "$((i+1)). ${models[i]}"
done

read -p "Select model number (e.g., 1): " selection
index=$((selection-1))

if [ $index -lt 0 ] || [ $index -ge ${#models[@]} ]; then
    echo "Invalid selection."
    exit 1
fi

selectedModel=${models[$index]}
echo "Selected: $selectedModel"

read -p "Download quantized models (smaller, faster)? (Y/N) [Default: Y]: " quantizedInput
downloadQuantized=true
if [[ "$quantizedInput" == "N" || "$quantizedInput" == "n" ]]; then
    downloadQuantized=false
fi

read -p "Download unquantized (fp32) models? (larger, more accurate) (Y/N) [Default: N]: " unquantizedInput
downloadUnquantized=false
if [[ "$unquantizedInput" == "Y" || "$unquantizedInput" == "y" ]]; then
    downloadUnquantized=true
fi

if [ "$downloadQuantized" = false ] && [ "$downloadUnquantized" = false ]; then
    echo "No model type selected. Going with Quantized by default."
    downloadQuantized=true
fi

# Determine branch
branch="main"
if [[ "$selectedModel" == *"whisper-medium"* ]]; then
    branch="no_attentions"
    echo "Using 'no_attentions' branch for medium model."
fi

baseUrl="https://huggingface.co/$selectedModel/resolve/$branch"
scriptDir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
targetDir="$scriptDir/models/$selectedModel"

mkdir -p "$targetDir/onnx"

configFiles=(
    "config.json"
    "generation_config.json"
    "preprocessor_config.json"
    "tokenizer.json"
    "tokenizer_config.json"
    "vocab.json"
    "merges.txt"
    "normalizer.json"
    "added_tokens.json"
    "special_tokens_map.json"
    "quant_config.json"
)

onnxFiles=()

if [ "$downloadQuantized" = true ]; then
    onnxFiles+=("encoder_model_quantized.onnx")
    onnxFiles+=("decoder_model_merged_quantized.onnx")
fi

if [ "$downloadUnquantized" = true ]; then
    onnxFiles+=("encoder_model.onnx")
    onnxFiles+=("decoder_model_merged.onnx")
fi

download_file() {
    url=$1
    output=$2
    if [ -f "$output" ]; then
        echo "Downloading $url ... [Exists, Skipping]"
        return
    fi
    
    echo -n "Downloading $url ... "
    
    if command -v curl >/dev/null 2>&1; then
        http_code=$(curl -L -w "%{http_code}" -o "$output" "$url" 2>/dev/null)
        if [ "$http_code" == "200" ]; then
            echo "[OK]"
        elif [ "$http_code" == "404" ]; then
            echo "[Not Found (Optional)]"
            rm -f "$output"
        else
            echo "[Error: $http_code]"
        fi
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O "$output" "$url"
        if [ $? -eq 0 ]; then
             echo "[OK]"
        else
             echo "[Error/Not Found]"
             rm -f "$output"
        fi
    else
        echo "Error: curl or wget not found."
        exit 1
    fi
}

echo ""
echo "Starting Download to $targetDir"
echo ""

for file in "${configFiles[@]}"; do
    url="$baseUrl/$file"
    output="$targetDir/$file"
    download_file "$url" "$output"
done

for file in "${onnxFiles[@]}"; do
    url="$baseUrl/onnx/$file"
    output="$targetDir/onnx/$file"
    download_file "$url" "$output"
done

echo ""
echo "Download Complete."
