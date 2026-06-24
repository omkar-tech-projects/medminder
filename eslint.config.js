const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  ...expoConfig,
  prettier,
  {
    plugins: { prettier: prettierPlugin },
    rules: {
      'prettier/prettier': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'react/display-name': 'off',
      // React DOM rule — produces false positives for RN Animated.Value + PanResponder patterns
      'react-hooks/refs': 'off',
      // Flags async state updates inside effects — false positive for standard data-fetch patterns
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    ignores: ['node_modules/', '.expo/', 'dist/', 'src/db/migrations/'],
  },
];
