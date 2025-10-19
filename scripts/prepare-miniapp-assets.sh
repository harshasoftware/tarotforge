#!/bin/bash

# Script to prepare assets for Base Mini App
# This script creates necessary PNG versions of icons and placeholder screenshots

echo "Preparing Base Mini App assets..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Please install it first:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  Or use online SVG to PNG converter and place files manually in public/"
    exit 1
fi

# Create PNG versions of the tarot icon
echo "Converting tarot-icon.svg to PNG formats..."

# Standard icon (512x512)
convert -background none -resize 512x512 public/tarot-icon.svg public/tarot-icon.png

# Splash image (1920x1080)
convert -background "#000000" -gravity center -resize 800x800 -extent 1920x1080 public/tarot-icon.svg public/tarot-splash.png

# Hero image (1200x630 - Open Graph standard)
convert -background "#000000" -gravity center -resize 600x600 -extent 1200x630 public/tarot-icon.svg public/tarot-hero.png

# OG image (same as hero)
cp public/tarot-hero.png public/tarot-og.png

# Create placeholder screenshots if they don't exist
if [ ! -f "public/screenshot-portrait.png" ]; then
    echo "Creating placeholder screenshot-portrait.png..."
    convert -size 1170x2532 -background "#000000" -fill white -gravity center \
            -pointsize 60 -annotate +0+0 "Tarot Forge\nScreenshot" \
            public/screenshot-portrait.png
fi

if [ ! -f "public/screenshot-landscape.png" ]; then
    echo "Creating placeholder screenshot-landscape.png..."
    convert -size 2532x1170 -background "#000000" -fill white -gravity center \
            -pointsize 60 -annotate +0+0 "Tarot Forge Screenshot" \
            public/screenshot-landscape.png
fi

echo "✅ Assets preparation complete!"
echo ""
echo "Generated files:"
echo "  - public/tarot-icon.png (512x512)"
echo "  - public/tarot-splash.png (1920x1080)"
echo "  - public/tarot-hero.png (1200x630)"
echo "  - public/tarot-og.png (1200x630)"
echo "  - public/screenshot-portrait.png (placeholder)"
echo "  - public/screenshot-landscape.png (placeholder)"
echo ""
echo "⚠️  Note: Replace the placeholder screenshots with actual app screenshots"