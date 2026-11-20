'use strict';

const mongoose = require('mongoose');

/** Estado de la conexión con MongoDB en texto legible. */
const ESTADOS = {
    0: 'desconectada',
    1: 'conectada',
    2: 'conectando',
    3: 'desconectando',
};

/**
 * Abre la conexión con MongoDB.
 * @param {string} uri Cadena de conexión (local o MongoDB Atlas).
 * @throws {Error} Con un mensaje preciso si no se logra conectar.
 */
async function conectar(uri) {
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    } catch (error) {
        throw new Error(`No se pudo conectar con MongoDB: ${error.message}`, { cause: error });
    }
}

/** Cierra la conexión con MongoDB (si está abierta). */
async function desconectar() {
    await mongoose.disconnect();
}

/** @returns {boolean} true si la conexión está lista para recibir consultas. */
function estaConectada() {
    return mongoose.connection.readyState === 1;
}

/** @returns {string} Estado de la conexión: conectada, desconectada, conectando o desconectando. */
function estadoConexion() {
    return ESTADOS[mongoose.connection.readyState] || 'desconocido';
}

module.exports = { conectar, desconectar, estaConectada, estadoConexion };
