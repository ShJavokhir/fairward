#!/bin/bash

# Read first ~50KB of each file using dd (byte-based, ignores line endings)
# Much more robust for files with very long lines or weird encodings

PREVIEW_DIR="public_prices/previews"
rm -rf "$PREVIEW_DIR"
mkdir -p "$PREVIEW_DIR"

BYTES=51200  # 50KB should give us plenty of preview data

echo "Extracting first 50KB from each file..."
echo ""

for file in public_prices/*_standardcharges.*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        ext="${filename##*.}"
        preview_file="$PREVIEW_DIR/${filename%.*}.preview.$ext"

        # dd reads exact bytes, doesn't care about line endings
        dd if="$file" of="$preview_file" bs=1024 count=50 2>/dev/null

        if [ -f "$preview_file" ] && [ -s "$preview_file" ]; then
            size=$(wc -c < "$preview_file" | tr -d ' ')
            echo "✓ $filename -> $(basename "$preview_file") (${size} bytes)"
        else
            echo "✗ $filename - failed"
        fi
    fi
done

echo ""
echo "Done! Previews in: $PREVIEW_DIR/"
