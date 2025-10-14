# Code Review Checklist

## Purpose
This checklist ensures consistent, high-quality code reviews across all pull requests. Use this as a guide to maintain code quality, security, and maintainability standards.

---

## 📋 General Guidelines

- [ ] **Review Scope**: Changes are focused and address a single concern
- [ ] **PR Description**: Clear description of what changed and why
- [ ] **Size**: PR is reasonably sized (< 400 lines changed ideally)
- [ ] **Breaking Changes**: Breaking changes are clearly documented
- [ ] **Related Issues**: PR is linked to relevant issues/tickets

---

## 🏗️ Code Structure

### Architecture & Design
- [ ] Changes follow established architectural patterns (feature-based structure)
- [ ] New features are placed in appropriate directories (`src/features/` or `src/shared/`)
- [ ] Components follow single responsibility principle
- [ ] Proper separation of concerns (UI, business logic, data access)
- [ ] Avoid circular dependencies
- [ ] Code is DRY (Don't Repeat Yourself) - no unnecessary duplication

### File Organization
- [ ] File and folder naming follows conventions (kebab-case for files, PascalCase for components)
- [ ] Imports are organized logically (external → internal → relative)
- [ ] No unused imports or variables
- [ ] File size is reasonable (< 400 lines; consider splitting larger files)

### Component Structure
- [ ] Components have clear, single purpose
- [ ] Proper component composition (avoid God components)
- [ ] Custom hooks are used for reusable logic
- [ ] Context providers are not over-nested
- [ ] Higher-order components (HOCs) are used appropriately

---

## 📖 Readability

### Naming Conventions
- [ ] Variable names are descriptive and meaningful
- [ ] Function names clearly describe their purpose (use verbs: `handleClick`, `fetchData`)
- [ ] Boolean variables/functions use `is`, `has`, `should` prefixes
- [ ] Constants use UPPER_SNAKE_CASE
- [ ] Avoid abbreviations unless widely understood
- [ ] Type/interface names are descriptive and use PascalCase

### Code Clarity
- [ ] Code is self-documenting (clear variable/function names)
- [ ] Complex logic is broken down into smaller, named functions
- [ ] Magic numbers are replaced with named constants
- [ ] Ternary operators are not nested (max 1 level)
- [ ] No commented-out code (use version control instead)
- [ ] No console.log statements in production code (use logger utility)

### Formatting
- [ ] Code follows project's ESLint rules
- [ ] Consistent indentation (2 spaces for JS/TS/TSX)
- [ ] Proper spacing around operators and after commas
- [ ] Max line length respected (100-120 characters)
- [ ] Logical grouping with blank lines between sections

---

## ⚠️ Error Handling

### Error Management
- [ ] All async operations have proper error handling (try-catch or .catch())
- [ ] Errors are caught at appropriate levels
- [ ] Error messages are user-friendly and actionable
- [ ] Errors are logged with sufficient context (use logger utility)
- [ ] No empty catch blocks (at minimum, log the error)
- [ ] Custom error classes are used where appropriate

### Validation
- [ ] Input validation is performed before processing
- [ ] Edge cases are handled (null, undefined, empty arrays/objects)
- [ ] Form validation provides clear feedback
- [ ] API responses are validated before use
- [ ] Type guards are used for runtime type checking

### Resilience
- [ ] Loading states are shown for async operations
- [ ] Error states provide recovery options (retry, fallback)
- [ ] Network errors are handled gracefully
- [ ] Graceful degradation for missing features/data
- [ ] No unhandled promise rejections

---

## 📚 Documentation

### Code Comments
- [ ] Complex logic has explanatory comments
- [ ] **Why** is documented (not **what** - code should show what)
- [ ] TODOs include owner and issue number (`// TODO(username): Fix X - Issue #123`)
- [ ] No misleading or outdated comments
- [ ] JSDoc comments for public APIs and complex functions

### Type Definitions
- [ ] All functions have proper TypeScript types (no `any` unless absolutely necessary)
- [ ] Interfaces/types are well-documented with comments
- [ ] Complex types are exported and reused
- [ ] Generic types are used appropriately
- [ ] Discriminated unions for complex state types

### Documentation Files
- [ ] README.md is updated if public API changes
- [ ] CLAUDE.md is updated if architecture/commands change
- [ ] New features have usage examples
- [ ] Breaking changes are documented in CHANGELOG (if applicable)
- [ ] Environment variables are documented in .env.example

---

## ⚡ Performance

### React Performance
- [ ] Components are memoized where appropriate (React.memo)
- [ ] useMemo for expensive computations
- [ ] useCallback for functions passed to memoized child components
- [ ] Context values are memoized to prevent unnecessary re-renders
- [ ] Avoid unnecessary re-renders (check with React DevTools Profiler)
- [ ] Large lists use virtualization (react-window) if > 100 items

### Code Efficiency
- [ ] Avoid unnecessary loops or nested loops
- [ ] Use efficient data structures (Map/Set vs Array for lookups)
- [ ] Debounce/throttle expensive operations (search, resize, scroll)
- [ ] Lazy load heavy components and routes
- [ ] Images are optimized and use appropriate formats
- [ ] Large dependencies are code-split

### Network Performance
- [ ] API calls are not made in loops
- [ ] Data is cached appropriately (React Query)
- [ ] Pagination/infinite scroll for large datasets
- [ ] GraphQL queries request only needed fields
- [ ] Proper use of HTTP caching headers

### Bundle Size
- [ ] No large dependencies added without justification
- [ ] Tree-shakeable imports (import specific exports, not entire libraries)
- [ ] Webpack bundle analyzer used for significant changes
- [ ] Dynamic imports for code splitting

---

## 🔒 Security

### Input Security
- [ ] User input is sanitized before use (XSS prevention)
- [ ] SQL injection prevention (use parameterized queries)
- [ ] No `eval()` or `Function()` constructor
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] File uploads have type/size validation

### Authentication & Authorization
- [ ] Authentication checks are in place for protected routes
- [ ] Authorization checks verify user permissions
- [ ] Tokens/credentials are never logged or exposed
- [ ] Session timeout is handled appropriately
- [ ] CSRF protection for state-changing operations

### Data Protection
- [ ] Sensitive data is not stored in localStorage (use secure HTTP-only cookies)
- [ ] API keys and secrets use environment variables
- [ ] No secrets committed to repository
- [ ] PII (Personally Identifiable Information) is handled according to regulations
- [ ] Encryption is used for sensitive data in transit and at rest

### Dependencies
- [ ] No known vulnerabilities in dependencies (`npm audit`)
- [ ] Dependencies are from trusted sources
- [ ] Minimal dependencies are used (avoid bloat)
- [ ] Dependency versions are pinned or use `^` for minor updates only

### API Security
- [ ] CORS configuration is restrictive (not `*` in production)
- [ ] Rate limiting is implemented for API endpoints
- [ ] SSRF (Server-Side Request Forgery) protection is in place
- [ ] Helmet.js is used for HTTP header security
- [ ] API endpoints validate input and enforce limits

---

## 📏 Coding Standards

### TypeScript
- [ ] Strict mode is enabled and followed
- [ ] No `any` type (use `unknown` and type guards if needed)
- [ ] Interfaces vs Types used consistently (prefer interfaces for objects)
- [ ] Enums used appropriately (const enums for performance)
- [ ] Type assertions are justified and safe
- [ ] `strictNullChecks` violations are addressed

### React
- [ ] Functional components are used (no class components)
- [ ] Hooks follow Rules of Hooks (only at top level, only in functions)
- [ ] useEffect dependencies are complete and correct
- [ ] Event handlers don't cause memory leaks (cleanup in useEffect)
- [ ] PropTypes or TypeScript types for all props
- [ ] Fragments used instead of unnecessary divs

### CSS/Styling
- [ ] Consistent styling approach (Material-UI theme system)
- [ ] No inline styles unless dynamic
- [ ] Theme tokens used for colors, spacing, typography
- [ ] Responsive design principles followed
- [ ] Accessibility contrast ratios met (WCAG AA)
- [ ] No CSS conflicts or specificity issues

### Testing
- [ ] Unit tests cover critical logic paths
- [ ] Tests are readable and well-named
- [ ] Tests are deterministic (no flaky tests)
- [ ] Mocks are used appropriately
- [ ] Test coverage meets project standards (aim for 80%+)
- [ ] Integration tests for critical user flows

---

## ♿ Accessibility

### WCAG Compliance
- [ ] Semantic HTML elements used (`<button>`, `<nav>`, `<main>`, etc.)
- [ ] ARIA labels provided where needed
- [ ] Keyboard navigation works properly (Tab, Enter, Esc)
- [ ] Focus states are visible and logical
- [ ] Color is not the only means of conveying information
- [ ] Text has sufficient contrast (4.5:1 for normal, 3:1 for large)

### Screen Readers
- [ ] All images have alt text
- [ ] Form inputs have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Loading states are announced
- [ ] Modal dialogs trap focus appropriately

---

## 🧪 Testing

### Test Coverage
- [ ] New code has accompanying tests
- [ ] Critical paths are tested (happy path + edge cases)
- [ ] Tests pass locally and in CI/CD
- [ ] Snapshots are reviewed and intentional
- [ ] Integration tests for complex interactions

### Test Quality
- [ ] Tests are independent and can run in any order
- [ ] Test names clearly describe what is being tested
- [ ] AAA pattern: Arrange, Act, Assert
- [ ] No hardcoded values (use factories/fixtures)
- [ ] Tests run quickly (mock external dependencies)

---

## 🚀 Deployment

### Build Process
- [ ] Code builds successfully without warnings
- [ ] TypeScript compilation has no errors
- [ ] Linting passes with no warnings (`npm run lint`)
- [ ] No build-time console errors
- [ ] Production build is tested locally (`npm run preview`)

### Environment Configuration
- [ ] Environment-specific configs are properly set
- [ ] Feature flags are used for gradual rollouts
- [ ] Database migrations are backwards compatible
- [ ] Rollback plan exists for breaking changes

---

## 📝 Git & Version Control

### Commits
- [ ] Commit messages are clear and follow conventions
- [ ] Commits are atomic (single logical change per commit)
- [ ] No merge commits in PR (rebase instead)
- [ ] No sensitive data in commit history

### Branch Management
- [ ] Branch name follows conventions (`feature/`, `fix/`, `refactor/`)
- [ ] Branch is up-to-date with main/master
- [ ] No unnecessary merge conflicts

---

## 🎯 Checklist Summary

### Must-Haves (Blocking Issues)
- [ ] **No breaking changes without migration plan**
- [ ] **No security vulnerabilities**
- [ ] **No unhandled errors or crashes**
- [ ] **TypeScript compilation succeeds**
- [ ] **All tests pass**

### Should-Haves (Non-Blocking but Important)
- [ ] **Code follows project style guide**
- [ ] **Adequate test coverage**
- [ ] **Performance is acceptable**
- [ ] **Documentation is updated**
- [ ] **Accessibility is considered**

---

## 💡 Best Practices

### Before Review
1. Self-review your code first
2. Run tests and linting locally
3. Check for console errors/warnings
4. Review the diff to ensure no unintended changes
5. Update documentation as needed

### During Review
1. Be constructive and specific in feedback
2. Distinguish between "must fix" and "nice to have"
3. Approve if changes meet standards, even if not perfect
4. Consider the bigger picture, not just code style
5. Ask questions if something is unclear

### After Review
1. Respond to all comments (resolve or discuss)
2. Re-request review after significant changes
3. Ensure CI/CD passes before merging
4. Verify deployment in staging environment
5. Monitor production for issues post-merge

---

## 📞 Questions or Concerns?

If you're unsure about any item on this checklist:
1. Ask the team in your pull request
2. Reference the project's architectural documentation
3. Consult with the tech lead or senior developers
4. Check existing code for patterns and examples

---

## 🔄 Checklist Updates

This checklist is a living document. Suggest improvements via pull request to keep it relevant and useful.

**Last Updated**: 2025-10-10
**Version**: 1.0.0
