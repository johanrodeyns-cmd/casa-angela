#!/bin/bash
# SessionStart hook — installs project dependencies so tests/linters work
# in Claude Code on the web. Idempotent and safe to re-run.
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

install_deps() {
  local dir="$1"
  if [ -f "$dir/package.json" ]; then
    echo "session-start: npm install in $dir" >&2
    (cd "$dir" && npm install) >&2
  fi
}

# Root package (if any) + Cloud Functions package (if any).
install_deps "$CLAUDE_PROJECT_DIR"
install_deps "$CLAUDE_PROJECT_DIR/functions"

echo "session-start: dependencies ready" >&2
