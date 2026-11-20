'use strict';

const { validarProducto, esIdValido } = require('../utils/validaciones');
const ErrorApi = require('../utils/ErrorApi');

const valido = { codigo: 'P-100', nombre: 'Producto', descripcion: 'Texto', precio: 1000, stock: 5 };

/** Ejecuta la validación y devuelve los detalles por campo del error (o null si no hubo error). */
function detallesDe(cuerpo) {
    try {
        validarProducto(cuerpo);
        return null;
    } catch (error) {
        expect(error).toBeInstanceOf(ErrorApi);
        expect(error.estado).toBe(400);
        return error.detalles || { cuerpo: error.message };
    }
}

describe('validarProducto - datos correctos', () => {
    test('acepta un producto completo', () => {
        expect(validarProducto(valido)).toEqual(valido);
    });

    test('quita espacios sobrantes y usa null si no hay descripción', () => {
        const datos = validarProducto({ codigo: ' P-1 ', nombre: '  Cable  ', precio: 0, stock: 0 });
        expect(datos).toEqual({ codigo: 'P-1', nombre: 'Cable', descripcion: null, precio: 0, stock: 0 });
    });

    test('solo devuelve los campos permitidos', () => {
        const datos = validarProducto({ ...valido, idProducto: 'x', fechaRegistro: 'y', otro: 1 });
        expect(Object.keys(datos)).toEqual(['codigo', 'nombre', 'descripcion', 'precio', 'stock']);
    });

    test.each([
        ['precio con 2 decimales', { precio: 185000.5 }],
        ['precio 0.07 (decimal binario inexacto)', { precio: 0.07 }],
        ['precio máximo 9999999999.99', { precio: 9999999999.99 }],
        ['código de 20 caracteres', { codigo: 'A'.repeat(20) }],
        ['nombre de 100 caracteres', { nombre: 'N'.repeat(100) }],
        ['descripción de 255 caracteres', { descripcion: 'D'.repeat(255) }],
        ['descripción null', { descripcion: null }],
    ])('acepta %s', (_titulo, cambio) => {
        expect(detallesDe({ ...valido, ...cambio })).toBeNull();
    });
});

describe('validarProducto - mensajes por campo', () => {
    test.each([
        ['codigo', undefined, 'El código es obligatorio'],
        ['codigo', '   ', 'El código es obligatorio'],
        ['codigo', 'A'.repeat(21), 'El código no puede superar 20 caracteres'],
        ['codigo', 'P 001', 'El código solo admite letras, números, guion y guion bajo'],
        ['codigo', 'P#1', 'El código solo admite letras, números, guion y guion bajo'],
        ['codigo', 123, 'El código debe ser un texto'],
        ['nombre', undefined, 'El nombre es obligatorio'],
        ['nombre', '', 'El nombre es obligatorio'],
        ['nombre', 'N'.repeat(101), 'El nombre no puede superar 100 caracteres'],
        ['descripcion', 'D'.repeat(256), 'La descripción no puede superar 255 caracteres'],
        ['descripcion', 5, 'La descripción debe ser un texto'],
        ['precio', undefined, 'El precio es obligatorio'],
        ['precio', null, 'El precio es obligatorio'],
        ['precio', '12', 'El precio debe ser un número'],
        ['precio', -0.01, 'El precio no puede ser negativo'],
        ['precio', 10.999, 'El precio admite hasta 10 enteros y 2 decimales'],
        ['precio', 10000000000, 'El precio admite hasta 10 enteros y 2 decimales'],
        ['stock', undefined, 'El stock es obligatorio'],
        ['stock', 1.5, 'El stock debe ser un número entero'],
        ['stock', '3', 'El stock debe ser un número entero'],
        ['stock', -1, 'El stock no puede ser negativo'],
    ])('%s = %p → «%s»', (campo, valorMalo, mensaje) => {
        const detalles = detallesDe({ ...valido, [campo]: valorMalo });
        expect(detalles).toEqual({ [campo]: mensaje });
    });

    test('un código con dos fallas informa siempre el mismo mensaje (el de longitud)', () => {
        expect(detallesDe({ ...valido, codigo: '#'.repeat(25) })).toEqual({
            codigo: 'El código no puede superar 20 caracteres',
        });
    });

    test('reúne los errores de varios campos a la vez', () => {
        expect(detallesDe({ codigo: '', nombre: '', precio: -5, stock: -1 })).toEqual({
            codigo: 'El código es obligatorio',
            nombre: 'El nombre es obligatorio',
            precio: 'El precio no puede ser negativo',
            stock: 'El stock no puede ser negativo',
        });
    });
});

describe('validarProducto - cuerpo inválido', () => {
    test.each([[null], [[]], ['texto'], [42]])('rechaza el cuerpo %p', (cuerpo) => {
        expect(detallesDe(cuerpo)).toEqual({ cuerpo: 'El cuerpo de la solicitud debe ser un objeto JSON' });
    });

    test('un cuerpo ausente informa todos los campos obligatorios', () => {
        expect(Object.keys(detallesDe(undefined))).toEqual(['codigo', 'nombre', 'precio', 'stock']);
    });
});

describe('esIdValido', () => {
    test.each([
        ['6650f1c2a4b3c9d8e7f60123', true],
        ['6650F1C2A4B3C9D8E7F60123', true],
        ['abc', false],
        ['6650f1c2a4b3c9d8e7f6012', false],
        ['6650f1c2a4b3c9d8e7f6012z', false],
        ['123456789012', false],
    ])('%s → %p', (id, esperado) => {
        expect(esIdValido(id)).toBe(esperado);
    });
});
