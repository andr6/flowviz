// Run this in browser console to clear theme cache and force light theme
console.log('🔧 Clearing theme cache and setting light theme...');
localStorage.removeItem('threatflow-theme-mode');
localStorage.setItem('threatflow-theme-mode', 'light');
console.log('✅ Theme cache cleared and light theme set!');
console.log('🔄 Please refresh the page to see changes.');
location.reload();