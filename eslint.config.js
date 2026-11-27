import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // tailgrids is vendored from the NextAdmin kit and kept close to upstream.
  globalIgnores(['dist', 'src/components/tailgrids']),
  // assistant-ui's components are installed from its registry (components.json) and kept as they come, so a
  // reinstall or an upgrade replaces them cleanly.
  globalIgnores([
    'src/components/assistant-ui/ui',
    'src/components/assistant-ui/utils',
    'src/hooks/use-attachment-src.ts',
    'src/hooks/use-copy-to-clipboard.ts',
    'src/lib/utils.ts',
    'src/components/assistant-ui/elements/attachment-state.ts',
    'src/components/assistant-ui/elements/attachment.aui.tsx',
    'src/components/assistant-ui/elements/collapsible-root.tsx',
    'src/components/assistant-ui/elements/file.tsx',
    'src/components/assistant-ui/elements/follow-up-suggestions.aui.tsx',
    'src/components/assistant-ui/elements/image.tsx',
    'src/components/assistant-ui/elements/markdown-text.tsx',
    'src/components/assistant-ui/elements/media-player.tsx',
    'src/components/assistant-ui/elements/reasoning.aui.tsx',
    'src/components/assistant-ui/elements/reasoning.tsx',
    'src/components/assistant-ui/elements/surfaces.tsx',
    'src/components/assistant-ui/elements/thread.aui.tsx',
    'src/components/assistant-ui/elements/tool-fallback.aui.tsx',
    'src/components/assistant-ui/elements/tool-group.aui.tsx',
    'src/components/assistant-ui/elements/tooltip-icon-button.tsx',
  ]),
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
