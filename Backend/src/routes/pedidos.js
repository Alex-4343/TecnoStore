const express = require('express');
const router = express.Router();
const PedidosController = require('../controllers/pedidosController');

// Rutas para pedidos
router.get('/', PedidosController.getAll);
router.get('/usuario/:idUsuario', PedidosController.getByUsuario);
router.get('/mis-pedidos/:idUsuario', PedidosController.getMisPedidos); // ← Con detalles
router.get('/:id', PedidosController.getById);
router.post('/', PedidosController.create);
router.post('/finalizar-compra', PedidosController.finalizarCompra);
router.put('/confirmar-pago/:id', PedidosController.confirmarPago);
router.put('/:id', PedidosController.update);
router.delete('/:id', PedidosController.delete);

module.exports = router;
