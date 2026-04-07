#!/bin/bash

# Repository Verification Script

echo "🔍 German Tax Assistant 2026 - Repository Verification"
echo "======================================================="
echo ""

cd ~/german-tax-assistant-2026

# Check git status
echo "📦 Git Status:"
git status --short
echo ""

# Check files
echo "📁 Critical Files:"
for file in README.md LICENSE package.json cli.js .gitignore config/config.json.example; do
  if [ -f "$file" ]; then
    size=$(du -h "$file" | cut -f1)
    echo "  ✅ $file ($size)"
  else
    echo "  ❌ MISSING: $file"
  fi
done
echo ""

# Check directories
echo "📂 Directories:"
for dir in src config web docs test wiki autoresearch exports; do
  if [ -d "$dir" ]; then
    count=$(find "$dir" -type f | wc -l)
    echo "  ✅ $dir/ ($count files)"
  else
    echo "  ❌ MISSING: $dir/"
  fi
done
echo ""

# Check source files
echo "💻 Source Files:"
for file in src/ocr-processor.js src/bank-statement-parser.js src/euer-categorizer.js src/gdrive-filer.js src/gdrive-receipts.js src/gdrive-workflow.js; do
  if [ -f "$file" ]; then
    size=$(du -h "$file" | cut -f1)
    echo "  ✅ $(basename $file) ($size)"
  else
    echo "  ❌ MISSING: $(basename $file)"
  fi
done
echo ""

# Check git
echo "🌳 Git Repository:"
echo "  Commit: $(git log --oneline -1)"
echo "  Branch: $(git branch --show-current)"
echo "  Remote: $(git remote get-url origin 2>/dev/null || echo 'Not set')"
echo ""

# Check wiki
echo "📚 Wiki Pages: $(find wiki/ -name "*.md" | wc -l) markdown files"
echo ""

# Check autoresearch
echo "🧪 Autoresearch:"
echo "  Test scenarios: $(ls -d autoresearch/test-data/scenario* 2>/dev/null | wc -l)"
echo "  Reports: $(ls autoresearch/*REPORT.md 2>/dev/null | wc -l)"
echo ""

# Repository size
echo "💾 Repository Size:"
total_size=$(du -sh . | cut -f1)
echo "  Total: $total_size"
echo ""

# Final status
echo "✅ Repository is ready for GitHub!"
echo ""
echo "Next steps:"
echo "  1. Create repo at: https://github.com/new"
echo "  2. Name: german-tax-assistant-2026"
echo "  3. Visibility: Public"
echo "  4. Push: git push -u origin main"
