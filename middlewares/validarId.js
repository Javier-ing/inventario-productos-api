'use strict';

const ErrorApi = require('../utils/ErrorApi');
const { esIdValido } = require('../utils/validaciones');

/** Verifica que el parámetro de ruta «id» tenga el formato de un identificador de MongoDB (24 hexadecimales). */
function validarId(req, res, next, id) {
    if (!esIdValido(id)) {
        return next(new ErrorApi(400, 'El parámetro \'id\' tiene un valor no válido'));
    }
    return next();
}

module.exports = validarId;
