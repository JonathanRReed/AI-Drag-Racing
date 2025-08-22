// ESLint Flat Config for Next.js 15 + React 19 + TypeScript
// Uses eslint v9 flat config format
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import tailwind from 'eslint-plugin-tailwindcss';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  // Ignore generated and config files
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      '.vercel/**',
      '.wrangler/**',
      'public/**',
      'scripts/**',
      '*config.js',
      '*config.cjs',
      'postcss.config.js',
      'tailwind.config.js',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  // TypeScript (no type-checking to keep lint fast and minimal setup)
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        projectService: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react,
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
      tailwind,
      'unused-imports': unusedImports,
    },
    settings: {
      react: { version: 'detect' },
      tailwindcss: {
        callees: ['classnames', 'clsx', 'ctl'],
      },
    },
    rules: {
      // React & Hooks
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      // Prefer plugin to auto-remove unused imports
      'unused-imports/no-unused-imports': 'warn',

      // Next.js plugin
      '@next/next/no-html-link-for-pages': 'off',

      // TailwindCSS plugin — allow custom classnames and arbitrary values used widely here
      'tailwindcss/no-custom-classname': 'off',
      'tailwindcss/classnames-order': 'off',

      // Allow empty blocks (some provider stubs)
      'no-empty': 'off',
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'script' },
  },
];
