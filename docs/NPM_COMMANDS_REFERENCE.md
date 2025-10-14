# NPM Commands Reference Guide

**Essential npm Commands for Node.js Development**

A comprehensive guide to npm commands crucial for project dependency management, development workflow, and maintenance.

---

## Table of Contents
1. [Package Installation](#1-package-installation)
2. [Dependency Management](#2-dependency-management)
3. [Package Information](#3-package-information)
4. [Scripts Execution](#4-scripts-execution)
5. [Version Management](#5-version-management)
6. [Security & Auditing](#6-security--auditing)
7. [Publishing & Registry](#7-publishing--registry)
8. [Troubleshooting](#8-troubleshooting)
9. [Advanced Commands](#9-advanced-commands)
10. [Best Practices](#10-best-practices)

---

## 1. Package Installation

### Install All Dependencies
```bash
npm install
# or shorthand
npm i
```
**What it does**: Installs all dependencies listed in `package.json`
**When to use**: After cloning a project, after pulling changes that modify dependencies
**Result**: Creates/updates `node_modules/` and `package-lock.json`

**Example**:
```bash
# Clone a repository
git clone https://github.com/user/project.git
cd project

# Install all dependencies
npm install

# Output:
# added 1337 packages in 15s
```

---

### Install a Package (Production Dependency)
```bash
npm install <package-name>
# or
npm install <package-name>@<version>
```
**What it does**: Installs package and adds to `dependencies` in `package.json`
**When to use**: Adding libraries needed in production

**Examples**:
```bash
# Install latest version
npm install express

# Install specific version
npm install react@18.2.0

# Install version range
npm install lodash@^4.17.0

# Install multiple packages
npm install express body-parser cors
```

**Result in package.json**:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "react": "18.2.0",
    "lodash": "^4.17.21"
  }
}
```

---

### Install Development Dependency
```bash
npm install --save-dev <package-name>
# or shorthand
npm install -D <package-name>
```
**What it does**: Installs package and adds to `devDependencies`
**When to use**: Adding tools for development/testing (not needed in production)

**Examples**:
```bash
# Install testing framework
npm install --save-dev jest

# Install build tools
npm install -D @vitejs/plugin-react vite

# Install linters
npm install -D eslint prettier

# Install type definitions
npm install -D @types/react @types/node
```

**Result in package.json**:
```json
{
  "devDependencies": {
    "jest": "^29.5.0",
    "vite": "^5.0.0",
    "eslint": "^8.40.0",
    "@types/react": "^18.2.0"
  }
}
```

---

### Install Package Globally
```bash
npm install --global <package-name>
# or shorthand
npm install -g <package-name>
```
**What it does**: Installs package system-wide (not in project)
**When to use**: CLI tools you use across multiple projects

**Examples**:
```bash
# Install globally
npm install -g typescript
npm install -g nodemon
npm install -g create-react-app

# Now available as commands
tsc --version
nodemon app.js
create-react-app my-app
```

**⚠️ Caution**: Global installs can cause version conflicts. Consider using `npx` instead.

---

### Install from Different Sources
```bash
# Install from GitHub
npm install user/repo
npm install user/repo#branch
npm install github:user/repo

# Install from tarball URL
npm install https://example.com/package.tgz

# Install from local folder
npm install ../local-package

# Install from local tarball
npm install ./package.tgz
```

**Examples**:
```bash
# Install from GitHub main branch
npm install facebook/react

# Install from specific branch
npm install facebook/react#experimental

# Install from local development package
npm install ../my-shared-library
```

---

## 2. Dependency Management

### Uninstall a Package
```bash
npm uninstall <package-name>
# or
npm remove <package-name>
npm rm <package-name>
```
**What it does**: Removes package from `node_modules/` and `package.json`

**Examples**:
```bash
# Uninstall production dependency
npm uninstall lodash

# Uninstall dev dependency
npm uninstall --save-dev jest

# Uninstall global package
npm uninstall -g typescript

# Uninstall multiple packages
npm uninstall react react-dom
```

---

### Update Packages
```bash
# Update all packages (respecting semver ranges)
npm update

# Update specific package
npm update <package-name>

# Update to latest (ignore semver)
npm install <package-name>@latest
```

**Examples**:
```bash
# Update all packages within semver ranges
npm update

# Update specific package
npm update react

# Force update to absolute latest
npm install react@latest

# Update all to latest (dangerous!)
npm install $(npm outdated -g --parseable | cut -d: -f4)@latest
```

**package.json semver ranges**:
```json
{
  "dependencies": {
    "package-a": "1.2.3",      // Exact version
    "package-b": "^1.2.3",     // Compatible (>=1.2.3 <2.0.0)
    "package-c": "~1.2.3",     // Approximately (>=1.2.3 <1.3.0)
    "package-d": ">=1.2.3",    // Greater or equal
    "package-e": "*",          // Any version (dangerous!)
    "package-f": "latest"      // Latest (dangerous!)
  }
}
```

---

### Check Outdated Packages
```bash
npm outdated
```
**What it does**: Shows packages that have newer versions available

**Example Output**:
```
Package     Current   Wanted   Latest   Location
react       18.2.0    18.2.0   18.3.1   node_modules/react
lodash      4.17.19   4.17.21  4.17.21  node_modules/lodash
express     4.17.1    4.18.2   5.0.0    node_modules/express
```

**Columns explained**:
- **Current**: Version currently installed
- **Wanted**: Max version matching semver range in package.json
- **Latest**: Absolute latest version published
- **Location**: Where the package is installed

---

### Clean Install (CI/CD)
```bash
npm ci
```
**What it does**: Clean install using exact versions from `package-lock.json`
**When to use**: CI/CD pipelines, production deployments
**Differences from `npm install`**:
- Deletes `node_modules/` before installing
- Uses exact versions from lock file
- Fails if package.json and lock file are out of sync
- Faster and more reliable

**Examples**:
```bash
# In CI/CD pipeline
npm ci
npm run test
npm run build

# Before production deployment
npm ci --production
npm start
```

---

### Prune Unused Packages
```bash
npm prune

# Prune devDependencies (production mode)
npm prune --production
```
**What it does**: Removes packages not listed in `package.json`
**When to use**: After manually editing package.json, cleaning up

**Example**:
```bash
# Remove packages not in package.json
npm prune

# Output:
# removed 15 packages in 2s
```

---

## 3. Package Information

### List Installed Packages
```bash
# List all packages
npm list
npm ls

# List only top-level packages
npm list --depth=0

# List globally installed packages
npm list -g --depth=0

# List in JSON format
npm list --json
```

**Example Output**:
```
myproject@1.0.0
├── express@4.18.2
├── react@18.2.0
└─┬ vite@5.0.0
  ├── esbuild@0.19.0
  └── rollup@4.0.0
```

---

### View Package Details
```bash
# View package information
npm view <package-name>

# View specific field
npm view <package-name> version
npm view <package-name> versions
npm view <package-name> description
npm view <package-name> repository

# View all versions
npm view <package-name> versions --json
```

**Examples**:
```bash
# View react package info
npm view react

# View all available versions
npm view react versions

# View latest version
npm view react version

# View repository URL
npm view react repository.url

# Output:
# https://github.com/facebook/react.git
```

---

### Search Packages
```bash
npm search <keyword>

# Limit results
npm search <keyword> --searchlimit=10
```

**Example**:
```bash
npm search authentication

# Output:
# NAME              | DESCRIPTION           | AUTHOR
# passport          | Simple authentication | =jaredhanson
# jsonwebtoken      | JWT implementation    | =auth0
```

---

### Show Package Documentation
```bash
npm docs <package-name>

# Show repository
npm repo <package-name>

# Show bugs/issues page
npm bugs <package-name>

# Show homepage
npm home <package-name>
```

**Examples**:
```bash
# Open React documentation in browser
npm docs react

# Open React repository
npm repo react

# Open React issues page
npm bugs react
```

---

## 4. Scripts Execution

### Run npm Scripts
```bash
npm run <script-name>

# Run with arguments
npm run <script-name> -- --arg1 --arg2
```

**Common package.json scripts**:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "prepare": "husky install"
  }
}
```

**Examples**:
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run tests with coverage
npm run test -- --coverage

# Run linter
npm run lint

# Run linter with fix
npm run lint -- --fix
```

---

### Special Scripts (No 'run' needed)
```bash
npm start       # Runs "start" script
npm test        # Runs "test" script
npm stop        # Runs "stop" script
npm restart     # Runs "restart" script (or stop + start)
```

**Examples**:
```bash
# These are equivalent
npm start
npm run start

# These are equivalent
npm test
npm run test
```

---

### List Available Scripts
```bash
npm run

# Or
npm run-script
```

**Example Output**:
```
Scripts available in myproject@1.0.0 via `npm run-script`:
  dev
    vite
  build
    tsc && vite build
  test
    jest
  lint
    eslint .
```

---

### Run Script from Another Package
```bash
npx <package-name> [args]
```
**What it does**: Executes package binary without installing globally
**When to use**: One-time executions, avoiding global installs

**Examples**:
```bash
# Run create-react-app without global install
npx create-react-app my-app

# Run specific version
npx create-react-app@latest my-app

# Run local package binary
npx eslint .

# Run TypeScript compiler
npx tsc --init

# Run package.json script from dependency
npx --package=typescript tsc --version
```

**Benefits of npx**:
- No global installation needed
- Always uses latest version (unless specified)
- Runs binaries from local node_modules
- Great for CI/CD scripts

---

## 5. Version Management

### View npm Version
```bash
npm --version
npm -v

# View Node.js version
node --version
node -v
```

---

### Update npm Itself
```bash
# Update npm to latest
npm install -g npm@latest

# Update to specific version
npm install -g npm@9.8.0

# Check for npm updates
npm outdated -g npm
```

---

### Manage Package Version
```bash
# View current version
npm version

# Increment version (updates package.json)
npm version patch    # 1.0.0 -> 1.0.1
npm version minor    # 1.0.0 -> 1.1.0
npm version major    # 1.0.0 -> 2.0.0

# Set specific version
npm version 2.3.4

# Prerelease versions
npm version prepatch   # 1.0.0 -> 1.0.1-0
npm version preminor   # 1.0.0 -> 1.1.0-0
npm version premajor   # 1.0.0 -> 2.0.0-0
npm version prerelease # 1.0.0-0 -> 1.0.0-1
```

**Example Workflow**:
```bash
# Make changes to code
# ...

# Bump version and create git tag
npm version patch

# Output:
# v1.0.1

# Push changes and tags
git push && git push --tags
```

---

## 6. Security & Auditing

### Audit Dependencies
```bash
# Check for vulnerabilities
npm audit

# Get detailed report
npm audit --json

# Only show production dependencies
npm audit --production
```

**Example Output**:
```
found 3 vulnerabilities (1 low, 2 high)
  run `npm audit fix` to fix them, or `npm audit` for details
```

---

### Fix Vulnerabilities
```bash
# Automatically fix vulnerabilities
npm audit fix

# Fix and update to latest semver-compatible
npm audit fix --force

# Dry run (see what would change)
npm audit fix --dry-run
```

**Example**:
```bash
# Check for issues
npm audit

# Fix non-breaking changes
npm audit fix

# Fix all (may include breaking changes)
npm audit fix --force
```

---

### Check Specific Package
```bash
# Check if package is safe
npm audit <package-name>

# View security advisories
npm view <package-name> security
```

---

## 7. Publishing & Registry

### Initialize New Package
```bash
npm init

# With defaults
npm init -y

# Using initializer
npm init react-app my-app
npm init vite@latest
```

**Example**:
```bash
# Create new package interactively
npm init

# Output prompts:
# package name: (my-package)
# version: (1.0.0)
# description: My awesome package
# entry point: (index.js)
# ...

# Quick init with defaults
npm init -y
```

---

### Login to npm Registry
```bash
npm login

# Specify registry
npm login --registry=https://registry.npmjs.org
```

---

### Publish Package
```bash
# Publish to npm
npm publish

# Publish with tag
npm publish --tag beta

# Publish dry-run (test without publishing)
npm publish --dry-run

# Publish scoped package as public
npm publish --access public
```

**Example Workflow**:
```bash
# 1. Update version
npm version patch

# 2. Test publish
npm publish --dry-run

# 3. Actually publish
npm publish

# 4. Verify
npm view my-package
```

---

### Unpublish Package
```bash
# Unpublish specific version
npm unpublish <package-name>@<version>

# Unpublish entire package (within 72 hours)
npm unpublish <package-name> --force
```

**⚠️ Warning**: Unpublishing is permanent and can break dependents!

---

### Manage Package Access
```bash
# Add collaborator
npm owner add <username> <package-name>

# Remove collaborator
npm owner remove <username> <package-name>

# List owners
npm owner ls <package-name>
```

---

## 8. Troubleshooting

### Clear npm Cache
```bash
# Clear cache
npm cache clean --force

# Verify cache integrity
npm cache verify
```

**When to use**:
- Installation errors
- Corrupted packages
- Weird behavior after updates

**Example**:
```bash
# Clear cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

---

### Rebuild Native Modules
```bash
npm rebuild

# Rebuild specific package
npm rebuild <package-name>
```

**When to use**:
- After Node.js version upgrade
- Native module compilation errors
- Binary compatibility issues

---

### Diagnose Issues
```bash
# Show npm configuration
npm config list

# Check for errors
npm doctor

# Verbose logging
npm install --verbose

# Debug logging
npm install --loglevel=verbose
npm install --dd
```

**Example**:
```bash
# Run npm doctor
npm doctor

# Output:
# ✓ npm ping
# ✓ npm -v
# ✓ node -v
# ✓ npm config get registry
# ✓ which git
# ✓ Perms check on cached files
# ✓ Perms check on local bin folder
# ✓ Verify cache contents
```

---

### Fix Lock File Issues
```bash
# Regenerate package-lock.json
rm package-lock.json
npm install

# Force update lock file
npm install --package-lock-only
```

---

### Reset Everything
```bash
# Nuclear option - complete clean reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**When to use**: Last resort for unsolvable dependency issues

---

## 9. Advanced Commands

### Link Local Package
```bash
# In package directory
npm link

# In project using the package
npm link <package-name>

# Unlink
npm unlink <package-name>
```

**Use Case**: Local development of dependencies

**Example**:
```bash
# In ~/my-library
npm link

# In ~/my-project
npm link my-library

# Now changes in my-library are immediately reflected in my-project
```

---

### Set npm Configuration
```bash
# Set config value
npm config set <key> <value>

# Get config value
npm config get <key>

# Delete config value
npm config delete <key>

# Edit config file
npm config edit

# List all config
npm config list
```

**Common Configurations**:
```bash
# Set registry
npm config set registry https://registry.npmjs.org

# Set proxy
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Set default author
npm config set init-author-name "Your Name"
npm config set init-author-email "you@example.com"

# Set default license
npm config set init-license "MIT"

# Always use exact versions
npm config set save-exact true

# Set log level
npm config set loglevel warn
```

---

### Create Package Alias
```bash
npm install <alias>@npm:<package-name>
```

**Example**:
```bash
# Install lodash as underscore alias
npm install underscore@npm:lodash

# Use in code
import _ from 'underscore'; // Actually lodash
```

---

### Run Multiple Scripts
```bash
# Sequential execution (with &&)
npm run lint && npm run test && npm run build

# Parallel execution (requires npm-run-all)
npm install -D npm-run-all
npm-run-all --parallel lint test
```

**package.json example**:
```json
{
  "scripts": {
    "lint": "eslint .",
    "test": "jest",
    "build": "vite build",
    "validate": "npm run lint && npm run test && npm run build",
    "dev:all": "npm-run-all --parallel dev:server dev:client"
  }
}
```

---

### Custom npm Registry
```bash
# Use custom registry for install
npm install --registry https://custom-registry.com

# Set as default
npm config set registry https://custom-registry.com

# Per-package registry (using .npmrc)
@mycompany:registry=https://custom-registry.com
```

---

## 10. Best Practices

### Dependency Management

✅ **DO**:
- Use `package-lock.json` and commit it to version control
- Use `npm ci` in CI/CD pipelines
- Specify version ranges wisely (`^` for minor updates)
- Regularly audit dependencies (`npm audit`)
- Keep dependencies up to date
- Use `devDependencies` for development tools

❌ **DON'T**:
- Delete `package-lock.json` without good reason
- Use `*` or `latest` for versions in production
- Install global packages unnecessarily
- Commit `node_modules/` to git
- Mix package managers (npm, yarn, pnpm)

---

### Security

```bash
# Regular security checks
npm audit

# Before production deployment
npm ci --production
npm audit --production

# Update vulnerable dependencies
npm audit fix

# Use .npmrc for private packages
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

---

### Performance

```bash
# Use npm ci in CI/CD (faster, deterministic)
npm ci

# Install only production dependencies
npm ci --production

# Skip optional dependencies
npm install --no-optional

# Use npm cache
npm config set cache ~/.npm-cache
```

---

### Version Control

**.gitignore**:
```
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm
.env
```

**Commit**:
- ✅ `package.json`
- ✅ `package-lock.json`
- ❌ `node_modules/`

---

### Scripts Organization

**package.json**:
```json
{
  "scripts": {
    "// Development": "",
    "dev": "vite",
    "dev:full": "concurrently \"npm run dev\" \"npm run server\"",

    "// Building": "",
    "build": "tsc && vite build",
    "build:prod": "NODE_ENV=production npm run build",

    "// Testing": "",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",

    "// Quality": "",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",

    "// Hooks": "",
    "prepare": "husky install",
    "pre-commit": "lint-staged",

    "// Utilities": "",
    "clean": "rm -rf dist node_modules",
    "reinstall": "npm run clean && npm install"
  }
}
```

---

## Quick Reference Card

### Most Used Commands

```bash
# Installation
npm install                    # Install all dependencies
npm install <package>          # Install package
npm install -D <package>       # Install dev dependency
npm install -g <package>       # Install globally

# Maintenance
npm update                     # Update packages
npm outdated                   # Check for updates
npm audit                      # Security check
npm audit fix                  # Fix vulnerabilities

# Scripts
npm run <script>               # Run script
npm start                      # Run start script
npm test                       # Run tests

# Information
npm list --depth=0             # List packages
npm view <package>             # Package info
npm search <keyword>           # Search packages

# Troubleshooting
npm cache clean --force        # Clear cache
npm rebuild                    # Rebuild packages
npm ci                         # Clean install

# Publishing
npm version patch              # Bump version
npm publish                    # Publish package
```

---

## Common Workflows

### New Project Setup
```bash
# 1. Initialize project
npm init -y

# 2. Install dependencies
npm install express
npm install -D nodemon typescript

# 3. Create scripts in package.json
# ...

# 4. Install and commit
npm install
git add package.json package-lock.json
git commit -m "Initial setup"
```

---

### Clone and Run Existing Project
```bash
# 1. Clone repository
git clone <repo-url>
cd <project>

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev
```

---

### Update Dependencies
```bash
# 1. Check for outdated packages
npm outdated

# 2. Update within semver ranges
npm update

# 3. Update to latest (carefully!)
npm install <package>@latest

# 4. Test thoroughly
npm test

# 5. Commit changes
git add package.json package-lock.json
git commit -m "Update dependencies"
```

---

### Pre-Production Deployment
```bash
# 1. Security audit
npm audit
npm audit fix

# 2. Clean install
npm ci --production

# 3. Run tests
npm test

# 4. Build
npm run build

# 5. Deploy
# ...
```

---

## Resources

### Official Documentation
- [npm Docs](https://docs.npmjs.com/)
- [package.json Reference](https://docs.npmjs.com/cli/v9/configuring-npm/package-json)
- [npm CLI Reference](https://docs.npmjs.com/cli/v9/commands)

### Tools
- [npm-check-updates](https://www.npmjs.com/package/npm-check-updates) - Update package.json versions
- [depcheck](https://www.npmjs.com/package/depcheck) - Find unused dependencies
- [npm-run-all](https://www.npmjs.com/package/npm-run-all) - Run multiple scripts
- [husky](https://www.npmjs.com/package/husky) - Git hooks
- [lint-staged](https://www.npmjs.com/package/lint-staged) - Run linters on staged files

### Security
- [Snyk](https://snyk.io/) - Dependency security scanner
- [npm audit](https://docs.npmjs.com/cli/v9/commands/npm-audit) - Built-in security audit
- [Socket](https://socket.dev/) - Supply chain security

---

**Last Updated**: October 10, 2025
**npm Version**: 10.x
**Node.js Version**: 20.x LTS

---

**Pro Tip**: Use `npm help <command>` to get detailed help for any npm command!

```bash
npm help install
npm help audit
npm help scripts
```
