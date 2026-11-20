'use strict';

const express = require('express');
const validarId = require('../middlewares/validarId');
const controlador = require('../controllers/productosController');

const router = express.Router();

// Valida el formato del id una sola vez para todas las rutas que lo usan.
router.param('id', validarId);

router.get('/', controlador.listar);
router.post('/', controlador.crear);
router.get('/:id', controlador.obtener);
router.put('/:id', controlador.actualizar);
router.delete('/:id', controlador.eliminar);

module.exports = router;
