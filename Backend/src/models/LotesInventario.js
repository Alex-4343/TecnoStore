const pool = require('../config/db');

/**
 * Modelo para Lotes de Inventario (FIFO / PEPS)
 * Cada lote representa una compra/reabastecimiento con su precio de costo propio.
 */
class LoteInventario {

    /**
     * Obtiene los lotes disponibles de un producto ordenados por fecha (más antiguo primero).
     * Esto es el corazón del algoritmo FIFO.
     */
    static async getLotesFIFO(idProducto, connection = null) {
        const db = connection || pool.promise();
        const [rows] = await db.query(
            `SELECT * FROM Lotes_Inventario
             WHERE id_producto = ? AND cantidad_disponible > 0
             ORDER BY fecha_entrada ASC`,
            [idProducto]
        );
        return rows;
    }

    /**
     * Crea un nuevo lote al reabastecer stock.
     * @param {object} lote - { id_producto, id_proveedor, cantidad, precio_compra_lote }
     */
    static async crearLote({ id_producto, id_proveedor, cantidad, precio_compra_lote }, connection = null) {
        const db = connection || pool.promise();
        const [result] = await db.query(
            `INSERT INTO Lotes_Inventario
             (id_producto, id_proveedor, cantidad_inicial, cantidad_disponible, precio_compra_lote)
             VALUES (?, ?, ?, ?, ?)`,
            [id_producto, id_proveedor || null, cantidad, cantidad, precio_compra_lote]
        );
        // Si el producto no tiene precio de venta (0 o NULL), fijarlo al 30% sobre el precio de compra del lote
        try {
            const [prodRows] = await db.query(
                `SELECT precio_venta FROM Productos WHERE id = ?`,
                [id_producto]
            );
            if (prodRows.length > 0) {
                const precioVentaActual = Number(prodRows[0].precio_venta || 0);
                if (!precioVentaActual || precioVentaActual === 0) {
                    const nuevoPrecioVenta = Math.round(Number(precio_compra_lote) * 1.3);
                    await db.query(
                        `UPDATE Productos SET precio_venta = ? WHERE id = ?`,
                        [nuevoPrecioVenta, id_producto]
                    );
                }
            }
        } catch (e) {
            // No detener la creación del lote por un fallo al actualizar precio_venta; solo loguear
            console.error('Error actualizando precio_venta tras crear lote:', e);
        }
        return result.insertId;
    }

    /**
     * Descontador FIFO dentro de una transacción.
     * Recorre los lotes más antiguos primero y va descontando.
     * @returns {number} Costo promedio ponderado de las unidades consumidas (para guardar en Detalles_Pedido)
     */
    static async descontarFIFO(idProducto, cantidadVender, connection) {
        // Bloquear filas para evitar condiciones de carrera
        const [lotes] = await connection.query(
            `SELECT * FROM Lotes_Inventario
             WHERE id_producto = ? AND cantidad_disponible > 0
             ORDER BY fecha_entrada ASC
             FOR UPDATE`,
            [idProducto]
        );

        let restante       = cantidadVender;
        let costoTotal     = 0;
        let loteAgotadoId  = null;
        const asignaciones = [];

        for (let i = 0; i < lotes.length; i++) {
            const lote = lotes[i];
            if (restante <= 0) break;

            const aDescontar = Math.min(lote.cantidad_disponible, restante);
            costoTotal += aDescontar * Number(lote.precio_compra_lote);

            // Registrar asignación por lote (para que el controlador pueda crear detalles por lote)
            asignaciones.push({
                id_lote: lote.id,
                cantidad: aDescontar,
                precio_compra_lote: Number(lote.precio_compra_lote)
            });

            await connection.query(
                `UPDATE Lotes_Inventario
                 SET cantidad_disponible = cantidad_disponible - ?
                 WHERE id = ?`,
                [aDescontar, lote.id]
            );

            // Si este lote se agota exactamente en esta venta, guardar su id
            if (aDescontar === lote.cantidad_disponible) {
                loteAgotadoId = lote.id;
            }

            restante -= aDescontar;
        }

        // Si restante > 0 los datos están inconsistentes (no debería pasar)
        if (restante > 0) {
            throw new Error(
                `Lotes FIFO inconsistentes para producto ${idProducto}: ` +
                `faltan ${restante} unidades en lotes`
            );
        }

        // Si se agotó un lote, actualizar el precio de venta del producto al del siguiente lote (si existe)
        if (loteAgotadoId !== null) {
            // Buscar el siguiente lote disponible (más antiguo que el agotado)
            const [siguienteLoteRows] = await connection.query(
                `SELECT * FROM Lotes_Inventario
                 WHERE id_producto = ? AND cantidad_disponible > 0 AND id > ?
                 ORDER BY fecha_entrada ASC LIMIT 1`,
                [idProducto, loteAgotadoId]
            );
            if (siguienteLoteRows.length > 0) {
                const siguienteLote = siguienteLoteRows[0];
                const nuevoPrecioVenta = Math.round(Number(siguienteLote.precio_compra_lote) * 1.3);
                // Actualizar el precio de venta del producto
                await connection.query(
                    `UPDATE Productos SET precio_venta = ? WHERE id = ?`,
                    [nuevoPrecioVenta, idProducto]
                );
            }
        }

        // Costo promedio ponderado de todos los lotes consumidos
        const costoPromedio = cantidadVender > 0 ? costoTotal / cantidadVender : 0;
        return { costoPromedio, asignaciones };
    }

    /**
     * Resumen de lotes activos de un producto (para mostrar en el admin).
     */
    static async getResumenProducto(idProducto) {
        const [rows] = await pool.promise().query(
            `SELECT
                COUNT(*) AS total_lotes,
                SUM(cantidad_disponible)                       AS stock_disponible,
                SUM(cantidad_disponible * precio_compra_lote)  AS inversion_actual,
                MIN(fecha_entrada)                             AS lote_mas_antiguo,
                MAX(fecha_entrada)                             AS lote_mas_reciente
             FROM Lotes_Inventario
             WHERE id_producto = ? AND cantidad_disponible > 0`,
            [idProducto]
        );
        return rows[0];
    }

    /**
     * Todos los lotes activos (para dashboard y vista admin).
     */
    static async getTodosActivos() {
        const [rows] = await pool.promise().query(
            `SELECT
                l.id,
                l.id_producto,
                p.nombre             AS producto_nombre,
                pv.nombre            AS proveedor_nombre,
                l.cantidad_inicial,
                l.cantidad_disponible,
                l.precio_compra_lote,
                l.fecha_entrada,
                (l.cantidad_disponible * l.precio_compra_lote) AS valor_lote
             FROM Lotes_Inventario l
             JOIN Productos   p  ON l.id_producto  = p.id
             LEFT JOIN Proveedores pv ON l.id_proveedor = pv.id
            WHERE l.cantidad_disponible > 0 AND p.estado = 'activo'
            ORDER BY l.id_producto, l.fecha_entrada ASC`
        );
        return rows;
    }

    /**
     * Inversión total actual (suma de todos los lotes activos).
     */
    static async getInversionTotal() {
        const [rows] = await pool.promise().query(
            `SELECT COALESCE(SUM(l.cantidad_disponible * l.precio_compra_lote), 0) AS inversion_total
             FROM Lotes_Inventario l
             JOIN Productos p ON l.id_producto = p.id
             WHERE l.cantidad_disponible > 0 AND p.estado = 'activo'`
        );
        return Number(rows[0].inversion_total);
    }

    /**
     * Simula una descontación FIFO sin modificar la base de datos.
     * Devuelve las asignaciones por lote necesarias para satisfacer la cantidad solicitada.
     * @param {number} idProducto
     * @param {number} cantidadSolicitada
     */
    static async simularDescuentoFIFO(idProducto, cantidadSolicitada) {
        const [lotes] = await pool.promise().query(
            `SELECT * FROM Lotes_Inventario
             WHERE id_producto = ? AND cantidad_disponible > 0
             ORDER BY fecha_entrada ASC`,
            [idProducto]
        );

        let restante = cantidadSolicitada;
        const asignaciones = [];
        let costoTotal = 0;

        for (let i = 0; i < lotes.length && restante > 0; i++) {
            const lote = lotes[i];
            const aDescontar = Math.min(lote.cantidad_disponible, restante);
            if (aDescontar <= 0) continue;

            asignaciones.push({
                id_lote: lote.id,
                cantidad: aDescontar,
                precio_compra_lote: Number(lote.precio_compra_lote),
                precio_venta_unitario: Math.round(Number(lote.precio_compra_lote) * 1.3)
            });

            costoTotal += aDescontar * Number(lote.precio_compra_lote);
            restante -= aDescontar;
        }

        return {
            cantidad_solicitada: cantidadSolicitada,
            cantidad_asignada: cantidadSolicitada - restante,
            restante,
            asignaciones,
            costoPromedio: (cantidadSolicitada - restante) > 0 ? costoTotal / (cantidadSolicitada - restante) : 0
        };
    }
}

module.exports = LoteInventario;
