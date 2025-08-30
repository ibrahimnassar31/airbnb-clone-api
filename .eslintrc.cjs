module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  extends: [
    'eslint:recommended',
  ],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'warn',
    'eqeqeq': ['warn', 'smart'],
    'no-var': 'error',
    'no-throw-literal': 'error',
  },
  overrides: [
    {
      files: ['src/services/**/*.js'],
      rules: {
        // Enforce ApiError usage inside services for consistent error semantics
        'no-restricted-syntax': [
          'error',
          {
            selector: "ThrowStatement > NewExpression[callee.name='Error']",
            message: 'Use ApiError helpers (e.g., ApiError.notFound(), .badRequest()) instead of new Error() in services.',
          },
          {
            selector: 'ThrowStatement[argument.type="Literal"]',
            message: 'Throw ApiError instances, not literals.',
          },
        ],
      },
    },
  ],
  ignorePatterns: ['node_modules/', 'coverage/', 'logs/', 'dist/'],
};
