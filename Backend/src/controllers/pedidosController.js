const Pedido        = require('../models/Pedidos');
const DetallePedido = require('../models/Detalles_Pedido');
const LoteInventario = require('../models/LotesInventario');

// Controlador para Pedidos
class PedidosController {
    // Obtener todos los pedidos
    static async getAll(req, res) {
        try {
            const pedidos = await Pedido.getAll();
            res.json(pedidos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtener pedido por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const pedido = await Pedido.getById(id);
            if (!pedido) {
                return res.status(404).json({ error: 'Pedido no encontrado' });
            }
            res.json(pedido);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtener pedidos por usuario
    static async getByUsuario(req, res) {
        try {
            const { idUsuario } = req.params;
            const pedidos = await Pedido.getByUsuario(idUsuario);
            res.json(pedidos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtener historial completo con detalles para "Mis Pedidos"
    static async getMisPedidos(req, res) {
        try {
            const { idUsuario } = req.params;
            const pedidos = await Pedido.getMisPedidos(idUsuario);
            res.json(pedidos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Crear pedido con detalles (endpoint genérico)
    static async create(req, res) {
        try {
            const { id_usuario, total, detalles, estado_pedido, metodo_pago } = req.body;
            const idPedido = await Pedido.create({ id_usuario, total, estado_pedido, metodo_pago });

            for (const detalle of detalles) {
                await DetallePedido.create({
                    id_pedido: idPedido,
                    id_producto: detalle.id_producto,
                    cantidad: detalle.cantidad,
                    precio_unitario: detalle.precio_unitario
                });
            }

            res.status(201).json({ id: idPedido, message: 'Pedido creado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/pedidos/finalizar-compra
     * Transacción atómica: crea pedido + detalles + descuenta stock.
     * Si cualquier paso falla hace rollback completo (RF-05, RF-15).
     */
    static async finalizarCompra(req, res) {
        const pool = require('../config/db');
        const { id_usuario, total, productos, metodo_pago } = req.body;

        if (!id_usuario || !total || !productos || productos.length === 0) {
            return res.status(400).json({ error: 'Datos incompletos para procesar la compra' });
        }

        if (!metodo_pago) {
            return res.status(400).json({ error: 'Debes seleccionar un método de pago' });
        }

        const connection = await pool.promise().getConnection();

        try {
            await connection.beginTransaction();

            // ── 1. Insertar el pedido principal ──────────────────────
            const [resultPedido] = await connection.query(
                'INSERT INTO Pedidos (id_usuario, total, estado_pedido, metodo_pago) VALUES (?, ?, ?, ?)',
                [id_usuario, total, 'pendiente', metodo_pago]
            );
            const id_pedido = resultPedido.insertId;

            // ── 2. Por cada producto: verificar stock, FIFO y registrar detalle ──
            let totalCalculado = 0;
            for (const item of productos) {
                // Verificación rápida de stock (bloquea la fila)
                const [stockRows] = await connection.query(
                    'SELECT nombre, COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = Productos.id), 0) AS stock FROM Productos WHERE id = ? FOR UPDATE',
                    [item.id]
                );

                if (stockRows.length === 0) {
                    throw new Error(`Producto ID ${item.id} no encontrado`);
                }

                if (stockRows[0].stock < item.cantidad) {
                    throw new Error(
                        `Stock insuficiente para "${stockRows[0].nombre}". ` +
                        `Disponible: ${stockRows[0].stock}, solicitado: ${item.cantidad}`
                    );
                }

                // ── FIFO: descontar lotes más antiguos primero ────────────
                // Retorna el costo promedio ponderado y la asignación por lotes consumidos
                const { costoPromedio, asignaciones } = await LoteInventario.descontarFIFO(
                    item.id, item.cantidad, connection
                );

                // Insertar detalles por cada asignación de lote (por si el pedido consume múltiples lotes)
                for (const a of asignaciones) {
                    const precioUnitarioVenta = Math.round(Number(a.precio_compra_lote) * 1.3);
                    await connection.query(
                        `INSERT INTO Detalles_Pedido
                         (id_pedido, id_producto, cantidad, precio_unitario, precio_compra_lote)
                         VALUES (?, ?, ?, ?, ?)`,
                        [id_pedido, item.id, a.cantidad, precioUnitarioVenta, a.precio_compra_lote]
                    );
                    totalCalculado += a.cantidad * precioUnitarioVenta;
                }

                // (El stock en Productos ya no existe, el descuento real se hizo en LoteInventario.descontarFIFO)
            }

            // Antes de confirmar, actualizar el total real calculado en el pedido
            await connection.query(
                `UPDATE Pedidos SET total = ? WHERE id = ?`,
                [totalCalculado, id_pedido]
            );

            // ── 3. Confirmar toda la transacción ─────────────────────
            await connection.commit();

            res.status(201).json({
                success: true,
                id: id_pedido,
                message: 'Pedido realizado con éxito'
            });

        } catch (error) {
            await connection.rollback();
            console.error('❌ Rollback en finalizar compra:', error.message);
            res.status(500).json({ error: error.message || 'Error al procesar la compra' });

        } finally {
            connection.release();
        }
    }

    // Confirmar pago de un pedido (solo admin)
    static async confirmarPago(req, res) {
        const pool = require('../config/db');
        const { id } = req.params;
        try {
            const [result] = await pool.promise().query(
                "UPDATE Pedidos SET estado_pedido = 'pagado' WHERE id = ? AND estado_pedido = 'pendiente'",
                [id]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Pedido no encontrado o ya confirmado' });
            }
            res.json({ success: true, msg: 'Pago confirmado correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Actualizar pedido
    static async update(req, res) {
        try {
            const { id } = req.params;
            const pedidoData = req.body;
            await Pedido.update(id, pedidoData);
            res.json({ message: 'Pedido actualizado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Eliminar pedido
    static async delete(req, res) {
        try {
            const { id } = req.params;
            await Pedido.delete(id);
            res.json({ message: 'Pedido eliminado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = PedidosController;