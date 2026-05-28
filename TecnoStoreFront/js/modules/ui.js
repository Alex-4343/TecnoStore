/**
 * Formatea un número a moneda (Ej: 1699000 -> $1.699.000)
 */
const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(price);
};

/**
 * Renderiza los productos en el contenedor del DOM
 * @param {Array} products - Lista de productos desde la API
 * @param {HTMLElement} container - Div donde se insertarán las cards
 */
export const renderProducts = (products, container) => {
    container.innerHTML = ''; // Limpiar contenedor antes de pintar

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-product-id', product.id);

        // Imagen fallback por producto
        const localImages = {
            'Portátil Lenovo V14': 'assets/images/lenovo-v14.jpg',
            'Portátil HP Victus Gaming': 'assets/images/hp-victus.jpg',
            'PC Gamer Armado': 'assets/images/pc-gamer.jpg',
            'Mouse Logitech G203': 'assets/images/mouse-logitech.jpg',
            'Teclado Mecánico Redragon Kumara': 'assets/images/teclado-redragon.jpg'
        };

        const fallbackImage = localImages[product.nombre] || 'assets/images/lenovo-v14.jpg';

        const rawImageUrl = product.imagen_url && product.imagen_url.trim() !== '' ? product.imagen_url.trim() : '';
        const normalizedImageUrl = rawImageUrl.startsWith('/') ? rawImageUrl.slice(1) : rawImageUrl;

        const imageUrl = normalizedImageUrl !== '' ? normalizedImageUrl : fallbackImage;

        card.innerHTML = `
            <div class="card-badge">20% OFF</div>
            <!-- Wrapper de imagen clickeable para abrir el detalle -->
            <div class="product-img-wrapper open-detail" data-id="${product.id}" title="Ver detalles">
                <img
                  src="${imageUrl}"
                  alt="${product.nombre}"
                  class="product-img"
                  onerror="this.onerror=null;this.src='${fallbackImage}';"
                >
                <div class="product-img-overlay">
                    <i class="fas fa-eye"></i> Ver detalles
                </div>
            </div>
            <div class="shipping-tag">
                <i class="fas fa-truck"></i> Envío Gratis
            </div>
            <div class="product-info">
                <p class="category-tag">${product.categoria_nombre || 'Tecnología'}</p>
                <h3 class="product-title open-detail" data-id="${product.id}" style="cursor:pointer;">${product.nombre}</h3>
                <p class="price-old">${formatPrice(product.precio * 1.2)}</p>
                <p class="price-current">${formatPrice(product.precio)}</p>
                <button class="btn-add" 
                    data-id="${product.id}" 
                    data-nombre="${product.nombre}" 
                    data-precio="${product.precio}"
                    data-imagen="${imageUrl}"
                    data-categoria="${product.categoria_nombre || 'Tecnología'}">
                    Agregar al carrito
                </button>
            </div>
        `;

        // Agregar data-category-id para filtrado
        card.setAttribute('data-category-id', product.id_categoria);

        container.appendChild(card);
    });
};