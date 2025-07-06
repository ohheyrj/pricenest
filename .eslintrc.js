module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
        commonjs: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    globals: {
        // Frontend globals
        'Modal': 'readonly',
        'UIComponents': 'readonly',
        'APIClient': 'readonly',
        'BookSearch': 'readonly',
        'MovieSearch': 'readonly',
        'SearchManager': 'readonly',
        'CSVImporter': 'readonly',
        'FilterControls': 'readonly',
        'FormHandler': 'readonly',
        
        // Universal export globals
        'define': 'readonly',
        'module': 'readonly',
        'exports': 'readonly',
        'require': 'readonly',
        'global': 'readonly',
        'globalThis': 'readonly',
        
        // Test globals
        'describe': 'readonly',
        'it': 'readonly',
        'expect': 'readonly',
        'beforeEach': 'readonly',
        'afterEach': 'readonly',
        'jest': 'readonly'
    },
    rules: {
        'indent': ['warn', 4, { 'SwitchCase': 1 }], // Warn instead of error for indentation
        'linebreak-style': ['error', 'unix'],
        'quotes': ['warn', 'single', { 'allowTemplateLiterals': true }],
        'semi': ['error', 'always'],
        'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
        'no-console': 'off', // Allow console for logging
        'no-undef': 'error',
        'no-case-declarations': 'warn', // Warn instead of error
        'strict': 'off' // Turn off strict mode errors
    },
    ignorePatterns: [
        'node_modules/',
        'dist/',
        'htmlcov/',
        '*.min.js',
        'webpack.config.js',
        'webpack.example.config.js'
    ]
};