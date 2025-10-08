#!/bin/bash
# Render Build Script - Doesn't affect local development

echo "🚀 Starting Render build process..."

# Install dependencies
npm install

# Build TypeScript
npm run build

echo "✅ Render build completed successfully!"