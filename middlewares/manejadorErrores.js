'use strict';

const http = require('node:http');
const ErrorApi = require('../utils/ErrorApi');

/** Arma el cuerpo JSON uniforme de error que devuelve toda la API. */
function crearCuerpoError(estado, mensaje, detalles) {
    const cuerpo = {
        fecha: new Date().toISOString(),
        estado,
        error: http.STATUS_CODES[estado] || 'Error',
        mensaje,
    };
    if (detalles) {
        cuerpo.detalles = detalles;
    }
    return cuerpo;
}

/** Convierte los errores de validación de Mongoose en un mensaje por campo. */
function detallesDeValidacion(error) {
    return Object.fromEntries(Object.entries(error.errors).map(([campo, falla]) => [campo, falla.message]));
}

/**
 * Traduce cualquier error conocido a un ErrorApi (o null si es un fallo inesperado).
 * @returns {ErrorApi|null}
 */
function traducirError(error) {
    if (error instanceof ErrorApi) {
        return error;
    }
    if (error.type === 'entity.parse.failed') {
        return new ErrorApi(400, 'El cuerpo de la solicitud no es un JSON válido');
    }
    if (error.type === 'entity.too.large') {
        return new ErrorApi(413, 'El cuerpo de la solicitud es demasiado grande');
    }
    if (error.code === 11000) {
        return new ErrorApi(409, 'Ya existe un registro con el mismo valor único');
    }
    if (error.name === 'ValidationError' && error.errors) {
        return new ErrorApi(400, 'Los datos enviados no son válidos', detallesDeValidacion(error));
    }
    return null;
}

/** Responde 404 cuando la ruta no existe. */
function rutaNoEncontrada(req, res, next) {
    next(new ErrorApi(404, `No existe la ruta ${req.method} ${req.originalUrl}`));
}

/** Manejador final de errores: respuesta JSON uniforme; los fallos inesperados se registran y devuelven 500. */
// eslint-disable-next-line no-unused-vars -- Express identifica el manejador de errores por sus 4 parámetros.
function manejarErrores(error, req, res, next) {
    const traducido = traducirError(error);
    if (!traducido) {
        console.error('Error inesperado:', error);
        return res.status(500).json(crearCuerpoError(500, 'Ocurrió un error interno. Intente de nuevo más tarde'));
    }
    return res.status(traducido.estado).json(crearCuerpoError(traducido.estado, traducido.message, traducido.detalles));
}

module.exports = { rutaNoEncontrada, manejarErrores };
