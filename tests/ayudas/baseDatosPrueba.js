'use strict';

require('dotenv').config({ quiet: true });

const { conectar, desconectar } = require('../../config/baseDatos');
const { Producto } = require('../../models/Producto');

const URI_PRUEBA = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/inventario_test';

/** Extrae el nombre de la base de datos de una cadena de conexión. */
function nombreBase(uri) {
    return new URL(uri).pathname.replace('/', '');
}

/**
 * Conecta con la base EXCLUSIVA de pruebas y prepara los índices.
 * Por seguridad se niega a trabajar si el nombre no termina en «_test» (las pruebas borran los datos).
 */
async function prepararBaseDatos() {
    const nombre = nombreBase(URI_PRUEBA);
    if (!nombre.endsWith('_test')) {
        throw new Error(`La base de pruebas debe terminar en "_test" (recibida: "${nombre}"). No se borrará nada.`);
    }
    await conectar(URI_PRUEBA);
    await Producto.init();
}

/** Deja la colección vacía antes de cada prueba. */
async function limpiarProductos() {
    await Producto.deleteMany({});
}

/** Elimina la base de pruebas y cierra la conexión. */
async function cerrarBaseDatos() {
    await Producto.db.dropDatabase();
    await desconectar();
}

module.exports = { prepararBaseDatos, limpiarProductos, cerrarBaseDatos, URI_PRUEBA };
