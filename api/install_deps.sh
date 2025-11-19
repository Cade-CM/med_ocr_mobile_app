#!/usr/bin/env bash
# Install system dependencies for Render deployment

# Update package list
apt-get update

# Install Tesseract OCR
apt-get install -y tesseract-ocr

# Install OpenCV dependencies
apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0

echo "✓ System dependencies installed successfully"
