const pool = require('../config/db');

class Proveedor {
    static async getAll() {
        const [rows] = await pool.promise().query(
            "SELECT * FROM Proveedores WHERE estado = 'activo' ORDER BY id DESC"
        );
        return rows;
    }

    static async getById(id) {
        const [rows] = await pool.promise().query(
            "SELECT * FROM Proveedores WHERE id = ?",
            [id]
        );
        return rows[0];
    }

    static async create(proveedor) {
        const { nombre, contacto, telefono, correo } = proveedor;
        const [result] = await pool.promise().query(
            "INSERT INTO Proveedores (nombre, contacto, telefono, correo) VALUES (?, ?, ?, ?)",
            [nombre, contacto, telefono, correo]
        );
        return result.insertId;
    }

    static async update(id, proveedor) {
        const { nombre, contacto, telefono, correo } = proveedor;
        const estado = proveedor.estado || 'activo';
        await pool.promise().query(
            "UPDATE Proveedores SET nombre = ?, contacto = ?, telefono = ?, correo = ?, estado = ? WHERE id = ?",
            [nombre, contacto, telefono, correo, estado, id]
        );
        return true;
    }

    static async delete(id) {
        // Soft delete
        await pool.promise().query(
            "UPDATE Proveedores SET estado = 'inactivo' WHERE id = ?",
            [id]
        );
        return true;
    }
}

module.exports = Proveedor;
