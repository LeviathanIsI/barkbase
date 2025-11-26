import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        __APP_VERSION__: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Discourage console.* except for warn/error (legitimate error reporting)
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      // Prevent importing from deprecated/duplicate component locations
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/components/primitives/Badge'],
              message: 'Use @/components/ui/Badge instead - primitives/Badge is a legacy shim.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['vite.config.js', 'postcss.config.js', 'tailwind.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      sourceType: 'module',
    },
  },
])
