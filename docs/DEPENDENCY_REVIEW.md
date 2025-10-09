# 📦 Dependency Review & Recommendations

## 🚨 **HIGH PRIORITY - Security & Performance Issues**

### **Deprecated/Problematic Dependencies**

#### 1. **punycode (indirect dependency)**
- **Issue**: Deprecated as of Node.js 7.0.0
- **Risk**: Medium - May stop working in future Node versions
- **Action**: Update parent dependencies that use punycode
- **Fix**: Check if any of your direct dependencies are pulling this in

#### 2. **node-fetch v3.3.2**
- **Issue**: Has known performance issues with large files
- **Risk**: Low-Medium - Performance degradation
- **Recommendation**: Consider migrating to built-in `fetch` (Node 18+) or `undici`
- **Migration**: `npm install undici && npm uninstall node-fetch`

#### 3. **bcrypt vs bcryptjs duplication**
- **Issue**: Both `bcrypt` and `bcryptjs` installed (lines 40-41 in package.json)
- **Risk**: Low - Bundle size bloat and maintenance confusion
- **Recommendation**: Remove `bcryptjs`, keep native `bcrypt` for better performance
- **Action**: `npm uninstall bcryptjs`

### **Version Mismatches & Updates Needed**

#### 4. **Three.js Ecosystem**
- **Current**: `three@0.180.0`, `@react-three/fiber@8.18.0`, `@react-three/drei@9.122.0`
- **Issue**: Potentially mismatched versions could cause rendering issues
- **Recommendation**: Update to latest stable versions
```bash
npm update three @react-three/fiber @react-three/drei
```

#### 5. **ESLint Configuration Issues**
- **Issue**: Mixed ESLint versions (`eslint@8.56.0` vs `typescript-eslint@8.42.0`)
- **Risk**: Medium - Linting inconsistencies and conflicts
- **Fix**: Align all ESLint packages to same major version

## ✅ **RECOMMENDED REPLACEMENTS**

### **Better Alternatives**

#### 1. **Replace axios with native fetch**
- **Current**: `axios@1.6.7` (367KB bundle impact)
- **Better**: Built-in fetch with simple wrapper
- **Benefits**: Smaller bundle, modern API, better tree-shaking
```typescript
// Replacement wrapper
export async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}
```

#### 2. **Replace uuid with crypto.randomUUID()**
- **Current**: `uuid@9.0.1`
- **Better**: Native `crypto.randomUUID()` (Node 14.17.0+, browsers)
- **Benefits**: No dependency, better performance

#### 3. **Consider date-fns alternatives**
- **Current**: `date-fns@4.1.0` (large bundle impact)
- **Alternative**: Native `Intl.DateTimeFormat` for most formatting needs
- **Keep**: Only if you need complex date calculations

## 🔒 **SECURITY RECOMMENDATIONS**

### **Critical Security Packages (Keep & Monitor)**
- ✅ `helmet@8.1.0` - Essential security headers
- ✅ `cors@2.8.5` - CORS protection
- ✅ `express-rate-limit@8.0.1` - Rate limiting
- ✅ `rate-limiter-flexible@7.3.0` - Advanced rate limiting
- ✅ `express-validator@7.2.1` - Input validation

### **Add Missing Security Dependencies**
```bash
# Add these for better security
npm install --save zod                    # Runtime validation
npm install --save @types/node            # Better Node.js types  
npm install --save-dev @typescript-eslint/eslint-plugin-security
```

## 📊 **BUNDLE SIZE OPTIMIZATION**

### **Largest Dependencies (Consider Alternatives)**
1. **@mui/material + @mui/icons-material** (~544KB in vendor bundle)
   - **Keep**: Core to your UI design system
   - **Optimize**: Use tree-shaking, import only needed components

2. **reactflow@11.10.3** (~200KB+ estimated)
   - **Keep**: Core to your flow visualization
   - **Optimize**: Consider lazy loading for 3D views

3. **three@0.180.0** (Large impact when used)
   - **Keep**: Essential for 3D visualization
   - **Optimize**: Tree-shake unused modules

### **Bundle Optimization Actions**
```javascript
// Add to vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-ui': ['@mui/material', '@mui/icons-material'],
          'vendor-viz': ['reactflow', 'three', '@react-three/fiber'],
          'vendor-utils': ['date-fns', 'uuid', 'crypto-js']
        }
      }
    }
  }
});
```

## ⚡ **PERFORMANCE RECOMMENDATIONS**

### **High-Impact Optimizations**
1. **Lazy load heavy components**
   - ✅ Already done for StreamingFlowVisualization
   - ✅ Already done for dialogs
   - Consider: 3D visualization components

2. **Replace heavy dependencies**
   - `winston` → Consider lighter logging (if not using advanced features)
   - `jsdom` → Only load when needed for server-side operations

3. **Tree-shaking optimization**
```typescript
// Instead of
import * as Icons from '@mui/icons-material';

// Use
import SecurityIcon from '@mui/icons-material/Security';
import DownloadIcon from '@mui/icons-material/Download';
```

## 🔄 **UPDATE COMMANDS**

### **Safe Updates (Non-breaking)**
```bash
# Update patch versions
npm update

# Update dev dependencies
npm update --dev

# Check for vulnerabilities
npm audit
npm audit fix
```

### **Careful Updates (May require code changes)**
```bash
# Major version updates - test carefully
npm install @mui/material@latest @mui/icons-material@latest
npm install reactflow@latest
npm install three@latest @react-three/fiber@latest @react-three/drei@latest
```

## 📋 **ACTION CHECKLIST**

- [ ] Remove `bcryptjs` (keep `bcrypt`)
- [ ] Audit and update ESLint packages to same major version
- [ ] Replace `uuid` with `crypto.randomUUID()` where possible
- [ ] Add `zod` for runtime validation
- [ ] Implement bundle optimization in vite.config.ts
- [ ] Set up regular dependency auditing (weekly)
- [ ] Monitor bundle size impacts of updates
- [ ] Test Three.js ecosystem compatibility after updates