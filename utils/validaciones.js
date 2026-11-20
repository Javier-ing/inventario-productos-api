'use strict';

const ErrorApi = require('./ErrorApi');

const PATRON_CODIGO = /^[A-Za-z0-9_-]*$/;
const PATRON_ID = /^[a-fA-F0-9]{24}$/;
const LIMITES = { codigo: 20, nombre: 100, descripcion: 255, enterosPrecio: 10 };

/** @returns {boolean} true si el valor es un número finito (no texto, no NaN). */
function esNumero(valor) {
    return typeof valor === 'number' && Number.isFinite(valor);
}

/** @returns {boolean} true si el valor no fue enviado (undefined o null). */
function esVacio(valor) {
    return valor === undefined || valor === null;
}

/** Valida el código. Devuelve el mensaje del primer incumplimiento o null. */
function validarCodigo(codigo) {
    if (esVacio(codigo) || (typeof codigo === 'string' && codigo.trim() === '')) {
        return 'El código es obligatorio';
    }
    if (typeof codigo !== 'string') {
        return 'El código debe ser un texto';
    }
    if (codigo.trim().length > LIMITES.codigo) {
        return `El código no puede superar ${LIMITES.codigo} caracteres`;
    }
    return PATRON_CODIGO.test(codigo.trim())
        ? null
        : 'El código solo admite letras, números, guion y guion bajo';
}

/** Valida el nombre. Devuelve el mensaje del primer incumplimiento o null. */
function validarNombre(nombre) {
    if (esVacio(nombre) || (typeof nombre === 'string' && nombre.trim() === '')) {
        return 'El nombre es obligatorio';
    }
    if (typeof nombre !== 'string') {
        return 'El nombre debe ser un texto';
    }
    return nombre.trim().length > LIMITES.nombre
        ? `El nombre no puede superar ${LIMITES.nombre} caracteres`
        : null;
}

/** Valida la descripción (opcional). Devuelve el mensaje o null. */
function validarDescripcion(descripcion) {
    if (esVacio(descripcion)) {
        return null;
    }
    if (typeof descripcion !== 'string') {
        return 'La descripción debe ser un texto';
    }
    return descripcion.trim().length > LIMITES.descripcion
        ? `La descripción no puede superar ${LIMITES.descripcion} caracteres`
        : null;
}

/** Valida el precio: número, no negativo, hasta 10 enteros y 2 decimales. */
function validarPrecio(precio) {
    if (esVacio(precio)) {
        return 'El precio es obligatorio';
    }
    if (!esNumero(precio)) {
        return 'El precio debe ser un número';
    }
    if (precio < 0) {
        return 'El precio no puede ser negativo';
    }
    const centavos = precio * 100;
    const tieneMasDeDosDecimales = Math.abs(centavos - Math.round(centavos)) > 1e-6;
    const tieneMasEnterosDelPermitido = Math.floor(precio) >= 10 ** LIMITES.enterosPrecio;
    return tieneMasDeDosDecimales || tieneMasEnterosDelPermitido
        ? 'El precio admite hasta 10 enteros y 2 decimales'
        : null;
}

/** Valida el stock: entero y no negativo. */
function validarStock(stock) {
    if (esVacio(stock)) {
        return 'El stock es obligatorio';
    }
    if (!esNumero(stock) || !Number.isSafeInteger(stock)) {
        return 'El stock debe ser un número entero';
    }
    return stock < 0 ? 'El stock no puede ser negativo' : null;
}

/** Ejecuta cada validación y reúne los mensajes por campo (un mensaje por campo, siempre el mismo orden). */
function reunirErrores(cuerpo) {
    const resultados = {
        codigo: validarCodigo(cuerpo.codigo),
        nombre: validarNombre(cuerpo.nombre),
        descripcion: validarDescripcion(cuerpo.descripcion),
        precio: validarPrecio(cuerpo.precio),
        stock: validarStock(cuerpo.stock),
    };
    return Object.fromEntries(Object.entries(resultados).filter(([, mensaje]) => mensaje !== null));
}

/**
 * Valida el cuerpo de una solicitud de producto (crear o actualizar) y lo limpia.
 * @param {*} cuerpo Cuerpo recibido (req.body).
 * @returns {{codigo: string, nombre: string, descripcion: (string|null), precio: number, stock: number}}
 *     Datos listos para guardar (sin espacios sobrantes y solo con los campos permitidos).
 * @throws {ErrorApi} 400 con un mensaje por campo si algún dato no cumple las reglas.
 */
function validarProducto(cuerpo) {
    const datos = cuerpo === undefined ? {} : cuerpo;
    if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) {
        throw new ErrorApi(400, 'El cuerpo de la solicitud debe ser un objeto JSON');
    }
    const errores = reunirErrores(datos);
    if (Object.keys(errores).length > 0) {
        throw new ErrorApi(400, 'Los datos enviados no son válidos', errores);
    }
    return {
        codigo: datos.codigo.trim(),
        nombre: datos.nombre.trim(),
        descripcion: esVacio(datos.descripcion) ? null : datos.descripcion.trim(),
        precio: datos.precio,
        stock: datos.stock,
    };
}

/** @returns {boolean} true si el texto tiene la forma de un ObjectId de MongoDB (24 hexadecimales). */
function esIdValido(id) {
    return PATRON_ID.test(id);
}

module.exports = { validarProducto, esIdValido, PATRON_CODIGO, LIMITES };
