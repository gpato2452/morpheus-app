#!/bin/bash
set -e

# ── Config ────────────────────────────────────────────────────────────────────
APP_NAME="Morpheus"
BINARY="dist/Morpheus-mac"
APP_BUNDLE="dist/${APP_NAME}.app"
DMG_OUTPUT="dist/${APP_NAME}.dmg"
DMG_STAGING="dist/dmg-staging"

echo "▶ Building ${APP_NAME}.dmg..."

# ── 1. Check binary exists ─────────────────────────────────────────────────
if [ ! -f "$BINARY" ]; then
  echo "❌ Binary not found at $BINARY — run 'npm run pkg:mac' first"
  exit 1
fi

# ── 2. Create .app bundle structure ───────────────────────────────────────
echo "  Creating .app bundle..."
rm -rf "$APP_BUNDLE"
mkdir -p "${APP_BUNDLE}/Contents/MacOS"
mkdir -p "${APP_BUNDLE}/Contents/Resources"

# ── 3. Copy binary as the executable ──────────────────────────────────────
cp "$BINARY" "${APP_BUNDLE}/Contents/MacOS/${APP_NAME}"
chmod +x "${APP_BUNDLE}/Contents/MacOS/${APP_NAME}"

# ── 4. Create Info.plist ──────────────────────────────────────────────────
cat > "${APP_BUNDLE}/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>Morpheus</string>
  <key>CFBundleIdentifier</key>
  <string>com.morpheus.app</string>
  <key>CFBundleName</key>
  <string>Morpheus</string>
  <key>CFBundleDisplayName</key>
  <string>Morpheus</string>
  <key>CFBundleVersion</key>
  <string>1.0.0</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleSignature</key>
  <string>????</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>LSUIElement</key>
  <false/>
</dict>
</plist>
PLIST

echo "  .app bundle created ✓"

# ── 5. Create a simple DMG icon (optional, skip if no icon) ───────────────
ICON_SRC="assets/icon.icns"
if [ -f "$ICON_SRC" ]; then
  cp "$ICON_SRC" "${APP_BUNDLE}/Contents/Resources/AppIcon.icns"
  # Add icon reference to plist
  /usr/libexec/PlistBuddy -c "Add :CFBundleIconFile string AppIcon" "${APP_BUNDLE}/Contents/Info.plist" 2>/dev/null || true
fi

# ── 6. Build the DMG ──────────────────────────────────────────────────────
echo "  Creating DMG..."
rm -rf "$DMG_STAGING"
mkdir -p "$DMG_STAGING"

# Copy .app into staging
cp -r "$APP_BUNDLE" "$DMG_STAGING/"

# Create symlink to /Applications so user can drag-and-drop
ln -s /Applications "$DMG_STAGING/Applications"

# Create DMG from staging
rm -f "$DMG_OUTPUT"
hdiutil create \
  -volname "$APP_NAME" \
  -srcfolder "$DMG_STAGING" \
  -ov \
  -format UDZO \
  "$DMG_OUTPUT"

rm -rf "$DMG_STAGING"

echo ""
echo "✅ Done! File: $DMG_OUTPUT"
echo "   Size: $(du -sh "$DMG_OUTPUT" | cut -f1)"
echo ""
echo "Users: double-click the DMG → drag Morpheus to Applications → open from there."
echo "First launch: right-click → Open (one time only, macOS security)."
