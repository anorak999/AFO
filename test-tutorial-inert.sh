#!/bin/bash
# Tutorial inert regression test
# Run this after installing AFO_2.5.49-test_amd64.deb
# Requires: xdotool, scrot (apt install xdotool scrot)

set -e

SCREENSHOT_DIR="/tmp/afo-test-$(date +%s)"
mkdir -p "$SCREENSHOT_DIR"
echo "Screenshots will be saved to: $SCREENSHOT_DIR"

# Find AFO window
find_window() {
  WID=$(xdotool search --name "AFO" 2>/dev/null | head -1)
  if [ -z "$WID" ]; then
    WID=$(xdotool search --class "afo" 2>/dev/null | head -1)
  fi
  if [ -z "$WID" ]; then
    echo "ERROR: Could not find AFO window. Is it running?"
    exit 1
  fi
  echo "Found AFO window: $WID"
}

screenshot() {
  local name="$1"
  scrot -u "$SCREENSHOT_DIR/$name.png" 2>/dev/null || scrot "$SCREENSHOT_DIR/$name.png"
  echo "  Screenshot: $SCREENSHOT_DIR/$name.png"
}

check_inert() {
  local has_inert=$(xdotool getwindowfocus 2>/dev/null)
  echo "  Current focused window: $has_inert"
  # We can't directly check DOM attributes from xdotool,
  # but we can check if the app responds to clicks
}

click_center() {
  xdotool mousemove --window "$WID" 600 400
  sleep 0.2
  xdotool click --window "$WID" 1
  sleep 0.5
}

echo ""
echo "=== PATH 1: Open Tutorial → Close via X (step 1) → Click Organize ==="
find_window
screenshot "1a-tutorial-open"
echo "  Closing via X button (top-right of modal)..."
# X button is approximately at top-right of modal
xdotool mousemove --window "$WID" 860 200
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
screenshot "1b-after-x-close"
echo "  Clicking Organize in sidebar..."
xdotool mousemove --window "$WID" 120 100
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
screenshot "1c-organize-screen"
echo "  PATH 1 COMPLETE - Check screenshot: can you interact with the Organize panel?"

echo ""
echo "=== PATH 2: Open Tutorial → Advance steps → Close via Escape → Click Organize ==="
# Reopen tutorial via Settings > General > Show
echo "  Navigate to Settings..."
xdotool mousemove --window "$WID" 120 350
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
echo "  Click Show Tutorial button..."
# Show button is in General section
xdotool mousemove --window "$WID" 700 250
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
screenshot "2a-tutorial-reopen"
echo "  Pressing Next twice to advance..."
xdotool key --window "$WID" Return
sleep 0.5
xdotool key --window "$WID" Return
sleep 0.5
screenshot "2b-advanced-steps"
echo "  Pressing Escape..."
xdotool key --window "$WID" Escape
sleep 1
screenshot "2c-after-escape"
echo "  Clicking Organize..."
xdotool mousemove --window "$WID" 120 100
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
screenshot "2d-organize-screen"
echo "  PATH 2 COMPLETE - Check screenshot"

echo ""
echo "=== PATH 3: Open Tutorial → Advance to final step → Click Start Organizing ==="
echo "  Navigate to Settings..."
xdotool mousemove --window "$WID" 120 350
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
echo "  Click Show Tutorial..."
xdotool mousemove --window "$WID" 700 250
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
echo "  Pressing Next 5 times to reach final step..."
for i in 1 2 3 4 5; do
  xdotool key --window "$WID" Return
  sleep 0.5
done
screenshot "3a-final-step"
echo "  Clicking Start Organizing..."
# Button is bottom-right of modal
xdotool mousemove --window "$WID" 800 580
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
screenshot "3b-after-start-organizing"
echo "  PATH 3 COMPLETE - Check screenshot"

echo ""
echo "=== PATH 4: Open Tutorial → Close via X on step 5 → Click Organize ==="
echo "  Navigate to Settings..."
xdotool mousemove --window "$WID" 120 350
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
echo "  Click Show Tutorial..."
xdotool mousemove --window "$WID" 700 250
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
echo "  Pressing Next 4 times to reach step 5..."
for i in 1 2 3 4; do
  xdotool key --window "$WID" Return
  sleep 0.5
done
screenshot "4a-step-5"
echo "  Closing via X..."
xdotool mousemove --window "$WID" 860 200
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
screenshot "4b-after-x-close"
echo "  Clicking Organize..."
xdotool mousemove --window "$WID" 120 100
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
screenshot "4c-organize-screen"
echo "  PATH 4 COMPLETE - Check screenshot"

echo ""
echo "=== PATH 5: Open Tutorial → Click sidebar while open → Verify cleanup ==="
echo "  Navigate to Settings..."
xdotool mousemove --window "$WID" 120 350
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
echo "  Click Show Tutorial..."
xdotool mousemove --window "$WID" 700 250
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
screenshot "5a-tutorial-open"
echo "  Trying to click sidebar (should be blocked by inert)..."
xdotool mousemove --window "$WID" 120 100
sleep 0.2
xdotool click --window "$WID" 1
sleep 1
screenshot "5b-after-sidebar-click"
echo "  PATH 5 COMPLETE - Check: did the sidebar respond? (inert should block it)"

echo ""
echo "=== ALL PATHS COMPLETE ==="
echo "Screenshots saved to: $SCREENSHOT_DIR"
echo ""
echo "VERIFICATION CHECKLIST:"
echo "1. After each path, can you click buttons on the Organize screen?"
echo "2. After each path, does the sidebar respond to clicks?"
echo "3. After each path, does the app feel responsive (not frozen)?"
echo "4. In path 5, did clicking the sidebar while tutorial was open do anything?"
