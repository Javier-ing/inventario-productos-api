'use strict';

const request = require('supertest');
const app = require('../app');
const { desconectar } = require('../config/baseDatos');
const { conectar } = require('../config/baseDatos');
const { prepararBaseDatos, limpiarProductos, cerrarBaseDatos, URI_PRUEBA } = require('./ayudas/baseDatosPrueba');

const RUTA = '/api/productos';
const ID_INEXISTENTE = '6650f1c2a4b3c9d8e7f60123';
const PATRON_ID = /^[a-f0-9]{24}$/;

const teclado = { codigo: 'P-001', nombre: 'Teclado mecánico', descripcion: 'RGB', precio: 185000.5, stock: 12 };
const mouse = { codigo: 'P-002', nombre: 'Mouse inalámbrico', descripcion: null, precio: 62000, stock: 25 };

/** Registra un producto por la API y devuelve el cuerpo de la respuesta. */
async function registrar(datos) {
    const respuesta = await request(app).post(RUTA).send(datos);
    expect(respuesta.status).toBe(201);
    return respuesta.body;
}

beforeAll(prepararBaseDatos);
beforeEach(limpiarProductos);
afterAll(cerrarBaseDatos);

describe('Servicio de estado y rutas generales', () => {
    test('GET /api informa que el servicio está activo y la base conectada', async () => {
        const respuesta = await request(app).get('/api');
        expect(respuesta.status).toBe(200);
        expect(respuesta.body).toMatchObject({ estado: 'activo', baseDatos: 'conectada', version: '1.0.0' });
    });

    test('GET / redirige al servicio de estado', async () => {
        const respuesta = await request(app).get('/');
        expect(respuesta.status).toBe(302);
        expect(respuesta.headers.location).toBe('/api');
    });

    test('GET /api-docs/ sirve la documentación Swagger', async () => {
        const respuesta = await request(app).get('/api-docs/');
        expect(respuesta.status).toBe(200);
        expect(respuesta.text).toContain('swagger');
    });

    test('una ruta inexistente responde 404 con el formato de error', async () => {
        const respuesta = await request(app).get('/api/clientes');
        expect(respuesta.status).toBe(404);
        expect(respuesta.body).toMatchObject({ estado: 404, error: 'Not Found' });
        expect(respuesta.body.mensaje).toBe('No existe la ruta GET /api/clientes');
    });
});

describe('POST /api/productos (registrar)', () => {
    test('crea el producto: 201, Location y datos generados por el servidor', async () => {
        const respuesta = await request(app).post(RUTA).send(teclado);
        expect(respuesta.status).toBe(201);
        expect(respuesta.headers.location).toBe(`${RUTA}/${respuesta.body.idProducto}`);
        expect(respuesta.body).toMatchObject(teclado);
        expect(respuesta.body.idProducto).toMatch(PATRON_ID);
        expect(new Date(respuesta.body.fechaRegistro).toISOString()).toBe(respuesta.body.fechaRegistro);
    });

    test('la descripción es opcional y se devuelve como null', async () => {
        const sinDescripcion = { ...teclado };
        delete sinDescripcion.descripcion;
        const cuerpo = await registrar(sinDescripcion);
        expect(cuerpo.descripcion).toBeNull();
    });

    test('limpia espacios sobrantes', async () => {
        const cuerpo = await registrar({ ...teclado, codigo: ' P-001 ', nombre: '  Teclado  ' });
        expect(cuerpo).toMatchObject({ codigo: 'P-001', nombre: 'Teclado' });
    });

    test('ignora idProducto y fechaRegistro enviados por el cliente', async () => {
        const cuerpo = await registrar({ ...teclado, idProducto: 'x', fechaRegistro: '2000-01-01T00:00:00.000Z' });
        expect(cuerpo.idProducto).toMatch(PATRON_ID);
        expect(cuerpo.fechaRegistro).not.toBe('2000-01-01T00:00:00.000Z');
    });

    test('acepta precio 0 y stock 0', async () => {
        const cuerpo = await registrar({ ...teclado, precio: 0, stock: 0 });
        expect(cuerpo).toMatchObject({ precio: 0, stock: 0 });
    });

    test('409 si el código ya existe', async () => {
        await registrar(teclado);
        const respuesta = await request(app).post(RUTA).send({ ...mouse, codigo: 'P-001' });
        expect(respuesta.status).toBe(409);
        expect(respuesta.body.mensaje).toBe('Ya existe un producto con el código P-001');
    });

    test('409 aunque cambien las mayúsculas del código', async () => {
        await registrar(teclado);
        const respuesta = await request(app).post(RUTA).send({ ...mouse, codigo: 'p-001' });
        expect(respuesta.status).toBe(409);
        expect(respuesta.body.mensaje).toBe('Ya existe un producto con el código p-001');
    });

    test('400 con un mensaje por campo cuando faltan datos', async () => {
        const respuesta = await request(app).post(RUTA).send({});
        expect(respuesta.status).toBe(400);
        expect(respuesta.body).toMatchObject({ estado: 400, error: 'Bad Request' });
        expect(respuesta.body.detalles).toEqual({
            codigo: 'El código es obligatorio',
            nombre: 'El nombre es obligatorio',
            precio: 'El precio es obligatorio',
            stock: 'El stock es obligatorio',
        });
    });

    test.each([
        ['codigo', 'P 001', 'El código solo admite letras, números, guion y guion bajo'],
        ['codigo', 'A'.repeat(21), 'El código no puede superar 20 caracteres'],
        ['precio', -1, 'El precio no puede ser negativo'],
        ['precio', 1.234, 'El precio admite hasta 10 enteros y 2 decimales'],
        ['precio', '100', 'El precio debe ser un número'],
        ['stock', -3, 'El stock no puede ser negativo'],
        ['stock', 2.5, 'El stock debe ser un número entero'],
    ])('400 si %s = %p', async (campo, valor, mensaje) => {
        const respuesta = await request(app).post(RUTA).send({ ...teclado, [campo]: valor });
        expect(respuesta.status).toBe(400);
        expect(respuesta.body.detalles).toEqual({ [campo]: mensaje });
    });

    test('un dato inválido no guarda nada', async () => {
        await request(app).post(RUTA).send({ ...teclado, precio: -1 });
        const lista = await request(app).get(RUTA);
        expect(lista.body).toEqual([]);
    });

    test('400 si el JSON está mal escrito', async () => {
        const respuesta = await request(app).post(RUTA).set('Content-Type', 'application/json').send('{"codigo": ');
        expect(respuesta.status).toBe(400);
        expect(respuesta.body.mensaje).toBe('El cuerpo de la solicitud no es un JSON válido');
    });

    test('400 si el cuerpo es un arreglo', async () => {
        const respuesta = await request(app).post(RUTA).send([teclado]);
        expect(respuesta.status).toBe(400);
        expect(respuesta.body.mensaje).toBe('El cuerpo de la solicitud debe ser un objeto JSON');
    });

    test('413 si el cuerpo supera el límite', async () => {
        const respuesta = await request(app).post(RUTA).send({ ...teclado, descripcion: 'x'.repeat(200000) });
        expect(respuesta.status).toBe(413);
        expect(respuesta.body.mensaje).toBe('El cuerpo de la solicitud es demasiado grande');
    });
});

describe('GET /api/productos (listar y buscar)', () => {
    test('lista vacía: 200 y arreglo vacío', async () => {
        const respuesta = await request(app).get(RUTA);
        expect(respuesta.status).toBe(200);
        expect(respuesta.body).toEqual([]);
    });

    test('ordena por nombre en español, sin distinguir mayúsculas ni tildes', async () => {
        await registrar({ ...teclado, codigo: 'A1', nombre: 'zorro' });
        await registrar({ ...teclado, codigo: 'A2', nombre: 'Álamo' });
        await registrar({ ...teclado, codigo: 'A3', nombre: 'bota' });
        const respuesta = await request(app).get(RUTA);
        expect(respuesta.body.map((producto) => producto.nombre)).toEqual(['Álamo', 'bota', 'zorro']);
    });

    test('busca por coincidencia parcial sin distinguir mayúsculas', async () => {
        await registrar(teclado);
        await registrar(mouse);
        const respuesta = await request(app).get(RUTA).query({ nombre: 'INALÁM' });
        expect(respuesta.body.map((producto) => producto.codigo)).toEqual(['P-002']);
    });

    test('una búsqueda sin coincidencias devuelve []', async () => {
        await registrar(teclado);
        const respuesta = await request(app).get(RUTA).query({ nombre: 'monitor' });
        expect(respuesta.status).toBe(200);
        expect(respuesta.body).toEqual([]);
    });

    test('los caracteres especiales se buscan como texto literal', async () => {
        await registrar({ ...teclado, codigo: 'X1', nombre: 'abc' });
        await registrar({ ...teclado, codigo: 'X2', nombre: 'a.c' });
        const respuesta = await request(app).get(RUTA).query({ nombre: 'a.c' });
        expect(respuesta.body.map((producto) => producto.codigo)).toEqual(['X2']);
    });

    test('un nombre vacío devuelve todos los productos', async () => {
        await registrar(teclado);
        await registrar(mouse);
        const respuesta = await request(app).get(RUTA).query({ nombre: '  ' });
        expect(respuesta.body).toHaveLength(2);
    });

    test('400 si «nombre» llega repetido', async () => {
        const respuesta = await request(app).get(`${RUTA}?nombre=a&nombre=b`);
        expect(respuesta.status).toBe(400);
        expect(respuesta.body.mensaje).toBe('El parámetro \'nombre\' debe ser un texto');
    });
});

describe('GET /api/productos/:id (consultar)', () => {
    test('devuelve el producto', async () => {
        const creado = await registrar(teclado);
        const respuesta = await request(app).get(`${RUTA}/${creado.idProducto}`);
        expect(respuesta.status).toBe(200);
        expect(respuesta.body).toEqual(creado);
    });

    test('404 si no existe', async () => {
        const respuesta = await request(app).get(`${RUTA}/${ID_INEXISTENTE}`);
        expect(respuesta.status).toBe(404);
        expect(respuesta.body.mensaje).toBe(`No existe un producto con id ${ID_INEXISTENTE}`);
    });

    test.each(['abc', '123', '6650f1c2a4b3c9d8e7f6012z'])('400 si el id es «%s»', async (id) => {
        const respuesta = await request(app).get(`${RUTA}/${id}`);
        expect(respuesta.status).toBe(400);
        expect(respuesta.body.mensaje).toBe('El parámetro \'id\' tiene un valor no válido');
    });
});

describe('PUT /api/productos/:id (actualizar)', () => {
    test('actualiza los datos y conserva id y fecha de registro', async () => {
        const creado = await registrar(teclado);
        const cambios = { codigo: 'P-001', nombre: 'Teclado pro', descripcion: null, precio: 200000, stock: 3 };
        const respuesta = await request(app).put(`${RUTA}/${creado.idProducto}`).send(cambios);
        expect(respuesta.status).toBe(200);
        expect(respuesta.body).toMatchObject(cambios);
        expect(respuesta.body.idProducto).toBe(creado.idProducto);
        expect(respuesta.body.fechaRegistro).toBe(creado.fechaRegistro);
        const consulta = await request(app).get(`${RUTA}/${creado.idProducto}`);
        expect(consulta.body.nombre).toBe('Teclado pro');
    });

    test('permite conservar el propio código aunque cambien las mayúsculas', async () => {
        const creado = await registrar(teclado);
        const respuesta = await request(app).put(`${RUTA}/${creado.idProducto}`).send({ ...teclado, codigo: 'p-001' });
        expect(respuesta.status).toBe(200);
        expect(respuesta.body.codigo).toBe('p-001');
    });

    test('409 si el código pertenece a otro producto', async () => {
        await registrar(teclado);
        const otro = await registrar(mouse);
        const respuesta = await request(app).put(`${RUTA}/${otro.idProducto}`).send({ ...mouse, codigo: 'P-001' });
        expect(respuesta.status).toBe(409);
        expect(respuesta.body.mensaje).toBe('Ya existe un producto con el código P-001');
    });

    test('400 si los datos no son válidos y no modifica nada', async () => {
        const creado = await registrar(teclado);
        const respuesta = await request(app).put(`${RUTA}/${creado.idProducto}`).send({ ...teclado, stock: -9 });
        expect(respuesta.status).toBe(400);
        expect(respuesta.body.detalles).toEqual({ stock: 'El stock no puede ser negativo' });
        const consulta = await request(app).get(`${RUTA}/${creado.idProducto}`);
        expect(consulta.body.stock).toBe(12);
    });

    test.each([
        ['precio', 1.234, 'El precio admite hasta 10 enteros y 2 decimales'],
        ['precio', '100', 'El precio debe ser un número'],
        ['codigo', 'P 001', 'El código solo admite letras, números, guion y guion bajo'],
        ['nombre', '   ', 'El nombre es obligatorio'],
    ])('400 si %s = %p (las mismas reglas que al registrar)', async (campo, valor, mensaje) => {
        const creado = await registrar(teclado);
        const respuesta = await request(app).put(`${RUTA}/${creado.idProducto}`).send({ ...teclado, [campo]: valor });
        expect(respuesta.status).toBe(400);
        expect(respuesta.body.detalles).toEqual({ [campo]: mensaje });
    });

    test('limpia espacios sobrantes al actualizar', async () => {
        const creado = await registrar(teclado);
        const cambios = { ...teclado, nombre: '  Nuevo  ' };
        const respuesta = await request(app).put(`${RUTA}/${creado.idProducto}`).send(cambios);
        expect(respuesta.body.nombre).toBe('Nuevo');
    });

    test('404 si el producto no existe', async () => {
        const respuesta = await request(app).put(`${RUTA}/${ID_INEXISTENTE}`).send(teclado);
        expect(respuesta.status).toBe(404);
    });

    test('400 si el id es inválido', async () => {
        const respuesta = await request(app).put(`${RUTA}/abc`).send(teclado);
        expect(respuesta.status).toBe(400);
    });
});

describe('DELETE /api/productos/:id (eliminar)', () => {
    test('204 sin cuerpo y el producto deja de existir', async () => {
        const creado = await registrar(teclado);
        const respuesta = await request(app).delete(`${RUTA}/${creado.idProducto}`);
        expect(respuesta.status).toBe(204);
        expect(respuesta.text).toBe('');
        const consulta = await request(app).get(`${RUTA}/${creado.idProducto}`);
        expect(consulta.status).toBe(404);
    });

    test('solo elimina el producto indicado', async () => {
        const creado = await registrar(teclado);
        await registrar(mouse);
        await request(app).delete(`${RUTA}/${creado.idProducto}`);
        const lista = await request(app).get(RUTA);
        expect(lista.body.map((producto) => producto.codigo)).toEqual(['P-002']);
    });

    test('404 si no existe', async () => {
        const respuesta = await request(app).delete(`${RUTA}/${ID_INEXISTENTE}`);
        expect(respuesta.status).toBe(404);
    });

    test('400 si el id es inválido', async () => {
        const respuesta = await request(app).delete(`${RUTA}/xyz`);
        expect(respuesta.status).toBe(400);
    });

    test('el código de un producto eliminado puede volver a usarse', async () => {
        const creado = await registrar(teclado);
        await request(app).delete(`${RUTA}/${creado.idProducto}`);
        await registrar(teclado);
    });
});

describe('Cuando MongoDB no está disponible (debe ir al final)', () => {
    test('los servicios de productos responden 503 y el estado lo informa', async () => {
        await desconectar();
        try {
            const productos = await request(app).get(RUTA);
            expect(productos.status).toBe(503);
            expect(productos.body.mensaje).toBe('La base de datos no está disponible en este momento');
            const estado = await request(app).get('/api');
            expect(estado.body.baseDatos).toBe('desconectada');
        } finally {
            await conectar(URI_PRUEBA); // se reconecta para que el cierre final pueda borrar la base de pruebas
        }
    });
});
