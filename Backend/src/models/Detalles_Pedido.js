const pool = require('../config/db');

// Modelo para Detalles_Pedido
class DetallePedido {
    // Obtener detalles de un pedido
    static async getByPedido(idPedido) {
        const [rows] = await pool.promise().query(`
            SELECT dp.*, p.nombre as producto_nombre, p.imagen_url
            FROM Detalles_Pedido dp
            JOIN Productos p ON dp.id_producto = p.id
            WHERE dp.id_pedido = ?
        `, [idPedido]);
        return rows;
    }

    // Crear detalle de pedido
    static async create(detalle) {
        const { id_pedido, id_producto, cantidad, precio_unitario } = detalle;
        const [result] = await pool.promise().query(
            'INSERT INTO Detalles_Pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
            [id_pedido, id_producto, cantidad, precio_unitario]
        );
        return result.insertId;
    }

    // Actualizar detalle
    static async update(id, detalle) {
        const { cantidad, precio_unitario } = detalle;
        await pool.promise().query(
            'UPDATE Detalles_Pedido SET cantidad = ?, precio_unitario = ? WHERE id = ?',
            [cantidad, precio_unitario, id]
        );
        return true;
    }

    // Eliminar detalle
    static async delete(id) {
        await pool.promise().query('DELETE FROM Detalles_Pedido WHERE id = ?', [id]);
        return true;
    }
}

module.exports = DetallePedido;