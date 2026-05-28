const pool = require('../config/db');

// Modelo para Inventario y Reportes
class Inventario {
    // Método para el panel de administración (reporte de inventario)
    static async getInventoryReport() {
        const [rows] = await pool.promise().query(`
            SELECT 
                (SELECT COALESCE(SUM(cantidad_disponible * precio_compra_lote), 0) FROM Lotes_Inventario) AS inversion_total,
                SUM(precio_venta * COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = Productos.id), 0)) AS venta_potencial
            FROM Productos;
        `);
        const result = rows[0] || { inversion_total: 0, venta_potencial: 0 };
        result.ganancia_proyectada = result.venta_potencial - result.inversion_total;
        return result;
    }
}

module.exports = Inventario;