const Proveedor = require('../models/Proveedores');

class ProveedoresController {
    static async getAll(req, res) {
        try {
            const proveedores = await Proveedor.getAll();
            res.json(proveedores);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const proveedor = await Proveedor.getById(id);
            if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
            res.json(proveedor);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const id = await Proveedor.create(req.body);
            res.status(201).json({ id, message: 'Proveedor creado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            await Proveedor.update(id, req.body);
            res.json({ message: 'Proveedor actualizado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            await Proveedor.delete(id);
            res.json({ message: 'Proveedor eliminado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ProveedoresController;
