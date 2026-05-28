const pool = require('../config/db');

// Modelo para Productos
class Producto {
    // Obtener todos los productos con el nombre de su categoría
    static async getAll() {
        const [rows] = await pool.promise().query(`
            SELECT p.id, p.id_categoria, p.id_proveedor, p.nombre, p.descripcion, 
                   p.precio_venta AS precio, 
                   COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = p.id), 0) AS stock, 
                   p.imagen_url, 
                   p.estado, c.nombre AS categoria_nombre, pv.nombre AS proveedor_nombre
            FROM Productos p
            JOIN Categorias c ON p.id_categoria = c.id
            JOIN Proveedores pv ON p.id_proveedor = pv.id
            WHERE p.estado = 'activo'
        `);
        return rows;
    }

    // Obtener producto por ID (útil para la página de detalles)
    static async getById(id) {
        const [rows] = await pool.promise().query(`
            SELECT p.id, p.id_categoria, p.id_proveedor, p.nombre, p.descripcion,
                   p.precio_venta AS precio,
                   COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = p.id), 0) AS stock,
                   p.imagen_url, p.estado,
                   c.nombre AS categoria_nombre,
                   pv.nombre AS proveedor_nombre
            FROM Productos p
            JOIN Categorias c ON p.id_categoria = c.id
            JOIN Proveedores pv ON p.id_proveedor = pv.id
            WHERE p.id = ?
        `, [id]);
        return rows[0];
    }

    // Obtener productos por categoría
    static async getByCategoria(idCategoria) {
        const [rows] = await pool.promise().query(`
            SELECT p.id, p.id_categoria, p.id_proveedor, p.nombre, p.descripcion, 
                   p.precio_venta AS precio, 
                   COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = p.id), 0) AS stock, 
                   p.imagen_url, 
                   p.estado, c.nombre AS categoria_nombre, pv.nombre AS proveedor_nombre
            FROM Productos p
            JOIN Categorias c ON p.id_categoria = c.id
            JOIN Proveedores pv ON p.id_proveedor = pv.id
            WHERE p.id_categoria = ? AND p.estado = 'activo'
        `, [idCategoria]);
        return rows;
    }

    // Crear nuevo producto
    static async create(producto) {
        const { id_categoria, id_proveedor, nombre, descripcion, precio_venta, imagen_url, estado } = producto;
        const [result] = await pool.promise().query(
            'INSERT INTO Productos (id_categoria, id_proveedor, nombre, descripcion, precio_venta, imagen_url, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id_categoria, id_proveedor, nombre, descripcion, precio_venta, imagen_url, estado || 'activo']
        );
        return result.insertId;
    }

    // Actualizar producto
    static async update(id, producto) {
        const { id_categoria, id_proveedor, nombre, descripcion, precio_venta, imagen_url, estado } = producto;
        await pool.promise().query(
            'UPDATE Productos SET id_categoria = ?, id_proveedor = ?, nombre = ?, descripcion = ?, precio_venta = ?, imagen_url = ?, estado = ? WHERE id = ?',
            [id_categoria, id_proveedor, nombre, descripcion, precio_venta, imagen_url, estado, id]
        );
        return true;
    }

    // Eliminar producto
    static async delete(id) {
        await pool.promise().query('DELETE FROM Productos WHERE id = ?', [id]);
        return true;
    }
}

module.exports = Producto;