const LoteInventario = require('../models/LotesInventario');

class CartController {
    // POST /api/cart/estimate
    static async estimate(req, res) {
        try {
            const { items } = req.body; // [{ id, cantidad }]
            if (!items || !Array.isArray(items)) {
                return res.status(400).json({ error: 'Items inválidos' });
            }

            const estimaciones = [];
            let totalCarrito = 0;

            for (const it of items) {
                const id = it.id;
                const cantidad = Number(it.cantidad) || 0;
                if (cantidad <= 0) continue;

                const simulacion = await LoteInventario.simularDescuentoFIFO(id, cantidad);

                // Calcular total de venta para este producto según asignaciones
                let totalProducto = 0;
                simulacion.asignaciones.forEach(a => {
                    totalProducto += a.cantidad * a.precio_venta_unitario;
                });

                totalCarrito += totalProducto;

                estimaciones.push({
                    id_producto: id,
                    cantidad_solicitada: simulacion.cantidad_solicitada,
                    cantidad_asignada: simulacion.cantidad_asignada,
                    restante: simulacion.restante,
                    asignaciones: simulacion.asignaciones,
                    total_producto: totalProducto
                });
            }

            res.json({ items: estimaciones, total: totalCarrito });
        } catch (error) {
            console.error('Error en CartController.estimate:', error);
            res.status(500).json({ error: 'Error al estimar carrito' });
        }
    }
}

module.exports = CartController;
