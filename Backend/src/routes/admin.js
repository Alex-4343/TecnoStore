const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');

// ===== DASHBOARD =====
router.get('/stats', AdminController.getStats);
router.get('/sales-resumen', AdminController.getSalesResumen);
router.get('/top-products', AdminController.getTopProducts);

// ===== GESTIÓN DE PRODUCTOS (CRUD) =====
router.get('/products', AdminController.getAllProducts);
router.post('/products', AdminController.createProduct);
router.put('/products/:id', AdminController.updateProduct);
router.patch('/products/:id/stock', AdminController.updateStock);
router.delete('/products/:id', AdminController.deleteProduct);

// ===== GESTIÓN DE LOTES (FIFO) =====
router.get('/lotes', AdminController.getLotes);

// ===== KARDEX (Historial de Movimientos) =====
router.get('/kardex', AdminController.getKardex);
router.get('/kardex-resumen', AdminController.getKardexResumen);

// ===== REPORTES =====
router.get('/reports/low-stock', AdminController.getLowStockReport);
router.get('/reports/profitability', AdminController.getProfitabilityReport);
router.get('/reports/top-buyers', AdminController.getTopBuyers);
router.get('/reports/best-sellers', AdminController.getBestSellers);
router.get('/reports/sales-consolidated', AdminController.getSalesConsolidated);
router.get('/reports/providers-performance', AdminController.getProvidersPerformance);
router.get('/reports/payment-methods', AdminController.getPaymentMethods);
router.get('/reports/top-buyers-per-product', AdminController.getTopBuyersPerProduct);
router.get('/reports/lotes-info', AdminController.getLotesInfoReport);

module.exports = router;
