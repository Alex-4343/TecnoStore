const Categoria = require('../models/Categorias');

// Controlador para Categorias
class CategoriasController {
    // Obtener todas las categorías
    static async getAll(req, res) {
        try {
            const categorias = await Categoria.getAll();
            res.json(categorias);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtener categoría por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const categoria = await Categoria.getById(id);
            if (!categoria) {
                return res.status(404).json({ error: 'Categoría no encontrada' });
            }
            res.json(categoria);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Crear categoría
    static async create(req, res) {
        try {
            const nuevaCategoria = req.body;
            const id = await Categoria.create(nuevaCategoria);
            res.status(201).json({ id, message: 'Categoría creada exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Actualizar categoría
    static async update(req, res) {
        try {
            const { id } = req.params;
            const categoriaData = req.body;
            await Categoria.update(id, categoriaData);
            res.json({ message: 'Categoría actualizada exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Eliminar categoría
    static async delete(req, res) {
        try {
            const { id } = req.params;
            await Categoria.delete(id);
            res.json({ message: 'Categoría eliminada exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = CategoriasController;