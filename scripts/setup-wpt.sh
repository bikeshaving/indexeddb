#!/usr/bin/env bash
# Fetches the IndexedDB Web Platform Tests at a pinned commit into ./wpt,
# using a sparse + shallow + partial (blobless) checkout so only the
# IndexedDB directory and shared resources land on disk — a few MB, not
# the ~5GB full WPT tree. `wpt/` is gitignored; CI runs this before tests.

set -e

# Pin the exact WPT revision the conformance suite was validated against.
WPT_COMMIT="37b6423453df43710ba8f675d09774c8c84234f3"
WPT_URL="https://github.com/web-platform-tests/wpt.git"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WPT_DIR="$ROOT/wpt"

# Skip if the pinned commit is already checked out.
if [ -f "$WPT_DIR/IndexedDB/abort-in-initial-upgradeneeded.any.js" ] \
   && [ "$(git -C "$WPT_DIR" rev-parse HEAD 2>/dev/null)" = "$WPT_COMMIT" ]; then
  echo "WPT already at $WPT_COMMIT."
  exit 0
fi

echo "Fetching WPT IndexedDB tests at $WPT_COMMIT (sparse, shallow)..."
rm -rf "$WPT_DIR"
mkdir -p "$WPT_DIR"
git -C "$WPT_DIR" init -q
git -C "$WPT_DIR" remote add origin "$WPT_URL"
git -C "$WPT_DIR" sparse-checkout set --no-cone '/*' '!/*/' '/IndexedDB/' '/resources/'
git -C "$WPT_DIR" fetch -q --depth=1 --filter=blob:none origin "$WPT_COMMIT"
git -C "$WPT_DIR" checkout -q FETCH_HEAD

echo "WPT ready at $WPT_DIR (IndexedDB + resources)."
