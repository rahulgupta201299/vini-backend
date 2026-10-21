import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * Lint rules for the backend. Formatting (spaces, quotes, line length) is handled by Prettier —
 * run `npm run format`. These rules keep the code simple and consistent.
 */
export default [
  { ignores: ['node_modules/'] },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: { '@stylistic': stylistic },
    rules: {
      // Clear, modern JavaScript
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'prefer-destructuring': ['error', { object: true, array: false }],
      'no-else-return': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'default-param-last': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'multi-line'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Blank lines that make blocks easy to scan
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: ['function', 'export'] },
        { blankLine: 'always', prev: ['function', 'export'], next: '*' },
        // …but a run of one-line exports/constants can stay together
        { blankLine: 'any', prev: ['export', 'const'], next: ['export', 'const'] },
      ],
    },
  },

  // Turns off rules that would fight with Prettier's formatting
  prettier,
];
