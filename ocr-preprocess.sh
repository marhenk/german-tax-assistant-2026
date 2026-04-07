#!/bin/bash

# OCR Pre-Processing Pipeline
# Enhance image quality before OCR → +2-3% accuracy
# Uses ImageMagick for image enhancement

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found!"
    echo "   Install: sudo apt install imagemagick"
    exit 1
fi

# Input validation
if [ $# -lt 1 ]; then
    echo "Usage: ./ocr-preprocess.sh input.jpg [output.jpg]"
    echo ""
    echo "Applies OCR-optimized image enhancements:"
    echo "  - Sharpening"
    echo "  - Contrast enhancement"
    echo "  - Noise reduction"
    echo "  - Normalization"
    exit 1
fi

INPUT="$1"
OUTPUT="${2:-${INPUT%.jpg}_enhanced.jpg}"

if [ ! -f "$INPUT" ]; then
    echo "❌ Input file not found: $INPUT"
    exit 1
fi

echo "🖼️  OCR Pre-Processing Pipeline"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Input:  $INPUT"
echo "Output: $OUTPUT"
echo ""

# Step 1: Enhance
echo "📊 Step 1: Enhancing contrast..."
convert "$INPUT" -enhance temp1.jpg

# Step 2: Sharpen
echo "📊 Step 2: Sharpening..."
convert temp1.jpg -sharpen 0x1 temp2.jpg

# Step 3: Increase contrast
echo "📊 Step 2: Increasing contrast..."
convert temp2.jpg -contrast temp3.jpg

# Step 4: Normalize
echo "📊 Step 4: Normalizing..."
convert temp3.jpg -normalize temp4.jpg

# Step 5: Reduce noise (median filter)
echo "📊 Step 5: Noise reduction..."
convert temp4.jpg -median 1 "$OUTPUT"

# Cleanup temp files
rm -f temp1.jpg temp2.jpg temp3.jpg temp4.jpg

echo ""
echo "✅ Pre-processing complete!"
echo ""

# Show file sizes
INPUT_SIZE=$(du -h "$INPUT" | cut -f1)
OUTPUT_SIZE=$(du -h "$OUTPUT" | cut -f1)

echo "Original: $INPUT_SIZE"
echo "Enhanced: $OUTPUT_SIZE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next: Run OCR on $OUTPUT"
echo "  tesseract $OUTPUT output -l deu"
echo "  OR"
echo "  node ocr-processor.js $OUTPUT"
echo ""
