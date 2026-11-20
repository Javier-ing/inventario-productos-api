'use strict';

const js = require('@eslint/js');
const globals = require('globals');
const stylistic = require('@stylistic/eslint-plugin');

// Reglas basadas en las normas de codificación del componente «Construcción API».
module.exports = [
    { ignores: ['node_modules/', 'coverage/'] },
    js.configs.recommended,
    stylistic.configs.customize({
        indent: 4,
        quotes: 'single',
        semi: true,
        commaDangle: 'always-multiline',
        braceStyle: '1tbs',
        arrowParens: true,
    }),
    {
        files: ['**/*.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
        rules: {
            'camelcase': ['error', { properties: 'never' }],
            'max-len': ['error', { code: 120 }],
            'max-lines-per-function': ['warn', { max: 20, skipBlankLines: true, skipComments: true }],
            'prefer-const': 'error',
            'eqeqeq': 'error',
            'no-var': 'error',
        },
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: { globals: { ...globals.vitest } },
        rules: { 'max-lines-per-function': 'off' },
    },
];
