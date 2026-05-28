const pool = require('../config/db');

// Modelo para Pedidos
class Pedido {
    // Obtener todos los pedidos
    static async getAll() {
        const [rows] = await pool.promise().query(`
            SELECT p.*, u.nombre as usuario_nombre, u.correo as usuario_correo
            FROM Pedidos p
            JOIN Usuarios u ON p.id_usuario = u.id
        `);
        return rows;
    }

    // Obtener pedido por ID con detalles
    static async getById(id) {
        const [rows] = await pool.promise().query(`
            SELECT p.*, u.nombre as usuario_nombre, u.correo as usuario_correo
            FROM Pedidos p
            JOIN Usuarios u ON p.id_usuario = u.id
            WHERE p.id = ?
        `, [id]);
        if (rows.length === 0) return null;

        const pedido = rows[0];
        // Obtener detalles del pedido
        const [detalles] = await pool.promise().query(`
            SELECT dp.*, pr.nombre as producto_nombre, pr.imagen_url
            FROM Detalles_Pedido dp
            JOIN Productos pr ON dp.id_producto = pr.id
            WHERE dp.id_pedido = ?
        `, [id]);
        pedido.detalles = detalles;
        return pedido;
    }

    // Obtener pedidos por usuario (solo cabeceras, para listas)
    static async getByUsuario(idUsuario) {
        const [rows] = await pool.promise().query(`
            SELECT p.*, u.nombre as usuario_nombre, u.correo as usuario_correo
            FROM Pedidos p
            JOIN Usuarios u ON p.id_usuario = u.id
            WHERE p.id_usuario = ?
        `, [idUsuario]);
        return rows;
    }

    // Obtener historial completo con detalles de productos (para "Mis Pedidos")
    static async getMisPedidos(idUsuario) {
        // Trae todos los pedidos del usuario
        const [pedidos] = await pool.promise().query(`
            SELECT id, total, estado_pedido, metodo_pago, fecha_pedido AS fecha
            FROM Pedidos
            WHERE id_usuario = ?
            ORDER BY fecha_pedido DESC
        `, [idUsuario]);

        if (pedidos.length === 0) return [];

        // Para cada pedido obtiene sus productos
        for (const pedido of pedidos) {
            const [detalles] = await pool.promise().query(`
                SELECT dp.cantidad, dp.precio_unitario,
                       pr.nombre AS producto_nombre, pr.imagen_url
                FROM Detalles_Pedido dp
                JOIN Productos pr ON dp.id_producto = pr.id
                WHERE dp.id_pedido = ?
            `, [pedido.id]);
            pedido.detalles = detalles;
        }

        return pedidos;
    }

    // Crear nuevo pedido
    static async create(pedido) {
        const { id_usuario, total, estado_pedido, metodo_pago } = pedido;
        const [result] = await pool.promise().query(
            'INSERT INTO Pedidos (id_usuario, total, estado_pedido, metodo_pago) VALUES (?, ?, ?, ?)',
            [id_usuario, total, estado_pedido || 'pendiente', metodo_pago || 'Pendiente']
        );
        return result.insertId;
    }

    // Actualizar pedido
    static async update(id, pedido) {
        const { estado_pedido, metodo_pago } = pedido;
        await pool.promise().query(
            'UPDATE Pedidos SET estado_pedido = ?, metodo_pago = ? WHERE id = ?',
            [estado_pedido, metodo_pago, id]
        );
        return true;
    }

    // Eliminar pedido
    static async delete(id) {
        await pool.promise().query('DELETE FROM Pedidos WHERE id = ?', [id]);
        return true;
    }
}

module.exports = Pedido;