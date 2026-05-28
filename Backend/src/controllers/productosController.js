const Producto = require('../models/Productos');

// Controlador para Productos
class ProductosController {
    // Obtener todos los productos
    static async getAll(req, res) {
        try {
            const productos = await Producto.getAll();
            res.json(productos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtener producto por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const producto = await Producto.getById(id);
            if (!producto) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            res.json(producto);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtener productos por categoría
    static async getByCategoria(req, res) {
        try {
            const { idCategoria } = req.params;
            const productos = await Producto.getByCategoria(idCategoria);
            res.json(productos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Crear producto
    static async create(req, res) {
        try {
            const nuevoProducto = req.body;
            const id = await Producto.create(nuevoProducto);
            res.status(201).json({ id, message: 'Producto creado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Actualizar producto
    static async update(req, res) {
        try {
            const { id } = req.params;
            const productoData = req.body;
            await Producto.update(id, productoData);
            res.json({ message: 'Producto actualizado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Eliminar producto
    static async delete(req, res) {
        try {
            const { id } = req.params;
            await Producto.delete(id);
            res.json({ message: 'Producto eliminado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ProductosController;