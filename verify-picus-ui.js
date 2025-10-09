// Quick verification script to check if Settings UI contains Picus integration
console.log('🔍 Verifying Picus Integration in Settings UI');

// Check the current app state
fetch('http://localhost:5174/')
  .then(response => response.text())
  .then(html => {
    // Basic check if the app loads
    if (html.includes('ThreatFlow') || html.includes('threatflow')) {
      console.log('✅ ThreatFlow app is loading on http://localhost:5174');
      console.log('📋 To verify Picus Integration UI:');
      console.log('   1. Open http://localhost:5174 in your browser');
      console.log('   2. Look for the Settings icon (⚙️) in the top-right');
      console.log('   3. Click Settings to open the dialog');
      console.log('   4. Scroll down to find "Picus Security Integration" section');
      console.log('   5. You should see an enable/disable toggle');
      console.log('   6. When enabled, you should see Base URL and Refresh Token fields');
    } else {
      console.log('❌ ThreatFlow app may not be loading correctly');
    }
  })
  .catch(error => {
    console.log('❌ Could not connect to frontend server:', error.message);
    console.log('   Make sure the frontend is running on http://localhost:5174');
  });

// Check if backend is responding
fetch('http://localhost:3001/health')
  .then(response => response.json())
  .then(data => {
    console.log('✅ Backend server is healthy:', data);
  })
  .catch(error => {
    console.log('❌ Could not connect to backend server:', error.message);
  });