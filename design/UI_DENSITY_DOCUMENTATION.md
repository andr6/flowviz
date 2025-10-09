# Adaptive Information Density Control

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Density Levels](#density-levels)
4. [Installation & Setup](#installation--setup)
5. [Usage Guide](#usage-guide)
6. [API Reference](#api-reference)
7. [Component Examples](#component-examples)
8. [Best Practices](#best-practices)
9. [Migration Guide](#migration-guide)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The **Adaptive Information Density Control** system provides user-controlled UI complexity levels that affect spacing, typography, and component sizes across the entire application.

### Purpose

Accommodate different user preferences and use cases:
- **Power Users**: Compact mode for maximum information density
- **General Users**: Comfortable mode for balanced readability
- **Accessibility**: Spacious mode for enhanced readability
- **Screen Sizes**: Optimize for different display dimensions

### Value Proposition

- **User Control**: Let users customize the UI to their preferences
- **Accessibility**: Support users with visual impairments or reading difficulties
- **Screen Optimization**: Adapt to different screen sizes and resolutions
- **Productivity**: Power users can see more information at once
- **Consistency**: Unified density system across all components

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Root                          │
│  <DensityProvider>                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                 DensityContext (Global State)                │
│  - Current density level                                     │
│  - Theme values                                              │
│  - Utility functions                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│              Components (Density-Aware)                      │
│  - useDensity() hook                                         │
│  - Apply density styles                                      │
│  - Responsive to density changes                             │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **React Context API**: Global state management
- **TypeScript**: Type-safe configuration
- **LocalStorage**: Persistent user preferences
- **CSS Variables**: Dynamic styling
- **Material-UI**: Component integration

---

## Density Levels

### Compact

**Use Cases**:
- Power users who need maximum information density
- Small screens (laptops, tablets)
- Data-heavy dashboards
- Users familiar with the application

**Characteristics**:
- Minimal spacing (4-8px padding)
- Small fonts (12-14px base)
- Tight line height (1.25)
- Small components (28px buttons, 32px inputs)
- Maximum content per screen

**Visual Example**:
```
┌────────────────────────┐
│Card Title       [✓][✗]│
│───────────────────────│
│Content with minimal   │
│spacing. More info fits│
│[Btn1][Btn2]           │
└────────────────────────┘
```

### Comfortable (Default)

**Use Cases**:
- General users
- Balanced information density
- Most common use case
- Optimal for extended reading

**Characteristics**:
- Balanced spacing (12-16px padding)
- Standard fonts (14-16px base)
- Normal line height (1.5)
- Medium components (36px buttons, 40px inputs)
- Optimal readability

**Visual Example**:
```
┌──────────────────────────────┐
│  Card Title           [✓][✗] │
│  ─────────────────────────── │
│                               │
│  Content with balanced        │
│  spacing for comfort.         │
│                               │
│  [Button 1] [Button 2]        │
└──────────────────────────────┘
```

### Spacious

**Use Cases**:
- Accessibility-focused users
- Large screens (monitors, presentations)
- Users with visual impairments
- Elderly users
- Public displays

**Characteristics**:
- Maximum whitespace (16-24px padding)
- Large fonts (18-20px base)
- Relaxed line height (1.625)
- Large components (48px buttons, 52px inputs)
- Enhanced readability

**Visual Example**:
```
┌───────────────────────────────────────┐
│                                       │
│    Card Title                  [✓][✗]│
│    ───────────────────────────────── │
│                                       │
│    Content with generous spacing     │
│    for maximum readability and       │
│    accessibility.                    │
│                                       │
│    [ Button 1 ]  [ Button 2 ]        │
│                                       │
└───────────────────────────────────────┘
```

---

## Installation & Setup

### 1. Wrap Application with DensityProvider

```tsx
// src/main.tsx or src/App.tsx
import { DensityProvider } from './shared/context/DensityContext';
import { UIDensity } from './shared/theme/density';

function App() {
  return (
    <DensityProvider defaultDensity={UIDensity.Comfortable}>
      <YourApp />
    </DensityProvider>
  );
}

export default App;
```

### 2. Add Density Settings to Your UI

```tsx
import { DensitySettings } from './shared/components/DensitySettings';

// In your settings page or app bar
<DensitySettings variant="inline" />

// Or as a card in settings
<DensitySettings variant="card" showPreview={true} />

// Or in a dialog
<DensitySettings variant="dialog" onClose={() => setOpen(false)} />
```

### 3. Make Components Density-Aware

```tsx
import { useDensity } from './shared/context/DensityContext';

function MyComponent() {
  const { theme } = useDensity();

  return (
    <div style={{ padding: theme.componentPadding }}>
      Content
    </div>
  );
}
```

---

## Usage Guide

### Basic Usage

#### Using the useDensity Hook

```tsx
import { useDensity } from './shared/context/DensityContext';

function MyComponent() {
  const { density, theme, setDensity, isCompact } = useDensity();

  return (
    <div
      style={{
        padding: theme.componentPadding,
        fontSize: theme.fontSize.base,
        lineHeight: theme.lineHeight,
      }}
    >
      Current density: {density}
      {isCompact && <span>Compact mode active!</span>}
    </div>
  );
}
```

#### Using Density Styles Hook

```tsx
import { useDensityStyles } from './shared/context/DensityContext';

function MyButton() {
  const buttonStyles = useDensityStyles('button');

  return (
    <button
      style={{
        paddingLeft: buttonStyles.paddingX,
        paddingRight: buttonStyles.paddingX,
        paddingTop: buttonStyles.paddingY,
        paddingBottom: buttonStyles.paddingY,
        fontSize: buttonStyles.fontSize,
        height: buttonStyles.height,
      }}
    >
      Click me
    </button>
  );
}
```

#### Using Spacing Hook

```tsx
import { useDensitySpacing } from './shared/context/DensityContext';

function MyLayout() {
  const spacing = useDensitySpacing();

  return (
    <div style={{ gap: spacing.md }}>
      <div style={{ marginBottom: spacing.lg }}>Section 1</div>
      <div style={{ padding: spacing.sm }}>Section 2</div>
    </div>
  );
}
```

#### Using Density Value Hook

```tsx
import { useDensityValue } from './shared/context/DensityContext';

function MyGrid() {
  // Get different values based on density
  const columns = useDensityValue({
    compact: 4,
    comfortable: 3,
    spacious: 2,
  });

  const itemsPerPage = useDensityValue({
    compact: 20,
    comfortable: 15,
    spacious: 10,
  });

  return <Grid columns={columns} itemsPerPage={itemsPerPage} />;
}
```

### Material-UI Integration

```tsx
import { useDensity } from './shared/context/DensityContext';
import { densityToMuiSize } from './shared/theme/density';

function MyMuiComponent() {
  const { density, theme } = useDensity();
  const muiSize = densityToMuiSize(density); // 'small' | 'medium' | 'large'

  return (
    <>
      <Button size={muiSize} variant="contained">
        Adaptive Button
      </Button>

      <TextField size={muiSize} label="Adaptive Input" />

      <Chip label="Tag" size={muiSize} />
    </>
  );
}
```

### CSS Variables Approach

The DensityProvider automatically applies CSS variables to the document root:

```css
/* Available CSS variables */
.my-component {
  padding: var(--density-padding);
  gap: var(--density-gap);
  font-size: var(--density-font-size);
  line-height: var(--density-line-height);
  border-radius: var(--density-border-radius);
}

/* Density-specific selectors */
[data-density="compact"] .my-component {
  /* Compact-specific styles */
}

[data-density="comfortable"] .my-component {
  /* Comfortable-specific styles */
}

[data-density="spacious"] .my-component {
  /* Spacious-specific styles */
}
```

### CSS Class Name Approach

```tsx
import { useDensityClass } from './shared/context/DensityContext';

function MyComponent() {
  const className = useDensityClass('custom-component');
  // Returns: 'custom-component custom-component--compact'

  return <div className={className}>Content</div>;
}
```

```css
/* CSS file */
.custom-component--compact {
  padding: 8px;
  font-size: 12px;
}

.custom-component--comfortable {
  padding: 16px;
  font-size: 14px;
}

.custom-component--spacious {
  padding: 24px;
  font-size: 18px;
}
```

---

## API Reference

### DensityProvider

**Props**:
- `children`: React.ReactNode - Application content
- `defaultDensity?`: UIDensity - Initial density level (default: `UIDensity.Comfortable`)
- `persistKey?`: string - LocalStorage key (default: `'threatflow:ui:density'`)

**Example**:
```tsx
<DensityProvider defaultDensity={UIDensity.Compact} persistKey="my-app:density">
  <App />
</DensityProvider>
```

### useDensity Hook

**Returns**: `DensityContextValue`

```typescript
interface DensityContextValue {
  density: UIDensity;               // Current density level
  theme: DensityTheme;              // Density-specific theme values
  setDensity: (density: UIDensity) => void;  // Change density
  cycleDensity: () => void;         // Cycle through levels
  resetDensity: () => void;         // Reset to default
  applyDensity: typeof applyDensity; // Apply density function
  getDensityStyles: typeof getDensityStyles; // Get component styles
  isCompact: boolean;               // Is compact active
  isComfortable: boolean;           // Is comfortable active
  isSpaciou: boolean;               // Is spacious active
}
```

**Example**:
```tsx
const { density, theme, setDensity, isCompact } = useDensity();
```

### useDensityStyles Hook

**Parameters**: `component: 'button' | 'input' | 'card' | 'table' | 'chip'`

**Returns**: Component-specific styles

```typescript
// Example return for 'button':
{
  paddingX: 16,
  paddingY: 8,
  fontSize: '1rem',
  height: 36,
  minWidth: 80,
}
```

### useDensitySpacing Hook

**Returns**: Spacing scale object

```typescript
{
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
}
```

### useDensityFontSize Hook

**Returns**: Font size scale object

```typescript
{
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
}
```

### useDensityValue Hook

**Parameters**: `values: Record<UIDensity, T>`

**Returns**: Value for current density

**Example**:
```tsx
const columns = useDensityValue({
  compact: 4,
  comfortable: 3,
  spacious: 2,
});
```

### useDensityClass Hook

**Parameters**: `baseClass: string`

**Returns**: `string` - Class name with density modifier

**Example**:
```tsx
const className = useDensityClass('my-component');
// Returns: 'my-component my-component--comfortable'
```

### Utility Functions

#### densityToMuiSize

Converts UIDensity to Material-UI size prop.

```typescript
function densityToMuiSize(density: UIDensity): 'small' | 'medium' | 'large'
```

#### applyDensity

Applies density styles to component.

```typescript
function applyDensity(density: UIDensity): {
  padding: number;
  paddingX: number;
  paddingY: number;
  gap: number;
  fontSize: string;
  lineHeight: number;
  borderRadius: number;
}
```

#### getDensityTheme

Gets complete density theme.

```typescript
function getDensityTheme(density: UIDensity): DensityTheme
```

---

## Component Examples

### Example 1: Density-Aware Card

```tsx
import { useDensity } from './shared/context/DensityContext';

function DensityCard() {
  const { theme } = useDensity();

  return (
    <div
      style={{
        padding: theme.card.padding,
        gap: theme.card.gap,
        borderRadius: theme.card.borderRadius,
      }}
    >
      <h3 style={{ fontSize: theme.fontSize.lg }}>Card Title</h3>
      <p style={{ fontSize: theme.fontSize.md }}>Card content</p>
    </div>
  );
}
```

### Example 2: Adaptive Table

```tsx
import { useDensityStyles } from './shared/context/DensityContext';

function DensityTable() {
  const tableStyles = useDensityStyles('table');

  return (
    <table>
      <thead>
        <tr style={{ height: tableStyles.rowHeight }}>
          <th
            style={{
              paddingLeft: tableStyles.cellPaddingX,
              paddingRight: tableStyles.cellPaddingX,
              paddingTop: tableStyles.cellPaddingY,
              paddingBottom: tableStyles.cellPaddingY,
              fontSize: tableStyles.fontSize,
            }}
          >
            Header
          </th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ height: tableStyles.rowHeight }}>
          <td
            style={{
              padding: `${tableStyles.cellPaddingY}px ${tableStyles.cellPaddingX}px`,
              fontSize: tableStyles.fontSize,
            }}
          >
            Cell
          </td>
        </tr>
      </tbody>
    </table>
  );
}
```

### Example 3: Responsive Grid

```tsx
import { useDensityValue, useDensitySpacing } from './shared/context/DensityContext';

function ResponsiveGrid() {
  const columns = useDensityValue({
    compact: 4,
    comfortable: 3,
    spacious: 2,
  });

  const spacing = useDensitySpacing();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: spacing.md,
      }}
    >
      {items.map(item => (
        <div key={item.id} style={{ padding: spacing.sm }}>
          {item.content}
        </div>
      ))}
    </div>
  );
}
```

### Example 4: Adaptive Form

```tsx
import { useDensity } from './shared/context/DensityContext';
import { densityToMuiSize } from './shared/theme/density';

function AdaptiveForm() {
  const { density, theme } = useDensity();
  const muiSize = densityToMuiSize(density);

  const textareaRows = useDensityValue({
    compact: 2,
    comfortable: 4,
    spacious: 6,
  });

  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
      <TextField size={muiSize} label="Name" fullWidth />
      <TextField size={muiSize} label="Email" type="email" fullWidth />
      <TextField size={muiSize} label="Message" multiline rows={textareaRows} fullWidth />

      <div style={{ display: 'flex', gap: theme.spacing.sm }}>
        <Button variant="outlined" size={muiSize}>Cancel</Button>
        <Button variant="contained" size={muiSize}>Submit</Button>
      </div>
    </form>
  );
}
```

---

## Best Practices

### 1. Component Design

✅ **Do:**
- Use density hooks in all custom components
- Test components at all density levels
- Use semantic spacing values (sm, md, lg)
- Prefer density-aware spacing over fixed values
- Use `useDensityValue` for adaptive behavior

❌ **Don't:**
- Hard-code spacing or font sizes
- Ignore density in custom components
- Use fixed pixel values for layout
- Assume one density level
- Override density styles without good reason

### 2. Material-UI Integration

✅ **Do:**
- Use `densityToMuiSize` for MUI components
- Apply density to custom MUI themes
- Test MUI components at all densities
- Use size prop for adaptive components

❌ **Don't:**
- Mix fixed sizes with density system
- Skip density for Material-UI components
- Use sx prop to override density without reason

### 3. Performance

✅ **Do:**
- Use `useMemo` for expensive calculations
- Minimize re-renders with proper dependencies
- Cache density-dependent values
- Use CSS variables when possible

❌ **Don't:**
- Recalculate styles on every render
- Create new objects in render
- Ignore memoization opportunities

### 4. Accessibility

✅ **Do:**
- Test with screen readers at all densities
- Ensure adequate touch targets in compact mode
- Maintain WCAG AAA contrast at all densities
- Support keyboard navigation at all densities

❌ **Don't:**
- Make interactive elements too small in compact
- Reduce contrast for readability
- Skip accessibility testing per density

### 5. User Experience

✅ **Do:**
- Make density control easily accessible
- Show preview before changing density
- Persist user preference
- Provide clear density descriptions
- Default to Comfortable mode

❌ **Don't:**
- Hide density settings deeply
- Change density without user consent
- Force a specific density level
- Reset user preference without warning

---

## Migration Guide

### Migrating Existing Components

#### Step 1: Identify Hard-Coded Values

```tsx
// Before (hard-coded)
<div style={{ padding: '16px', fontSize: '14px', gap: '12px' }}>
  Content
</div>
```

#### Step 2: Replace with Density Hooks

```tsx
// After (density-aware)
import { useDensity } from './shared/context/DensityContext';

function MyComponent() {
  const { theme } = useDensity();

  return (
    <div
      style={{
        padding: theme.componentPadding,
        fontSize: theme.fontSize.md,
        gap: theme.componentGap,
      }}
    >
      Content
    </div>
  );
}
```

#### Step 3: Test at All Densities

```tsx
// In your tests or Storybook
import { DensityProvider } from './shared/context/DensityContext';
import { UIDensity } from './shared/theme/density';

// Test component at each density
<DensityProvider defaultDensity={UIDensity.Compact}>
  <MyComponent />
</DensityProvider>

<DensityProvider defaultDensity={UIDensity.Comfortable}>
  <MyComponent />
</DensityProvider>

<DensityProvider defaultDensity={UIDensity.Spacious}>
  <MyComponent />
</DensityProvider>
```

### Migration Checklist

- [ ] Wrap app with `DensityProvider`
- [ ] Add density settings to UI
- [ ] Identify components with hard-coded spacing
- [ ] Replace hard-coded values with density hooks
- [ ] Update Material-UI components with size prop
- [ ] Test all components at each density level
- [ ] Update documentation
- [ ] Train users on density feature

---

## Troubleshooting

### Common Issues

#### 1. Density Not Applying

**Symptoms**: Components don't change when density is changed

**Diagnosis**:
```tsx
// Check if DensityProvider is wrapping your app
import { useDensity } from './shared/context/DensityContext';

function Debug() {
  try {
    const { density } = useDensity();
    console.log('Density:', density);
  } catch (error) {
    console.error('Not wrapped in DensityProvider:', error);
  }
}
```

**Solutions**:
- Ensure `DensityProvider` wraps your app
- Check that components are children of `DensityProvider`
- Verify hooks are called inside components, not modules

#### 2. LocalStorage Not Persisting

**Symptoms**: Density resets on page refresh

**Diagnosis**:
```typescript
// Check localStorage
console.log(localStorage.getItem('threatflow:ui:density'));
```

**Solutions**:
- Check browser allows localStorage
- Verify no browser extensions blocking storage
- Check for localStorage quota exceeded
- Try different persist key

#### 3. Material-UI Components Not Adapting

**Symptoms**: MUI components stay same size

**Solution**:
```tsx
// Ensure you're using densityToMuiSize
import { densityToMuiSize } from './shared/theme/density';

const muiSize = densityToMuiSize(density);
<Button size={muiSize}>...</Button>
```

#### 4. CSS Variables Not Working

**Symptoms**: CSS variable styles not applying

**Diagnosis**:
```javascript
// Check if CSS variables are set
const root = document.documentElement;
console.log(root.style.getPropertyValue('--density-padding'));
```

**Solutions**:
- Ensure DensityProvider is mounted
- Check for CSS specificity conflicts
- Verify browser supports CSS variables

#### 5. Re-Render Performance

**Symptoms**: Slow performance when changing density

**Solution**:
```tsx
// Memoize density-dependent values
const styles = useMemo(() => ({
  padding: theme.componentPadding,
  fontSize: theme.fontSize.base,
}), [theme]);

return <div style={styles}>...</div>;
```

---

## Advanced Usage

### Custom Density Levels

```typescript
// Create custom density configuration
import { DensityTheme, baseSpacing, baseTypography } from './shared/theme/density';

const customTheme: DensityTheme = {
  componentPadding: baseSpacing[3],
  // ... other properties
};

// Use in custom provider
<DensityProvider customThemes={{ custom: customTheme }}>
  <App />
</DensityProvider>
```

### Density Events

```typescript
// Listen to density changes
useEffect(() => {
  const handleDensityChange = (event: CustomEvent) => {
    console.log('Density changed to:', event.detail.density);
  };

  window.addEventListener('densitychange', handleDensityChange as EventListener);

  return () => {
    window.removeEventListener('densitychange', handleDensityChange as EventListener);
  };
}, []);
```

### Conditional Rendering

```tsx
import { useDensity } from './shared/context/DensityContext';

function AdaptiveComponent() {
  const { isCompact, isComfortable, isSpaciou } = useDensity();

  if (isCompact) {
    return <CompactView />;
  }

  if (isSpaciou) {
    return <SpaciousView />;
  }

  return <ComfortableView />;
}
```

---

## References

- [Material Design Density](https://material.io/design/layout/applying-density.html)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Responsive Web Design](https://web.dev/responsive-web-design-basics/)

---

**End of Documentation**
