#!/usr/bin/env bash
set -euo pipefail

file=$(jq -r '.tool_response.filePath // .tool_input.file_path')

if [[ "$file" =~ \.(ts|tsx|js|jsx|mjs|mts)$ ]]; then
  pnpm exec oxfmt "$file" 2>/dev/null || true
fi
