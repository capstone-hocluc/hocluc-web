import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // tailgrids is vendored from the NextAdmin kit and kept close to upstream.
  globalIgnores(['dist', 'src/components/tailgrids']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Prop objects (columns/config/etc.) are frequently destructured with
      // some fields unused at a given call site - matches the project's
      // existing tolerance for this under the plain-JS config.
      '@typescript-eslint/no-unused-vars': ['warn', { args: 'none' }],
    },
  },
])
