#!/usr/bin/env bash
# Regenerates screens/*.png with headless Chrome. Each shot is a URL-staged state
# (?preset=…&step=…&instant=1), so it is reproducible without clicking.
#
#   python3 -m http.server 8765 --directory prototypes/reflow-today   # in another shell
#   bash prototypes/reflow-today/scripts/screens.sh [base-url]
set -euo pipefail
BASE="${1:-http://127.0.0.1:8765/index.html}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/screens"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$OUT"

shot() { # name query [height]
  local h="${3:-1000}"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1440,"$h" --virtual-time-budget=4000 \
    --screenshot="$OUT/$1.png" "$BASE?$2&instant=1" >/dev/null 2>&1
  echo "  $1.png"
}

echo "Presets (option a — the as-specced layout):"
shot 1-slipped-preview   "preset=slipped&step=preview&option=a"
shot 1-slipped-result    "preset=slipped&step=result&option=a"
shot 1-slipped-undo      "preset=slipped&step=undo&option=a"
shot 2-collision-preview "preset=collision&step=preview&option=a"
shot 2-collision-result  "preset=collision&step=result&option=a"
shot 3-abstain-result    "preset=abstain&step=preview&option=a"
shot 4-impossible-preview "preset=impossible&step=preview&option=a"
shot 4-impossible-result "preset=impossible&step=result&option=a"
shot 5-stale-preview     "preset=stale&step=stale&option=a"
shot 5-stale-refused     "preset=stale&step=stale-result&option=a"
shot 6-goal-sheet        "preset=goal&step=sheet&option=a"
shot 6-goal-preview      "preset=goal&step=goal-preview&option=a"
shot 6-goal-result       "preset=goal&step=goal-result&option=a"

echo "Coexistence options (idle Today):"
shot opt-a-slipped       "preset=slipped&option=a"
shot opt-b-slipped       "preset=slipped&option=b"
shot opt-b-sheet         "preset=goal&step=suggestions&option=b"
shot opt-c-slipped       "preset=slipped&option=c"
shot opt-c-collision     "preset=collision&option=c"
shot opt-c-nothing       "preset=abstain&option=c"

echo "Inspector (tall):"
shot inspector-slipped   "preset=slipped&step=preview&option=a" 2600
