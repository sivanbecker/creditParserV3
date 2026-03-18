import js from '@eslint/js';
import globals from 'globals';
import prettierPlugin from 'eslint-plugin-prettier';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';

const ignores = ['dist/**', 'node_modules/**', 'coverage/**'];

export default [
  { ignores },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...tsEslintPlugin.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      // This codebase already uses `any` in some places (typically tests / dynamic request shapes).
      // Keep the lint signal focused on correctness rather than banning `any`.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
