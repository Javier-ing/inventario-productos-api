'use strict';

const { Producto, COLACION } = require('../models/Producto');
const ErrorApi = require('../utils/ErrorApi');
const { validarProducto } = require('../utils/validaciones');

/** Escapa los caracteres especiales de expresión regular para buscar texto literal. */
function escaparTexto(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Arma el filtro de búsqueda por nombre (parcial y sin distinguir mayúsculas). */
function construirFiltro(nombre) {
    if (nombre === undefined) {
        return {};
    }
    if (typeof nombre !== 'string') {
        throw new ErrorApi(400, 'El parámetro \'nombre\' debe ser un texto');
    }
    const texto = nombre.trim();
    return texto === '' ? {} : { nombre: { $regex: escaparTexto(texto), $options: 'i' } };
}

/** Busca un producto por id o lanza 404. */
function exigirProducto(producto, id) {
    if (!producto) {
        throw new ErrorApi(404, `No existe un producto con id ${id}`);
    }
    return producto;
}

/**
 * Ejecuta un guardado y traduce el error de clave duplicada (E11000) a un 409 con el código recibido.
 * (El error de MongoDB trae la clave de ordenamiento de la colación, no el texto del código.)
 */
async function guardar(operacion, codigo) {
    try {
        return await operacion();
    } catch (error) {
        if (error.code === 11000) {
            throw new ErrorApi(409, `Ya existe un producto con el código ${codigo}`);
        }
        throw error;
    }
}

/** GET /api/productos[?nombre=texto] — lista los productos ordenados por nombre. */
async function listar(req, res) {
    const filtro = construirFiltro(req.query.nombre);
    const productos = await Producto.find(filtro).collation(COLACION).sort({ nombre: 1, _id: 1 });
    res.json(productos);
}

/** GET /api/productos/:id — consulta un producto. */
async function obtener(req, res) {
    const producto = await Producto.findById(req.params.id);
    res.json(exigirProducto(producto, req.params.id));
}

/** POST /api/productos — registra un producto nuevo. */
async function crear(req, res) {
    const datos = validarProducto(req.body);
    const producto = await guardar(() => Producto.create(datos), datos.codigo);
    res.location(`${req.baseUrl}/${producto.id}`).status(201).json(producto);
}

/** PUT /api/productos/:id — reemplaza los datos editables de un producto. */
async function actualizar(req, res) {
    const datos = validarProducto(req.body);
    const opciones = { returnDocument: 'after', runValidators: true };
    const producto = await guardar(
        () => Producto.findByIdAndUpdate(req.params.id, datos, opciones),
        datos.codigo,
    );
    res.json(exigirProducto(producto, req.params.id));
}

/** DELETE /api/productos/:id — elimina un producto. */
async function eliminar(req, res) {
    const producto = await Producto.findByIdAndDelete(req.params.id);
    exigirProducto(producto, req.params.id);
    res.status(204).end();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
