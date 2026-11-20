'use strict';

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.js'],
        testTimeout: 20000,
        // Los archivos comparten la misma base de datos de pruebas: se ejecutan uno tras otro.
        fileParallelism: false,
    },
});
