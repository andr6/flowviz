// Comprehensive theme debugging script
// Run this in browser console at http://localhost:5174/

console.log('🔧 === THEME DEBUG SESSION ===');

// 1. Check localStorage
console.log('📦 LocalStorage:');
console.log('  threatflow-theme-mode:', localStorage.getItem('threatflow-theme-mode'));

// 2. Check document attributes
console.log('📄 Document attributes:');
console.log('  data-theme:', document.documentElement.getAttribute('data-theme'));
console.log('  document.body.style.backgroundColor:', document.body.style.backgroundColor);

// 3. Check CSS variables
console.log('🎨 CSS Variables:');
const computedStyle = getComputedStyle(document.documentElement);
console.log('  --bg-primary:', computedStyle.getPropertyValue('--bg-primary'));
console.log('  --text-primary:', computedStyle.getPropertyValue('--text-primary'));

// 4. Force light theme
console.log('🔄 Forcing light theme...');
localStorage.setItem('threatflow-theme-mode', 'light');
document.documentElement.setAttribute('data-theme', 'light');
document.body.style.backgroundColor = '#ffffff';

// 5. Check Material-UI theme
setTimeout(() => {
    const muiTheme = document.querySelector('[data-mui-theme]');
    if (muiTheme) {
        console.log('🎨 Material-UI theme found');
    } else {
        console.log('❌ No Material-UI theme found');
    }
    
    // 6. Reload to apply changes
    console.log('🔄 Reloading page to apply theme changes...');
    location.reload();
}, 1000);