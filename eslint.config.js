const js = require('@eslint/js');

module.exports = [
  {
    ignores: ['client/**', 'public/**', 'data/**', 'node_modules/**', '**/*.min.js'],
  },
  js.configs.recommended,
  {
    files: ['server/automation/bot/browserFactory.js'],
    languageOptions: {
      globals: {
        // Stealth init scripts execute inside the browser context, not Node
        navigator: 'readonly',
        window: 'readonly',
        document: 'readonly',
        WebGLRenderingContext: 'readonly',
        Notification: 'readonly',
        HTMLCanvasElement: 'readonly',
        CanvasRenderingContext2D: 'readonly',
      },
    },
  },
  {
    files: ['server/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        SharedArrayBuffer: 'readonly',
        Atomics: 'readonly',
        performance: 'readonly',
        fetch: 'readonly',
        Bun: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
