const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuarios');

class AuthController {

    // POST /api/auth/login
    static async login(req, res) {
        const { correo, contrasena } = req.body;

        if (!correo || !contrasena) {
            return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
        }

        try {
            const usuario = await Usuario.getByEmail(correo);

            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            let esValida = false;
            // Support plain text passwords from DB migration script
            if (usuario.contrasena.startsWith('$2')) {
                esValida = await bcrypt.compare(contrasena, usuario.contrasena);
            } else {
                esValida = (contrasena === usuario.contrasena);
            }

            if (!esValida) {
                return res.status(401).json({ error: 'Contraseña incorrecta' });
            }

            // Devolver datos de sesión (sin la contraseña)
            res.json({
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol,
                telefono: usuario.telefono || '',
                direccion: usuario.direccion || ''
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // POST /api/auth/register
    static async register(req, res) {
        const { nombre, correo, contrasena, telefono, direccion } = req.body;

        if (!nombre || !correo || !contrasena) {
            return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos' });
        }

        try {
            // Verificar si el correo ya está registrado
            const existente = await Usuario.getByEmail(correo);
            if (existente) {
                return res.status(409).json({ error: 'El correo ya está registrado' });
            }

            // Encriptar la contraseña
            const salt = await bcrypt.genSalt(10);
            const contrasenaHash = await bcrypt.hash(contrasena, salt);

            const nuevoUsuario = {
                nombre,
                correo,
                contrasena: contrasenaHash,
                telefono: telefono || null,
                direccion: direccion || null,
                rol: 'cliente'
            };

            const id = await Usuario.create(nuevoUsuario);

            res.status(201).json({
                id,
                nombre,
                correo,
                rol: 'cliente',
                telefono: telefono || '',
                direccion: direccion || ''
            });

        } catch (error) {
            console.error('Error en registro:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
}

module.exports = AuthController;
