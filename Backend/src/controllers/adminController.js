const pool          = require('../config/db');
const Producto      = require('../models/Productos');
const Pedido        = require('../models/Pedidos');
const Inventario    = require('../models/Inventario');
const LoteInventario = require('../models/LotesInventario');

// Controlador para Administración
class AdminController {
    
    // ===== DASHBOARD =====
    
    /**
     * Obtener estadísticas principales del dashboard
     * Retorna: Inversión total, Venta potencial, Ganancia proyectada, Total de productos
     */
    static async getStats(req, res) {
        try {
            // Inversión real: suma de (unidades disponibles × precio de costo de cada lote)
            const inversionTotal = await LoteInventario.getInversionTotal();
            const [rest] = await pool.promise().query(`
                SELECT
                    SUM(precio_venta * COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = Productos.id), 0))                           AS venta_potencial,
                    COUNT(id)                                           AS total_productos,
                    SUM(COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = Productos.id), 0))                                          AS stock_total
                FROM Productos
                WHERE estado = 'activo'
            `);

            const venta_potencial   = Number(rest[0].venta_potencial   || 0);
            const ganancia_proyectada = venta_potencial - inversionTotal;

            res.json({
                inversion_total:    inversionTotal,
                venta_potencial,
                ganancia_proyectada,
                total_productos:    rest[0].total_productos || 0,
                stock_total:        rest[0].stock_total     || 0
            });
        } catch (error) {
            console.error('Error en getStats:', error);
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    }

    /**
     * Obtener resumen de ventas (últimos 30 días)
     */
    static async getSalesResumen(req, res) {
        try {
            const [ventas] = await pool.promise().query(`
                SELECT
                    COUNT(DISTINCT p.id)                                      AS total_pedidos,
                    SUM(dp.cantidad)                                           AS total_unidades,
                    SUM(dp.cantidad * dp.precio_unitario)                      AS total_vendido,
                    SUM(
                        (dp.precio_unitario
                         - COALESCE(dp.precio_compra_lote, (SELECT precio_compra_lote FROM Lotes_Inventario WHERE id_producto = pr.id AND cantidad_disponible > 0 ORDER BY fecha_entrada ASC LIMIT 1), 0)
                        ) * dp.cantidad
                    )                                                          AS ganancia_real
                FROM Pedidos p
                JOIN Detalles_Pedido dp ON p.id = dp.id_pedido
                JOIN Productos       pr ON dp.id_producto = pr.id
                WHERE p.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                  AND p.estado_pedido = 'pagado'
            `);
            
            const resumen = ventas[0] || {
                total_pedidos: 0, total_unidades: 0,
                total_vendido: 0, ganancia_real: 0
            };
            
            res.json(resumen);
        } catch (error) {
            console.error('Error en getSalesResumen:', error);
            res.status(500).json({ error: 'Error al obtener resumen de ventas' });
        }
    }

    /**
     * Obtener top 5 productos más vendidos
     */
    static async getTopProducts(req, res) {
        try {
            const [topProducts] = await pool.promise().query(`
                SELECT 
                    pr.id,
                    pr.nombre,
                    pr.imagen_url,
                    SUM(dp.cantidad) AS total_vendido,
                    SUM(dp.cantidad * dp.precio_unitario) AS ingreso_total,
                    COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = pr.id), 0) AS stock_actual
                FROM Detalles_Pedido dp
                JOIN Productos pr ON dp.id_producto = pr.id
                GROUP BY pr.id
                ORDER BY total_vendido DESC
                LIMIT 5
            `);
            
            res.json(topProducts);
        } catch (error) {
            console.error('Error en getTopProducts:', error);
            res.status(500).json({ error: 'Error al obtener productos más vendidos' });
        }
    }

    // ===== GESTIÓN DE PRODUCTOS (CRUD) =====

    /**
     * Obtener todos los productos (con más detalles para admin)
     */
    static async getAllProducts(req, res) {
        try {
            const [productos] = await pool.promise().query(`
                SELECT 
                    p.id,
                    p.nombre,
                    p.descripcion,
                    c.nombre AS categoria,
                    pv.nombre AS proveedor,
                    COALESCE((SELECT precio_compra_lote FROM Lotes_Inventario WHERE id_producto = p.id AND cantidad_disponible > 0 ORDER BY fecha_entrada ASC LIMIT 1), 0) AS precio_compra,
                    p.precio_venta,
                    COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = p.id), 0) AS stock,
                    p.imagen_url,
                    p.estado,
                    p.id_categoria,
                    p.id_proveedor
                FROM Productos p
                JOIN Categorias c ON p.id_categoria = c.id
                JOIN Proveedores pv ON p.id_proveedor = pv.id
                WHERE p.estado = 'activo'
                ORDER BY p.id DESC
            `);
            
            // Calculamos el margen de ganancia en JS para usar el precio de compra del lote actual
            const productosConMargen = productos.map(p => ({
                ...p,
                margen_ganancia: p.precio_venta - p.precio_compra,
                porcentaje_ganancia: p.precio_venta > 0 ? ((p.precio_venta - p.precio_compra) / p.precio_venta * 100) : 0
            }));
            
            res.json(productosConMargen);
        } catch (error) {
            console.error('Error en getAllProducts:', error);
            res.status(500).json({ error: 'Error al obtener productos' });
        }
    }

    /**
     * Crear un nuevo producto
     */
    static async createProduct(req, res) {
        try {
            const { id_categoria, id_proveedor, nombre, descripcion, imagen_url } = req.body;

            // Validaciones mínimas
            if (!nombre || !id_proveedor) {
                return res.status(400).json({ error: 'Datos incompletos' });
            }

            // Insertar producto con precio_venta en 0 (se actualizará por FIFO al agotar lote)
            const [result] = await pool.promise().query(
                `INSERT INTO Productos 
                (id_categoria, id_proveedor, nombre, descripcion, precio_venta, imagen_url, estado) 
                VALUES (?, ?, ?, ?, 0, ?, 'activo')`,
                [id_categoria, id_proveedor, nombre, descripcion, imagen_url]
            );

            const productId = result.insertId;

            res.status(201).json({ 
                id: productId, 
                message: 'Producto creado exitosamente' 
            });
        } catch (error) {
            console.error('Error en createProduct:', error);
            res.status(500).json({ error: 'Error al crear producto' });
        }
    }

    /**
     * Actualizar un producto
     */
    static async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const { nombre, descripcion, id_categoria, id_proveedor, precio_compra, precio_venta, imagen_url, estado } = req.body;
            
            if (precio_venta && precio_compra && precio_venta <= precio_compra) {
                return res.status(400).json({ error: 'El precio de venta debe ser mayor al de compra' });
            }
            
            const [result] = await pool.promise().query(
                `UPDATE Productos SET 
                nombre = COALESCE(?, nombre),
                descripcion = COALESCE(?, descripcion),
                id_categoria = COALESCE(?, id_categoria),
                id_proveedor = COALESCE(?, id_proveedor),
                precio_venta = COALESCE(?, precio_venta),
                imagen_url = COALESCE(?, imagen_url),
                estado = COALESCE(?, estado)
                WHERE id = ?`,
                [nombre, descripcion, id_categoria, id_proveedor, precio_venta, imagen_url, estado, id]
            );
            
            // Si el admin modifica el precio_compra en edición de producto, podríamos aplicar eso a los lotes, pero por ahora FIFO asume que el costo está en los lotes.

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            
            res.json({ message: 'Producto actualizado exitosamente' });
        } catch (error) {
            console.error('Error en updateProduct:', error);
            res.status(500).json({ error: 'Error al actualizar producto' });
        }
    }

    /**
     * Actualizar stock de un producto (reabastecer)
     */
    static async updateStock(req, res) {
        try {
            const { id } = req.params;
            const { cantidad, tipo, precio_compra_lote, descripcion } = req.body;

            if (!cantidad || !tipo) {
                return res.status(400).json({ error: 'Cantidad y tipo son requeridos' });
            }

            // Entradas FIFO requieren precio de compra del lote
            if (tipo === 'entrada' && (!precio_compra_lote || Number(precio_compra_lote) <= 0)) {
                return res.status(400).json({ error: 'El precio de compra del lote es requerido para entradas de stock' });
            }

            // Obtener stock y proveedor del producto
            const [product] = await pool.promise().query(
                'SELECT id_proveedor, COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = Productos.id), 0) AS stock FROM Productos WHERE id = ?',
                [id]
            );

            if (product.length === 0) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            const stockActual  = Number(product[0].stock);
            const id_proveedor = product[0].id_proveedor;
            let nuevoStock;

            if (tipo === 'entrada') {
                nuevoStock = stockActual + Number(cantidad);

                // ╔══ FIFO: crear nuevo lote ══╗
                await LoteInventario.crearLote({
                    id_producto:        id,
                    id_proveedor,
                    cantidad:           Number(cantidad),
                    precio_compra_lote: Number(precio_compra_lote)
                });

            } else if (tipo === 'salida') {
                nuevoStock = stockActual - Number(cantidad);
                if (nuevoStock < 0) {
                    return res.status(400).json({ error: 'Stock insuficiente' });
                }
                
                const connection = await pool.promise().getConnection();
                try {
                    await connection.beginTransaction();
                    await LoteInventario.descontarFIFO(id, Number(cantidad), connection);
                    await connection.commit();
                } catch(e) {
                    await connection.rollback();
                    throw e;
                } finally {
                    connection.release();
                }
            } else {
                return res.status(400).json({ error: 'Tipo debe ser "entrada" o "salida"' });
            }

            // Registrar en Movimientos_Inventario (kardex)
            await pool.promise().query(
                `INSERT INTO Movimientos_Inventario (id_producto, tipo, cantidad, motivo)
                 VALUES (?, ?, ?, ?)`,
                [id, tipo, cantidad, descripcion || `Movimiento de ${tipo}`]
            );

            res.json({
                message:       'Lote registrado y stock actualizado exitosamente',
                stock_anterior: stockActual,
                stock_nuevo:    nuevoStock
            });
        } catch (error) {
            console.error('Error en updateStock:', error);
            res.status(500).json({ error: 'Error al actualizar stock' });
        }
    }

    /**
     * Eliminar un producto (desactivar)
     */
    static async deleteProduct(req, res) {
        try {
            const { id } = req.params;
            
            const [result] = await pool.promise().query(
                'UPDATE Productos SET estado = "inactivo" WHERE id = ?',
                [id]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            
            res.json({ message: 'Producto desactivado exitosamente' });
        } catch (error) {
            console.error('Error en deleteProduct:', error);
            res.status(500).json({ error: 'Error al eliminar producto' });
        }
    }

    // ===== GESTIÓN DE LOTES (FIFO) =====

    /**
     * Obtener todos los lotes activos (con stock disponible)
     */
    static async getLotes(req, res) {
        try {
            const lotes = await LoteInventario.getTodosActivos();
            res.json(lotes);
        } catch (error) {
            console.error('Error en getLotes:', error);
            res.status(500).json({ error: 'Error al obtener lotes' });
        }
    }

    // ===== KARDEX (Historial de Movimientos) =====

    /**
     * Obtener historial de movimientos de inventario (Kardex)
     */
    static async getKardex(req, res) {
        try {
            const { id_producto } = req.query;
            
            let query = `
                SELECT 
                    k.id,
                    k.id_producto,
                    p.nombre AS producto_nombre,
                    k.tipo AS tipo_movimiento,
                    k.cantidad,
                    0 AS stock_anterior,
                    0 AS stock_nuevo,
                    k.motivo AS descripcion,
                    k.fecha AS fecha_movimiento
                FROM Movimientos_Inventario k
                JOIN Productos p ON k.id_producto = p.id
            `;
            
            let params = [];
            
            if (id_producto) {
                query += ' WHERE k.id_producto = ?';
                params.push(id_producto);
            }
            
            query += ' ORDER BY k.fecha DESC LIMIT 500';
            
            const [kardex] = await pool.promise().query(query, params);
            
            res.json(kardex);
        } catch (error) {
            console.error('Error en getKardex:', error);
            res.status(500).json({ error: 'Error al obtener kardex' });
        }
    }

    /**
     * Obtener resumen del Kardex por producto
     */
    static async getKardexResumen(req, res) {
        try {
            const [resumen] = await pool.promise().query(`
                SELECT 
                    id_producto,
                    (SELECT nombre FROM Productos WHERE id = Movimientos_Inventario.id_producto) AS producto_nombre,
                    COUNT(*) AS total_movimientos,
                    SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE 0 END) AS total_entradas,
                    SUM(CASE WHEN tipo = 'salida' THEN cantidad ELSE 0 END) AS total_salidas,
                    MAX(fecha) AS ultimo_movimiento
                FROM Movimientos_Inventario
                GROUP BY id_producto
                ORDER BY ultimo_movimiento DESC
            `);
            
            res.json(resumen);
        } catch (error) {
            console.error('Error en getKardexResumen:', error);
            res.status(500).json({ error: 'Error al obtener resumen de kardex' });
        }
    }

    // ===== REPORTES =====

    /**
     * Obtener reporte de productos con bajo stock
     */
    static async getLowStockReport(req, res) {
        try {
            const { umbral = 10 } = req.query;
            
            const [lowStock] = await pool.promise().query(`
                SELECT 
                    id,
                    nombre,
                    COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = Productos.id), 0) AS stock,
                    COALESCE((SELECT precio_compra_lote FROM Lotes_Inventario WHERE id_producto = Productos.id AND cantidad_disponible > 0 ORDER BY fecha_entrada ASC LIMIT 1), 0) AS precio_compra,
                    precio_venta,
                    id_categoria,
                    imagen_url
                FROM Productos
                WHERE COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = Productos.id), 0) <= ? AND estado = 'activo'
                ORDER BY stock ASC
            `, [umbral]);
            
            res.json(lowStock);
        } catch (error) {
            console.error('Error en getLowStockReport:', error);
            res.status(500).json({ error: 'Error al obtener reporte de bajo stock' });
        }
    }

    /**
     * Obtener reporte de rentabilidad por producto
     */
    static async getProfitabilityReport(req, res) {
        try {
            const [profitability] = await pool.promise().query(`
                SELECT 
                    p.id,
                    p.nombre,
                    COALESCE((SELECT precio_compra_lote FROM Lotes_Inventario WHERE id_producto = p.id AND cantidad_disponible > 0 ORDER BY fecha_entrada ASC LIMIT 1), 0) AS precio_compra,
                    p.precio_venta,
                    COALESCE((SELECT SUM(cantidad_disponible) FROM Lotes_Inventario WHERE id_producto = p.id), 0) AS stock,
                    COALESCE(SUM(dp.cantidad), 0) AS unidades_vendidas
                FROM Productos p
                LEFT JOIN Detalles_Pedido dp ON p.id = dp.id_producto
                WHERE p.estado = 'activo'
                GROUP BY p.id
            `);
            
            // Hacer los cálculos de margen con el precio de compra obtenido
            const profitabilityConMargen = profitability.map(p => {
                const margen_unitario = p.precio_venta - p.precio_compra;
                const porcentaje_margen = p.precio_venta > 0 ? (margen_unitario / p.precio_venta * 100) : 0;
                const ganancia_proyectada = margen_unitario * p.stock;
                
                return {
                    ...p,
                    margen_unitario,
                    porcentaje_margen,
                    ganancia_proyectada
                };
            }).sort((a, b) => b.ganancia_proyectada - a.ganancia_proyectada);
            
            res.json(profitabilityConMargen);
        } catch (error) {
            console.error('Error en getProfitabilityReport:', error);
            res.status(500).json({ error: 'Error al obtener reporte de rentabilidad' });
        }
    }

    /**
     * Obtener reporte de Top Buyers (Clientes Estrella)
     */
    static async getTopBuyers(req, res) {
        try {
            const { periodo = 'dia', fecha } = req.query;
            let dateCondition = '';
            
            if (periodo === 'especifico' && fecha) {
                dateCondition = `AND DATE(p.fecha_pedido) = ${pool.escape(fecha)}`;
            } else if (periodo === 'dia') {
                dateCondition = 'AND DATE(p.fecha_pedido) = CURRENT_DATE()';
            } else if (periodo === 'semana') {
                dateCondition = 'AND p.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            } else if (periodo === 'mes') {
                dateCondition = 'AND p.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            } else if (periodo === 'ano') {
                dateCondition = 'AND p.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            }

            const [topBuyers] = await pool.promise().query(`
                SELECT 
                    u.id AS id_usuario,
                    u.nombre AS cliente,
                    u.correo,
                    COUNT(p.id) AS total_pedidos,
                    SUM(p.total) AS total_invertido
                FROM Usuarios u
                JOIN Pedidos p ON u.id = p.id_usuario
                WHERE p.estado_pedido = 'pagado' ${dateCondition}
                GROUP BY u.id, u.nombre, u.correo
                ORDER BY total_invertido DESC
                LIMIT 5;
            `);
            res.json(topBuyers);
        } catch (error) {
            console.error('Error en getTopBuyers:', error);
            res.status(500).json({ error: 'Error al obtener reporte de clientes estrella' });
        }
    }

    /**
     * Obtener reporte de Best Sellers (Productos Más Vendidos)
     */
    static async getBestSellers(req, res) {
        try {
            const { periodo = 'dia', fecha } = req.query;
            let dateCondition = '';
            
            if (periodo === 'especifico' && fecha) {
                dateCondition = `AND DATE(ped.fecha_pedido) = ${pool.escape(fecha)}`;
            } else if (periodo === 'dia') {
                dateCondition = 'AND DATE(ped.fecha_pedido) = CURRENT_DATE()';
            } else if (periodo === 'semana') {
                dateCondition = 'AND ped.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            } else if (periodo === 'mes') {
                dateCondition = 'AND ped.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            } else if (periodo === 'ano') {
                dateCondition = 'AND ped.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            }

            const [bestSellers] = await pool.promise().query(`
                SELECT 
                    p.id AS id_producto,
                    p.nombre AS producto,
                    c.nombre AS categoria,
                    SUM(dp.cantidad) AS unidades_vendidas,
                    SUM(dp.cantidad * dp.precio_unitario) AS ingresos_generados
                FROM Detalles_Pedido dp
                JOIN Productos p ON dp.id_producto = p.id
                JOIN Categorias c ON p.id_categoria = c.id
                JOIN Pedidos ped ON dp.id_pedido = ped.id
                WHERE ped.estado_pedido = 'pagado' ${dateCondition}
                GROUP BY p.id, p.nombre, c.nombre
                ORDER BY unidades_vendidas DESC
                LIMIT 5;
            `);
            res.json(bestSellers);
        } catch (error) {
            console.error('Error en getBestSellers:', error);
            res.status(500).json({ error: 'Error al obtener reporte de productos más vendidos' });
        }
    }

    /**
     * Obtener reporte de Ventas Consolidadas por Período
     */
    static async getSalesConsolidated(req, res) {
        try {
            const { periodo = 'dia', fecha } = req.query;
            let dateCondition = '';
            
            if (periodo === 'especifico' && fecha) {
                dateCondition = `AND DATE(p.fecha_pedido) = ${pool.escape(fecha)}`;
            } else if (periodo === 'dia') {
                dateCondition = 'AND DATE(p.fecha_pedido) = CURRENT_DATE()';
            } else if (periodo === 'semana') {
                dateCondition = 'AND p.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            } else if (periodo === 'mes') {
                dateCondition = 'AND p.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            } else if (periodo === 'ano') {
                dateCondition = 'AND p.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            } else {
                return res.status(400).json({ error: 'Periodo inválido. Use dia, semana, mes, ano o especifico.' });
            }

            const query = `
                SELECT 
                    COUNT(DISTINCT p.id) AS numero_ventas,
                    IFNULL(SUM(dp.cantidad * dp.precio_unitario), 0) AS total_facturado,
                    IFNULL(SUM(dp.cantidad * (dp.precio_unitario - IFNULL(dp.precio_compra_lote, 0))), 0) AS ganancia_real_neta
                FROM Pedidos p
                JOIN Detalles_Pedido dp ON p.id = dp.id_pedido
                WHERE p.estado_pedido = 'pagado' 
                  ${dateCondition};
            `;

            const [results] = await pool.promise().query(query);
            res.json(results[0] || { numero_ventas: 0, total_facturado: 0, ganancia_real_neta: 0 });
        } catch (error) {
            console.error('Error en getSalesConsolidated:', error);
            res.status(500).json({ error: 'Error al obtener reporte de ventas consolidadas' });
        }
    }

    /**
     * Obtener reporte de Desempeño de Proveedores (Eficiencia Financiera)
     */
    static async getProvidersPerformance(req, res) {
        try {
            const { periodo = 'dia', fecha } = req.query;
            let dateCondition = '';
            
            if (periodo === 'especifico' && fecha) {
                dateCondition = `WHERE DATE(l.fecha_entrada) = ${pool.escape(fecha)}`;
            } else if (periodo === 'dia') {
                dateCondition = 'WHERE DATE(l.fecha_entrada) = CURRENT_DATE()';
            } else if (periodo === 'semana') {
                dateCondition = 'WHERE l.fecha_entrada >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            } else if (periodo === 'mes') {
                dateCondition = 'WHERE l.fecha_entrada >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            } else if (periodo === 'ano') {
                dateCondition = 'WHERE l.fecha_entrada >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            }

            const [providersPerformance] = await pool.promise().query(`
                SELECT 
                    prov.nombre AS proveedor,
                    COUNT(DISTINCT l.id_producto) AS variedad_productos,
                    SUM(l.cantidad_inicial) AS total_unidades_compradas,
                    SUM(l.cantidad_inicial * l.precio_compra_lote) AS inversion_total_real
                FROM Proveedores prov
                JOIN Lotes_Inventario l ON prov.id = l.id_proveedor
                ${dateCondition}
                GROUP BY prov.id, prov.nombre;
            `);
            res.json(providersPerformance);
        } catch (error) {
            console.error('Error en getProvidersPerformance:', error);
            res.status(500).json({ error: 'Error al obtener reporte de desempeño de proveedores' });
        }
    }

    /**
     * Obtener reporte de Métodos de Pago más Utilizados
     */
    static async getPaymentMethods(req, res) {
        try {
            const [paymentMethods] = await pool.promise().query(`
                SELECT 
                    metodo_pago,
                    COUNT(id) AS total_transacciones,
                    SUM(total) AS monto_total_procesado
                FROM Pedidos
                WHERE estado_pedido = 'pagado'
                GROUP BY metodo_pago
                ORDER BY total_transacciones DESC;
            `);
            res.json(paymentMethods);
        } catch (error) {
            console.error('Error en getPaymentMethods:', error);
            res.status(500).json({ error: 'Error al obtener reporte de métodos de pago' });
        }
    }

    /**
     * Obtener reporte de Cliente con mayor compra por producto
     * Para cada producto, muestra el cliente que más unidades ha comprado
     */
    static async getTopBuyersPerProduct(req, res) {
        try {
            const { periodo = 'dia', fecha } = req.query;
            let dateCondition = '';
            
            if (periodo === 'especifico' && fecha) {
                dateCondition = `AND DATE(p.fecha_pedido) = ${pool.escape(fecha)}`;
            } else if (periodo === 'dia') {
                dateCondition = 'AND DATE(p.fecha_pedido) = CURRENT_DATE()';
            } else if (periodo === 'semana') {
                dateCondition = 'AND p.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            } else if (periodo === 'mes') {
                dateCondition = 'AND p.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            } else if (periodo === 'ano') {
                dateCondition = 'AND p.fecha_pedido >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            }

            const [results] = await pool.promise().query(`
                SELECT 
                    ranked.producto_id,
                    ranked.producto,
                    ranked.cliente_id,
                    ranked.cliente,
                    ranked.correo,
                    ranked.total_unidades,
                    ranked.total_gasto
                FROM (
                    SELECT 
                        pr.id AS producto_id,
                        pr.nombre AS producto,
                        u.id AS cliente_id,
                        u.nombre AS cliente,
                        u.correo,
                        SUM(dp.cantidad) AS total_unidades,
                        SUM(dp.cantidad * dp.precio_unitario) AS total_gasto,
                        ROW_NUMBER() OVER (PARTITION BY pr.id ORDER BY SUM(dp.cantidad) DESC) AS rn
                    FROM Pedidos p
                    JOIN Detalles_Pedido dp ON p.id = dp.id_pedido
                    JOIN Productos pr ON dp.id_producto = pr.id
                    JOIN Usuarios u ON p.id_usuario = u.id
                    WHERE p.estado_pedido = 'pagado' ${dateCondition}
                    GROUP BY pr.id, pr.nombre, u.id, u.nombre, u.correo
                ) ranked
                WHERE ranked.rn = 1
                ORDER BY ranked.total_unidades DESC;
            `);
            res.json(results);
        } catch (error) {
            console.error('Error en getTopBuyersPerProduct:', error);
            res.status(500).json({ error: 'Error al obtener reporte de cliente top por producto' });
        }
    }

    /**
     * Obtener reporte de Información de lotes de compra (incluyendo vendidos)
     */
    static async getLotesInfoReport(req, res) {
        try {
            const { periodo = 'dia', fecha } = req.query;
            let dateCondition = '';
            
            if (periodo === 'especifico' && fecha) {
                dateCondition = `WHERE DATE(l.fecha_entrada) = ${pool.escape(fecha)}`;
            } else if (periodo === 'dia') {
                dateCondition = 'WHERE DATE(l.fecha_entrada) = CURRENT_DATE()';
            } else if (periodo === 'semana') {
                dateCondition = 'WHERE l.fecha_entrada >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            } else if (periodo === 'mes') {
                dateCondition = 'WHERE l.fecha_entrada >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            } else if (periodo === 'ano') {
                dateCondition = 'WHERE l.fecha_entrada >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            }

            const [lotes] = await pool.promise().query(`
                SELECT 
                    l.id,
                    p.nombre AS producto,
                    pr.nombre AS proveedor,
                    l.cantidad_inicial,
                    l.cantidad_disponible,
                    (l.cantidad_inicial - l.cantidad_disponible) AS cantidad_vendida,
                    l.precio_compra_lote,
                    l.fecha_entrada
                FROM Lotes_Inventario l
                JOIN Productos p ON l.id_producto = p.id
                LEFT JOIN Proveedores pr ON l.id_proveedor = pr.id
                ${dateCondition}
                ORDER BY l.fecha_entrada DESC
            `);
            res.json(lotes);
        } catch (error) {
            console.error('Error en getLotesInfoReport:', error);
            res.status(500).json({ error: 'Error al obtener reporte de lotes' });
        }
    }
}

module.exports = AdminController;
