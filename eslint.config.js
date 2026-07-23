import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Route modules (vite-react-ssg) must export `loader`/`getStaticPaths`
    // alongside their `Component` — a framework requirement, not a fast-refresh
    // hazard. Allow those named exports to coexist with the component.
    files: ['src/pages/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowExportNames: ['loader', 'getStaticPaths'] },
      ],
    },
  },
])
