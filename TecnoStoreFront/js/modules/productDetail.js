import { getProductById } from './api.js';
import { agregarAlCarrito } from './cart.js';

/** Formatea precio a COP */
const fmt = (n) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

// Imágenes locales de respaldo
const LOCAL_IMAGES = {
    'Portátil Lenovo V14': 'assets/images/lenovo-v14.jpg',
    'Portátil HP Victus Gaming': 'assets/images/hp-victus.jpg',
    'PC Gamer Armado': 'assets/images/pc-gamer.jpg',
    'Mouse Logitech G203': 'assets/images/mouse-logitech.jpg',
    'Teclado Mecánico Redragon Kumara': 'assets/images/teclado-redragon.jpg',
};

/** Devuelve la URL de imagen válida para un producto */
const resolveImg = (product) => {
    const raw = product.imagen_url?.trim() || '';
    const normalized = raw.startsWith('/') ? raw.slice(1) : raw;
    return normalized || LOCAL_IMAGES[product.nombre] || 'assets/images/lenovo-v14.jpg';
};

/** Cierra el modal de detalle */
export const cerrarModalDetalle = () => {
    document.getElementById('modal-detalle').classList.remove('active');
    document.getElementById('modal-detalle-overlay').classList.remove('active');
    document.body.style.overflow = '';
};

/** Abre el modal con los detalles del producto */
export const abrirModalDetalle = async (productId) => {
    const modal = document.getElementById('modal-detalle');
    const body  = document.getElementById('modal-detalle-body');

    // Mostrar spinner mientras carga
    body.innerHTML = `
        <div class="pd-loading">
            <div class="pd-spinner"></div>
            <p>Cargando producto…</p>
        </div>`;
    modal.classList.add('active');
    document.getElementById('modal-detalle-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
        const p = await getProductById(productId);

        if (!p) {
            body.innerHTML = `
                <div class="pd-loading">
                    <p style="color:#dc3545;font-size:1.1rem">❌ No se pudo cargar el producto.</p>
                    <button onclick="document.getElementById('modal-detalle').querySelector('.pd-modal-close').click()"
                        style="margin-top:14px;padding:10px 24px;border-radius:10px;border:none;background:#007bff;color:#fff;cursor:pointer;font-size:0.95rem">
                        Cerrar
                    </button>
                </div>`;
            return;
        }

        // Normalizar precio: getById y getAll devuelven 'precio' (alias de precio_venta)
        const precio   = Number(p.precio ?? p.precio_venta ?? 0);
        const imgUrl   = resolveImg(p);
        const stockNum = Number(p.stock ?? 0);

        // Badge de stock dinámico
        let stockBadge = '';
        if (stockNum === 0) {
            stockBadge = `<span class="pd-stock-badge out">Sin stock</span>`;
        } else if (stockNum <= 5) {
            stockBadge = `<span class="pd-stock-badge low">🔥 Últimas ${stockNum} unidades</span>`;
        } else {
            stockBadge = `<span class="pd-stock-badge ok">✅ En stock</span>`;
        }

        // Descripción formateada como lista si tiene separadores
        const descLines = (p.descripcion || 'Sin descripción disponible.')
            .split(/\n|•|;/)
            .map(l => l.trim())
            .filter(Boolean);

        const descHTML = descLines.length > 1
            ? `<ul class="pd-desc-list">${descLines.map(l => `<li>${l}</li>`).join('')}</ul>`
            : `<p class="pd-desc-text">${descLines[0] || 'Sin descripción disponible.'}</p>`;

        const fallback = LOCAL_IMAGES[p.nombre] || 'assets/images/lenovo-v14.jpg';

        body.innerHTML = `
            <div class="pd-grid">
                <!-- Columna izquierda: imagen -->
                <div class="pd-image-col">
                    <div class="pd-img-wrapper">
                        <img id="pd-main-img"
                             src="${imgUrl}"
                             alt="${p.nombre}"
                             onerror="this.onerror=null;this.src='${fallback}'">
                    </div>
                    <p class="pd-free-ship"><i class="fas fa-truck"></i> Envío gratis</p>
                </div>

                <!-- Columna derecha: info -->
                <div class="pd-info-col">
                    <p class="pd-category">${p.categoria_nombre || 'Tecnología'}</p>
                    <h2 class="pd-title">${p.nombre}</h2>

                    ${stockBadge}

                    <div class="pd-prices">
                        <span class="pd-price-old">${fmt(precio * 1.25)}</span>
                        <span class="pd-price-now">${fmt(precio)}</span>
                        <span class="pd-discount-tag">20% OFF</span>
                    </div>

                    <!-- Stock disponible -->
                    <div class="pd-stock-row">
                        <i class="fas fa-boxes"></i>
                        <span>Stock disponible: <strong>${stockNum} unidades</strong></span>
                    </div>

                    <!-- Descripción del producto -->
                    <div class="pd-description">
                        <p class="pd-desc-title">
                            <i class="fas fa-info-circle"></i> Lo que tienes que saber de este producto
                        </p>
                        ${descHTML}
                    </div>

                    <!-- Botón agregar al carrito -->
                    <div class="pd-actions">
                        <button id="pd-btn-add"
                            class="pd-btn-add ${stockNum === 0 ? 'disabled' : ''}"
                            ${stockNum === 0 ? 'disabled' : ''}
                            data-id="${p.id}"
                            data-nombre="${p.nombre}"
                            data-precio="${precio}"
                            data-imagen="${imgUrl}"
                            data-categoria="${p.categoria_nombre || 'Tecnología'}">
                            <i class="fas fa-shopping-cart"></i>
                            ${stockNum === 0 ? 'Sin stock disponible' : 'Agregar al carrito'}
                        </button>
                    </div>

                    ${p.proveedor_nombre
                        ? `<p class="pd-provider"><i class="fas fa-store"></i> Vendido por <strong>${p.proveedor_nombre}</strong></p>`
                        : ''}
                    <p class="pd-guarantee">
                        <i class="fas fa-shield-alt"></i> Compra protegida · 12 meses de garantía
                    </p>
                </div>
            </div>`;

        // Conectar botón agregar al carrito
        const btnAdd = document.getElementById('pd-btn-add');
        if (btnAdd && stockNum > 0) {
            btnAdd.addEventListener('click', () => {
                agregarAlCarrito({
                    id: p.id,
                    nombre: p.nombre,
                    precio: precio,
                    precio_unitario: precio,
                    imagen_url: imgUrl,
                    categoria_nombre: p.categoria_nombre || 'Tecnología',
                });
                btnAdd.innerHTML = '<i class="fas fa-check"></i> ¡Añadido!';
                btnAdd.style.background = 'linear-gradient(135deg,#28a745,#1e7e34)';
                btnAdd.disabled = true;
                setTimeout(() => {
                    btnAdd.innerHTML = '<i class="fas fa-shopping-cart"></i> Agregar al carrito';
                    btnAdd.style.background = '';
                    btnAdd.disabled = false;
                }, 1800);
            });
        }

    } catch (err) {
        console.error('❌ Error al renderizar detalle de producto:', err);
        body.innerHTML = `
            <div class="pd-loading">
                <p style="color:#dc3545;font-size:1rem">❌ Error al cargar el producto.<br><small>${err.message}</small></p>
                <button id="pd-err-close"
                    style="margin-top:14px;padding:10px 24px;border-radius:10px;border:none;background:#007bff;color:#fff;cursor:pointer;font-size:0.95rem">
                    Cerrar
                </button>
            </div>`;
        document.getElementById('pd-err-close')?.addEventListener('click', cerrarModalDetalle);
    }
};

/** Inicializa el modal (close buttons, overlay click, tecla Escape) */
export const initProductDetailModal = () => {
    const modal    = document.getElementById('modal-detalle');
    const overlay  = document.getElementById('modal-detalle-overlay');
    const btnClose = document.getElementById('modal-detalle-close');

    if (btnClose) btnClose.addEventListener('click', cerrarModalDetalle);
    if (overlay)  overlay.addEventListener('click',  cerrarModalDetalle);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('active')) {
            cerrarModalDetalle();
        }
    });
};
