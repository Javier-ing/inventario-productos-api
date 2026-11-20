'use strict';

/**
 * Carga los productos de ejemplo en la base de datos de desarrollo.
 *   npm run sembrar                 → agrega los que falten (no toca los existentes)
 *   npm run sembrar -- --reiniciar  → borra todos los productos y carga los de ejemplo
 */
require('dotenv').config({ quiet: true });

const { conectar, desconectar } = require('../config/baseDatos');
const { Producto } = require('../models/Producto');

const URI_POR_DEFECTO = 'mongodb://127.0.0.1:27017/inventario_db';

const PRODUCTOS_EJEMPLO = [
    { codigo: 'P-001', nombre: 'Teclado mecánico', descripcion: 'Teclado retroiluminado', precio: 185000.5, stock: 12 },
    { codigo: 'P-002', nombre: 'Mouse inalámbrico', descripcion: 'Mouse óptico 2.4 GHz', precio: 62000, stock: 25 },
    { codigo: 'P-003', nombre: 'Monitor 24 pulgadas', descripcion: 'Monitor Full HD IPS', precio: 649900, stock: 0 },
    { codigo: 'P-004', nombre: 'Audífonos con micrófono', descripcion: 'Diadema con cable', precio: 98500, stock: 7 },
    { codigo: 'P-005', nombre: 'Cable HDMI 2m', descripcion: 'Cable HDMI 2.0 de 2 metros', precio: 18900, stock: 40 },
];

/** Inserta cada producto de ejemplo solo si su código todavía no existe. */
async function insertarFaltantes() {
    const operaciones = PRODUCTOS_EJEMPLO.map((producto) => ({
        updateOne: {
            filter: { codigo: producto.codigo },
            update: { $setOnInsert: producto },
            upsert: true,
            collation: { locale: 'es', strength: 2 },
        },
    }));
    const resultado = await Producto.bulkWrite(operaciones);
    return resultado.upsertedCount;
}

async function main() {
    await conectar(process.env.MONGODB_URI || URI_POR_DEFECTO);
    await Producto.init();
    if (process.argv.includes('--reiniciar')) {
        await Producto.deleteMany({});
        console.log('Productos anteriores eliminados.');
    }
    const nuevos = await insertarFaltantes();
    console.log(`Productos de ejemplo agregados: ${nuevos} (total en la base: ${await Producto.countDocuments()}).`);
    await desconectar();
}

main().catch(async (error) => {
    console.error(error.message);
    await desconectar();
    process.exit(1);
});
