const Usuario = require('../models/Usuarios');

// Controlador para Usuarios
class UsuariosController {
    // Obtener todos los usuarios
    static async getAll(req, res) {
        try {
            const usuarios = await Usuario.getAll();
            res.json(usuarios);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtener usuario por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const usuario = await Usuario.getById(id);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            res.json(usuario);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Crear usuario
    static async create(req, res) {
        try {
            const nuevoUsuario = req.body;
            const id = await Usuario.create(nuevoUsuario);
            res.status(201).json({ id, message: 'Usuario creado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Actualizar usuario
    static async update(req, res) {
        try {
            const { id } = req.params;
            const usuarioData = req.body;
            await Usuario.update(id, usuarioData);
            res.json({ message: 'Usuario actualizado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Eliminar usuario
    static async delete(req, res) {
        try {
            const { id } = req.params;
            await Usuario.delete(id);
            res.json({ message: 'Usuario eliminado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UsuariosController;