#!/bin/bash

echo "🎨 === FINAL LIGHT THEME TEST ==="
echo "==============================="

echo ""
echo "1. Server Status Check:"
FRONTEND_STATUS=$(curl -s -w "%{http_code}" http://localhost:5174/ -o /dev/null)
BACKEND_STATUS=$(curl -s -w "%{http_code}" http://localhost:3001/health -o /dev/null)

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend running (HTTP $FRONTEND_STATUS)"
else
    echo "❌ Frontend not running (HTTP $FRONTEND_STATUS) - Please start with 'npm run dev'"
    exit 1
fi

if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend running (HTTP $BACKEND_STATUS)"
else
    echo "❌ Backend not running (HTTP $BACKEND_STATUS) - Please start with 'npm run server'"
    exit 1
fi

echo ""
echo "2. Applied Fixes Summary:"
echo "✅ Forced light theme as default in useTheme.ts"
echo "✅ Added debug logging to track theme selection"
echo "✅ Updated App.tsx background to use theme.colors.background.primary"
echo "✅ Made animated gradients theme-aware with light mode variants"
echo "✅ Made grid overlay theme-aware with subtle light colors"
echo "✅ Added Material-UI CssBaseline overrides to force background colors"
echo "✅ Added comprehensive debugging logs"

echo ""
echo "3. Testing Instructions:"
echo ""
echo "🌐 Open: http://localhost:5174/"
echo ""
echo "Expected behavior:"
echo "  • Page loads with white background (#ffffff)"
echo "  • Very subtle blue accent colors"
echo "  • Light colored text and UI elements"
echo "  • Console shows debug logs starting with '🎨'"
echo ""
echo "If still seeing dark colors:"
echo ""
echo "Option 1 - Browser Console Commands:"
echo "  1. Press F12 to open Developer Tools"
echo "  2. Go to Console tab"
echo "  3. Copy and paste this command:"
echo ""
echo "     localStorage.setItem('threatflow-theme-mode', 'light'); location.reload();"
echo ""
echo "Option 2 - Hard Reset:"
echo "  1. Press F12 to open Developer Tools"
echo "  2. Right-click the refresh button"
echo "  3. Select 'Empty Cache and Hard Reload'"
echo ""
echo "Option 3 - Theme Toggle:"
echo "  1. Look for theme toggle button (☀️/🌙) in top-right"
echo "  2. Click to cycle: Dark → Light → System"
echo "  3. Select Light mode"
echo ""
echo "✅ Test complete! Check browser console for debug logs."
echo ""
echo "📊 Debug logs to look for:"
echo "   🎨 ThemeProvider Debug: { actualTheme: 'light', ... }"
echo "   🎨 AppWithTheme Debug: { actualTheme: 'light', ... }"
echo "   🎨 Creating Material-UI theme with mode: light ..."
echo "   🎨 Setting body background to: #ffffff"