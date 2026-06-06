#!/bin/bash
# Runs TypeScript type-check and ESLint after Claude writes/edits JS/TS files
# Receives tool input via stdin as JSON

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only run on TypeScript/JavaScript files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

# Skip node_modules
if [[ "$FILE_PATH" == *"node_modules"* ]]; then
  exit 0
fi

echo "--- Auto-lint: checking $FILE_PATH ---"

# Run ESLint on the file
LINT_OUTPUT=$(bun run lint --quiet "$FILE_PATH" 2>&1)
LINT_EXIT=$?

if [[ $LINT_EXIT -ne 0 ]]; then
  echo "ESLint issues found:"
  echo "$LINT_OUTPUT"
else
  echo "ESLint: OK"
fi

# Run TypeScript type check (whole project, fast)
TSC_OUTPUT=$(bunx tsc --noEmit --pretty false 2>&1 | head -20)
TSC_EXIT=$?

if [[ $TSC_EXIT -ne 0 ]]; then
  echo "TypeScript errors:"
  echo "$TSC_OUTPUT"
else
  echo "TypeScript: OK"
fi

exit 0
