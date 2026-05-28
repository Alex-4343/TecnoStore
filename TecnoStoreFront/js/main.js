import { getProducts } from './modules/api.js';
import { renderProducts } from './modules/ui.js';
import { agregarAlCarrito, initCart, closeCartDrawer } from './modules/cart.js';
import { crearPedido, abrirModalPasarelaPago } from './modules/pedidos.js';
import { estaLogueado, getUsuario, actualizarHeaderAuth } from './modules/auth.js';
import { abrirModalDetalle, initProductDetailModal } from './modules/productDetail.js';

const init = async () => {
    const container = document.getElementById('products-container');

    console.log("Cargando productos...");
    const products = await getProducts();

    // Actualizar header según sesión activa
    actualizarHeaderAuth();

    if (products.length > 0) {
        renderProducts(products, container);
        setupSearch();
        setupCategoryFilter();
        setupCartButtons();
        initCart();
        setupCheckout();
        setupProductDetailClicks();
        initProductDetailModal();
    } else {
        container.innerHTML = '<p>No hay productos disponibles en este momento.</p>';
    }
};

// Función para el buscador
const setupSearch = () => {
    const searchInput = document.querySelector('.search-box input');

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const productCards = document.querySelectorAll('.product-card');

        productCards.forEach(card => {
            const productName = card.querySelector('.product-title').textContent.toLowerCase();

            if (productName.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
};

// Función para filtrado por categorías
const setupCategoryFilter = () => {
    const categoriesDropdown = document.getElementById('categoriesDropdown');
    const categoriesMenu = document.getElementById('categoriesMenu');
    const categoryLinks = document.querySelectorAll('#categoriesMenu a[data-category]');

    // Toggle del dropdown
    categoriesDropdown.addEventListener('click', (e) => {
        e.preventDefault();
        categoriesMenu.classList.toggle('active');
    });

    // Cerrar dropdown al hacer clic afuera
    document.addEventListener('click', (e) => {
        if (e.target !== categoriesDropdown && !categoriesMenu.contains(e.target)) {
            categoriesMenu.classList.remove('active');
        }
    });

    // Filtrado por categoría
    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedCategory = e.target.getAttribute('data-category');
            const productCards = document.querySelectorAll('.product-card');

            productCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category-id');

                if (selectedCategory === 'all' || cardCategory === selectedCategory) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });

            // Cerrar el dropdown después de seleccionar
            categoriesMenu.classList.remove('active');
        });
    });
};

// Función para configurar los botones de agregar al carrito con delegación de eventos
const setupCartButtons = () => {
    const container = document.getElementById('products-container');
    
    if (!container) return;
    
    // Delegación de eventos: escuchamos clicks en todo el contenedor
    container.addEventListener('click', (e) => {
        // Verificamos si lo que se clickeó fue el botón de agregar
        if (e.target.classList.contains('btn-add')) {
            const btn = e.target;
            
            // Extraemos los datos del botón con atributos data-
            const productoParaCarrito = {
                id: parseInt(btn.dataset.id),
                nombre: btn.dataset.nombre,
                precio: parseFloat(btn.dataset.precio),
                imagen_url: btn.dataset.imagen || 'assets/images/lenovo-v14.jpg',
                categoria_nombre: btn.dataset.categoria || 'Tecnología',
                // Agregamos precio_unitario para compatibilidad con cart.js
                precio_unitario: parseFloat(btn.dataset.precio)
            };
            
            // Llamamos a la función del carrito
            agregarAlCarrito(productoParaCarrito);
            
            // Feedback visual: cambio de color y texto del botón
            const textoOriginal = btn.textContent;
            const colorOriginal = btn.style.backgroundColor;
            
            btn.textContent = '✓ ¡Añadido!';
            btn.style.backgroundColor = '#28a745'; // Verde de éxito
            btn.disabled = true;
            
            // Volver al estado original después de 1.5 segundos
            setTimeout(() => {
                btn.textContent = textoOriginal;
                btn.style.backgroundColor = colorOriginal;
                btn.disabled = false;
            }, 1500);
        }
    });
};

// Función para configurar el botón de finalizar compra
const setupCheckout = () => {
    const btnCheckout = document.querySelector('.btn-checkout');

    if (btnCheckout) {
        btnCheckout.addEventListener('click', async () => {
            // ── Interceptor de autenticación ──
            if (!estaLogueado()) {
                sessionStorage.setItem('redirect_after_login', window.location.href);
                window.location.href = 'login.html';
                return;
            }

            try {
                const usuario = getUsuario();

                // ── Abrir modal de pasarela de pago ──
                const metodoPago = await abrirModalPasarelaPago();

                if (!metodoPago) return; // El usuario canceló

                // Feedback en el botón mientras procesa
                btnCheckout.disabled = true;
                btnCheckout.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

                const resultado = await crearPedido(usuario, metodoPago);

                closeCartDrawer();

                // ── Modal de éxito ──
                mostrarModalExito(resultado.id, usuario.nombre, metodoPago);

            } catch (error) {
                alert(`Error al procesar la compra: ${error.message}`);
                console.error('Error en checkout:', error);
            } finally {
                btnCheckout.disabled = false;
                btnCheckout.innerHTML = '<i class="fas fa-credit-card"></i> Finalizar Compra';
            }
        });
    }
};

/**
 * Muestra un modal de éxito tras completar el pedido
 */
const mostrarModalExito = (idPedido, nombreUsuario, metodoPago) => {
    const modal = document.createElement('div');
    modal.id = 'modal-exito';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9998;animation:pasaFadeIn .3s ease';
    modal.innerHTML = `
        <div style="width:100%;height:100%;background:rgba(10,10,30,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px">
            <div style="background:#fff;border-radius:24px;padding:44px 36px;max-width:400px;width:100%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.3);animation:pasaSlideUp .35s cubic-bezier(.34,1.56,.64,1)">
                <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#28a745,#1e7e34);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2rem;color:#fff">
                    <i class="fas fa-check"></i>
                </div>
                <h2 style="font-size:1.5rem;font-weight:800;color:#1a2e1a;margin-bottom:10px">¡Pedido Registrado! 🎉</h2>
                <p style="color:#555;font-size:.95rem;margin-bottom:6px">Gracias, <strong>${nombreUsuario}</strong></p>
                <p style="color:#888;font-size:.85rem;margin-bottom:18px">Pedido <strong>#${idPedido}</strong> · ${metodoPago}</p>
                <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:12px;padding:16px;margin-bottom:24px;text-align:left">
                    <p style="font-size:.82rem;color:#5d4037;line-height:1.6">
                        <i class="fas fa-clock" style="margin-right:6px;color:#f59e0b"></i>
                        Tu pedido está <strong>pendiente de confirmación</strong>. El administrador verificará tu pago en ${metodoPago} y lo confirmará.
                    </p>
                </div>
                <div style="display:flex;gap:10px;flex-direction:column">
                    <a href="mis-pedidos.html" style="display:block;padding:13px;background:linear-gradient(135deg,#007bff,#0040c8);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:.95rem">
                        <i class="fas fa-box-open"></i> Ver Mis Pedidos
                    </a>
                    <button onclick="document.getElementById('modal-exito').remove()" style="padding:11px;background:none;border:2px solid #e0e0e0;border-radius:12px;cursor:pointer;font-size:.9rem;color:#666;font-weight:600">
                        Seguir Comprando
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

// Función para manejar clicks en imagen/título y abrir modal de detalle
const setupProductDetailClicks = () => {
    const container = document.getElementById('products-container');
    if (!container) return;

    container.addEventListener('click', (e) => {
        // Buscar si el elemento clickeado (o su padre) tiene la clase open-detail
        const trigger = e.target.closest('.open-detail');
        if (trigger) {
            const productId = trigger.dataset.id;
            if (productId) abrirModalDetalle(parseInt(productId));
        }
    });
};

// Arrancar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);