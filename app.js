'use strict';

require('dotenv').config({ quiet: true });

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

const paquete = require('./package.json');
const { conectar, desconectar, estadoConexion } = require('./config/baseDatos');
const exigirBaseDatos = require('./middlewares/exigirBaseDatos');
const { rutaNoEncontrada, manejarErrores } = require('./middlewares/manejadorErrores');
const rutasProductos = require('./routes/productos');

const PUERTO_POR_DEFECTO = 8080;
const URI_POR_DEFECTO = 'mongodb://127.0.0.1:27017/inventario_db';
const ORIGEN_POR_DEFECTO = 'http://localhost:5173';

/** Lee el contrato OpenAPI (docs/openapi.yaml) que describe cada servicio. */
function cargarDocumentacion() {
    const archivo = path.join(__dirname, 'docs', 'openapi.yaml');
    return yaml.load(fs.readFileSync(archivo, 'utf8'));
}

/** Servicio de estado: confirma que la API está activa y si la base de datos responde. */
function estadoServicio(req, res) {
    res.json({
        servicio: 'API de inventario de productos',
        version: paquete.version,
        estado: 'activo',
        baseDatos: estadoConexion(),
        documentacion: '/api-docs',
    });
}

/** Construye la aplicación Express (sin abrir el puerto, para poder probarla). */
function crearApp() {
    const app = express();
    const origenes = (process.env.CORS_ORIGIN || ORIGEN_POR_DEFECTO).split(',').map((origen) => origen.trim());
    app.disable('x-powered-by');
    app.use(cors({ origin: origenes }));
    if (process.env.NODE_ENV !== 'test') {
        app.use(morgan('dev'));
    }
    app.use(express.json({ limit: '100kb' }));
    app.get('/', (req, res) => res.redirect('/api'));
    app.get('/api', estadoServicio);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(cargarDocumentacion()));
    app.use('/api/productos', exigirBaseDatos, rutasProductos);
    app.use(rutaNoEncontrada);
    app.use(manejarErrores);
    return app;
}

const app = crearApp();

/** Conecta con MongoDB y abre el puerto. Si la conexión falla, informa el motivo y termina. */
async function iniciarServidor() {
    const puerto = Number(process.env.PORT) || PUERTO_POR_DEFECTO;
    try {
        await conectar(process.env.MONGODB_URI || URI_POR_DEFECTO);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
    const servidor = app.listen(puerto, () => {
        console.log(`API de inventario escuchando en http://localhost:${puerto} (documentación en /api-docs)`);
    });
    cerrarAlTerminar(servidor);
}

/** Cierra el servidor y la conexión con MongoDB cuando el proceso recibe Ctrl+C o una orden de parada. */
function cerrarAlTerminar(servidor) {
    const cerrar = () => servidor.close(async () => {
        await desconectar();
        process.exit(0);
    });
    process.on('SIGINT', cerrar);
    process.on('SIGTERM', cerrar);
}

if (require.main === module) {
    iniciarServidor();
}

module.exports = app;
