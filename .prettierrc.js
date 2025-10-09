module.exports = {
  // ========================================
  // CORE FORMATTING RULES
  // ========================================
  
  // Line length (80 is standard for readability)
  printWidth: 100,
  
  // Indentation
  tabWidth: 2,
  useTabs: false,
  
  // Semicolons (consistent with TypeScript best practices)
  semi: true,
  
  // Quotes (single quotes are more common in JS/TS)
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // Trailing commas (helpful for git diffs)
  trailingComma: 'es5',
  
  // Spacing
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Arrow functions
  arrowParens: 'avoid',
  
  // JSX specific
  jsxSingleQuote: false,
  jsxBracketSameLine: false,
  
  // End of line
  endOfLine: 'lf',
  
  // ========================================
  // FILE-SPECIFIC OVERRIDES
  // ========================================
  
  overrides: [
    // JSON files
    {
      files: '*.json',
      options: {
        parser: 'json',
        tabWidth: 2
      }
    },
    
    // Markdown files
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        printWidth: 80,
        proseWrap: 'always'
      }
    },
    
    // YAML files
    {
      files: ['*.yml', '*.yaml'],
      options: {
        parser: 'yaml',
        tabWidth: 2
      }
    },
    
    // Configuration files (allow longer lines)
    {
      files: [
        '*.config.{js,ts}',
        'eslint.config.js',
        'vite.config.ts',
        'tsconfig.json'
      ],
      options: {
        printWidth: 120
      }
    },
    
    // Server files (slightly different formatting)
    {
      files: ['server.ts', 'src/server/**/*.ts'],
      options: {
        printWidth: 100,
        singleQuote: true
      }
    }
  ]
};