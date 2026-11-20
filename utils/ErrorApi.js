'use strict';

/**
 * Error controlado de la API: lleva el código HTTP y un mensaje preciso para el cliente.
 * Los errores que NO son ErrorApi se tratan como fallos internos (500).
 */
class ErrorApi extends Error {
    /**
     * @param {number} estado Código HTTP (400, 404, 409...).
     * @param {string} mensaje Mensaje claro para el usuario.
     * @param {Object<string, string>} [detalles] Mensaje por campo (errores de validación).
     */
    constructor(estado, mensaje, detalles) {
        super(mensaje);
        this.name = 'ErrorApi';
        this.estado = estado;
        this.detalles = detalles;
    }
}

module.exports = ErrorApi;
