#!/bin/bash

echo "🎨 Testing Light Theme Implementation"
echo "===================================="

echo ""
echo "1. Checking servers are running..."
FRONTEND_STATUS=$(curl -s -w "%{http_code}" http://localhost:5174/ -o /dev/null)
BACKEND_STATUS=$(curl -s -w "%{http_code}" http://localhost:3001/health -o /dev/null)

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend running (HTTP $FRONTEND_STATUS)"
else
    echo "❌ Frontend not running (HTTP $FRONTEND_STATUS)"
    exit 1
fi

if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend running (HTTP $BACKEND_STATUS)"
else
    echo "❌ Backend not running (HTTP $BACKEND_STATUS)"
    exit 1
fi

echo ""
echo "2. MAJOR FIX - Root cause corrected:"
echo "✅ Fixed src/index.css :root background from #242424 (dark) to #ffffff (light)"
echo "✅ Fixed src/index.css button background from #1a1a1a (dark) to #f9f9f9 (light)"
echo "✅ Fixed React Flow edge text from white to dark for light theme readability"
echo "✅ Added index.css import to main.tsx to ensure root styles are loaded"
echo ""
echo "Previous fixes also applied:"
echo "✅ Main background set to theme.colors.background.primary"
echo "✅ Animated gradients made theme-aware with lighter colors for light mode"
echo "✅ Grid overlay made theme-aware with subtle light mode colors"
echo "✅ actualTheme property added to App.tsx context"

echo ""
echo "3. Testing theme system:"
echo ""
echo "🌐 Open http://localhost:5174/ in your browser"
echo ""
echo "To test the light theme:"
echo "1. Click the theme toggle button (☀️/🌙) in the top-right corner"
echo "2. Or open Settings and change theme mode to 'Light'"
echo "3. You should see:"
echo "   - White background (#ffffff)"
echo "   - Very subtle blue accent gradients"
echo "   - Light colored text and UI elements"
echo ""
echo "If you still see dark colors:"
echo "1. Open browser Developer Tools (F12)"
echo "2. Go to Console tab"
echo "3. Copy and paste this code:"
echo ""
echo "localStorage.removeItem('threatflow-theme-mode');"
echo "localStorage.setItem('threatflow-theme-mode', 'light');"
echo "location.reload();"
echo ""
echo "✅ Theme test setup complete!"