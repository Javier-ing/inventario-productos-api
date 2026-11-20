'use strict';

const mongoose = require('mongoose');
const { PATRON_CODIGO, LIMITES } = require('../utils/validaciones');

/**
 * Colación que ignora mayúsculas/minúsculas (strength 2) y ordena según el español.
 * Se usa en el índice único del código y en el ordenamiento por nombre.
 */
const COLACION = { locale: 'es', strength: 2 };

const esquemaProducto = new mongoose.Schema({
    codigo: {
        type: String,
        required: [true, 'El código es obligatorio'],
        trim: true,
        maxlength: [LIMITES.codigo, `El código no puede superar ${LIMITES.codigo} caracteres`],
        match: [PATRON_CODIGO, 'El código solo admite letras, números, guion y guion bajo'],
    },
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true,
        maxlength: [LIMITES.nombre, `El nombre no puede superar ${LIMITES.nombre} caracteres`],
    },
    descripcion: {
        type: String,
        trim: true,
        default: null,
        maxlength: [LIMITES.descripcion, `La descripción no puede superar ${LIMITES.descripcion} caracteres`],
    },
    precio: {
        type: Number,
        required: [true, 'El precio es obligatorio'],
        min: [0, 'El precio no puede ser negativo'],
    },
    stock: {
        type: Number,
        required: [true, 'El stock es obligatorio'],
        min: [0, 'El stock no puede ser negativo'],
        validate: {
            validator: Number.isInteger,
            message: 'El stock debe ser un número entero',
        },
    },
}, {
    collection: 'productos',
    timestamps: { createdAt: 'fechaRegistro', updatedAt: false },
    versionKey: false,
});

// El código es único sin distinguir mayúsculas (P-001 y p-001 son el mismo producto).
esquemaProducto.index({ codigo: 1 }, { unique: true, name: 'uk_producto_codigo', collation: COLACION });
// Apoya el ordenamiento alfabético del listado.
esquemaProducto.index({ nombre: 1 }, { name: 'ix_producto_nombre', collation: COLACION });

// Forma pública del documento: idProducto en lugar de _id y sin campos internos.
esquemaProducto.set('toJSON', {
    transform: (documento, crudo) => ({
        idProducto: crudo._id.toString(),
        codigo: crudo.codigo,
        nombre: crudo.nombre,
        descripcion: crudo.descripcion ?? null,
        precio: crudo.precio,
        stock: crudo.stock,
        fechaRegistro: crudo.fechaRegistro,
    }),
});

const Producto = mongoose.model('Producto', esquemaProducto);

module.exports = { Producto, COLACION };
