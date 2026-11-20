'use strict';

const ErrorApi = require('../utils/ErrorApi');
const { estaConectada } = require('../config/baseDatos');

/** Evita que las consultas queden colgadas: si MongoDB no está conectado responde 503 de inmediato. */
function exigirBaseDatos(req, res, next) {
    if (!estaConectada()) {
        return next(new ErrorApi(503, 'La base de datos no está disponible en este momento'));
    }
    return next();
}

module.exports = exigirBaseDatos;
