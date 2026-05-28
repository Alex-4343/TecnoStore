// URL base de tu backend de TecnoStore (reemplaza por la URL real de Render)
export const BASE_URL = 'https://tecnostore-3opr.onrender.com/api';

/**
 * Obtiene todos los productos desde el Backend
 * @returns {Promise<Array>} Lista de productos
 */
export const getProducts = async () => {
    try {
        const response = await fetch(`${BASE_URL}/productos`);

        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status}`);
        }

        const data = await response.json();
        return data; // Aquí retornas el JSON que verificamos antes
    } catch (error) {
        console.error("❌ Error al obtener productos:", error);
        return [];
    }
};

/**
 * Obtiene un producto por su ID (incluye stock y descripción)
 * @param {number} id - ID del producto
 * @returns {Promise<Object|null>} Producto con todos sus detalles
 */
export const getProductById = async (id) => {
    try {
        const response = await fetch(`${BASE_URL}/productos/${id}`);
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('❌ Error al obtener producto por ID:', error);
        return null;
    }
};

/**
 * Obtiene las categorías para la barra de navegación superior
 */
export const getCategories = async () => {
    try {
        const response = await fetch(`${BASE_URL}/categorias`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("❌ Error al obtener categorías:", error);
        return [];
    }
};