#!/bin/bash

# Safely extract first 200 lines from large price files
# Outputs to separate preview files to avoid terminal freeze

PREVIEW_DIR="public_prices/previews"
mkdir -p "$PREVIEW_DIR"

echo "Creating previews..."

for file in public_prices/*_standardcharges.*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        preview_file="$PREVIEW_DIR/${filename%.csv}.preview.txt"
        preview_file="${preview_file%.json}.preview.txt"

        # Use head with timeout to prevent hangs
        timeout 10s head -n 200 "$file" > "$preview_file" 2>/dev/null

        if [ $? -eq 0 ]; then
            size=$(wc -c < "$preview_file" | tr -d ' ')
            echo "✓ $filename -> $(basename "$preview_file") (${size} bytes)"
        else
            echo "✗ $filename - timed out or failed"
        fi
    fi
done

echo ""
echo "Done! Previews saved to: $PREVIEW_DIR/"
ls -la "$PREVIEW_DIR/"
