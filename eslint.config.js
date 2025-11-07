import { defineConfig } from 'eslint/config';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const { fixupConfigRules, fixupPluginRules } = await import('@eslint/compat');

import tsParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactNative from 'eslint-plugin-react-native';
import reactHooks from 'eslint-plugin-react-hooks';
import js from '@eslint/js';

// --- 1. IMPORT GLOBALS ---
import globals from 'globals';

const { FlatCompat } = await import('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  // --- BLOCK 1: FOR YOUR APP SOURCE CODE (src) ---
  {
    // 2. SCOPE THIS CONFIG TO YOUR SRC DIRECTORY
    files: ['src/**/*.{ts,tsx,js,jsx}'],

    extends: fixupConfigRules(
      compat.extends(
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-native/all',
        'plugin:react-hooks/recommended',
        'prettier',
      ),
    ),

    languageOptions: {
      parser: tsParser,
      globals: {
        ...reactNative.environments['react-native']['react-native'],
      },
    },

    plugins: {
      '@typescript-eslint': fixupPluginRules(typescriptEslint),
      react: fixupPluginRules(react),
      'react-native': fixupPluginRules(reactNative),
      'react-hooks': fixupPluginRules(reactHooks),
    },

    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': ['warn'],
      'react-native/no-inline-styles': 'off',
    },
  },

  // --- BLOCK 2: FOR TEST & CONFIG FILES ( __tests__ & root .js) ---
  // 3. ADD THIS ENTIRE NEW BLOCK
  {
    files: [
      // Config files in root
      'jest.setup.js',
      'jest.config.js',
      'babel.config.js',
      'metro.config.js',
      'eslint.config.js',
      // All files in __tests__
      '__tests__/**/*.{ts,tsx,js,jsx}',
    ],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.jest,
        ...globals.node,
        module: 'readonly', // For 'module.exports' in config files
      },
    },
    plugins: {
      '@typescript-eslint': fixupPluginRules(typescriptEslint),
    },
    rules: {
      // Allows using require() in setup and config files
      '@typescript-eslint/no-require-imports': 'off',
      // Allows console.log in tests and setup
      'no-console': 'off',
    },
  },
]);
