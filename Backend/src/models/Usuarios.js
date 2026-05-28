const pool = require('../config/db');

// Modelo para Usuarios
class Usuario {
    // Obtener todos los usuarios
    static async getAll() {
        const [rows] = await pool.promise().query('SELECT * FROM Usuarios');
        return rows;
    }

    // Obtener usuario por ID
    static async getById(id) {
        const [rows] = await pool.promise().query('SELECT * FROM Usuarios WHERE id = ?', [id]);
        return rows[0];
    }

    // Crear nuevo usuario
    static async create(usuario) {
        const { nombre, correo, contrasena, telefono, direccion, rol } = usuario;
        const [result] = await pool.promise().query(
            'INSERT INTO Usuarios (nombre, correo, contrasena, telefono, direccion, rol) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, correo, contrasena, telefono, direccion, rol || 'cliente']
        );
        return result.insertId;
    }

    // Actualizar usuario
    static async update(id, usuario) {
        const { nombre, correo, contrasena, telefono, direccion, rol } = usuario;
        await pool.promise().query(
            'UPDATE Usuarios SET nombre = ?, correo = ?, contrasena = ?, telefono = ?, direccion = ?, rol = ? WHERE id = ?',
            [nombre, correo, contrasena, telefono, direccion, rol, id]
        );
        return true;
    }

    // Eliminar usuario
    static async delete(id) {
        await pool.promise().query('DELETE FROM Usuarios WHERE id = ?', [id]);
        return true;
    }

    // Buscar por correo (para login)
    static async getByEmail(correo) {
        const [rows] = await pool.promise().query('SELECT * FROM Usuarios WHERE correo = ?', [correo]);
        return rows[0];
    }
}

module.exports = Usuario;