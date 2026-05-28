const pool = require('../config/db');

// Modelo para Categorias
class Categoria {
    // Obtener todas las categorías
    static async getAll() {
        const [rows] = await pool.promise().query('SELECT * FROM Categorias');
        return rows;
    }

    // Obtener categoría por ID
    static async getById(id) {
        const [rows] = await pool.promise().query('SELECT * FROM Categorias WHERE id = ?', [id]);
        return rows[0];
    }

    // Crear nueva categoría
    static async create(categoria) {
        const { nombre, descripcion } = categoria;
        const [result] = await pool.promise().query(
            'INSERT INTO Categorias (nombre, descripcion) VALUES (?, ?)',
            [nombre, descripcion]
        );
        return result.insertId;
    }

    // Actualizar categoría
    static async update(id, categoria) {
        const { nombre, descripcion } = categoria;
        await pool.promise().query(
            'UPDATE Categorias SET nombre = ?, descripcion = ? WHERE id = ?',
            [nombre, descripcion, id]
        );
        return true;
    }

    // Eliminar categoría
    static async delete(id) {
        await pool.promise().query('DELETE FROM Categorias WHERE id = ?', [id]);
        return true;
    }
}

module.exports = Categoria;