/**
 * Módulo de Gestión del Carrito de Compras
 * Maneja almacenamiento, actualización y renderizado del carrito
 */

import { BASE_URL } from './api.js';

// Arreglo global para el carrito
let carrito = JSON.parse(localStorage.getItem('tecnostore_cart')) || [];

/**
 * Obtiene el carrito actual
 * @returns {Array} Array con los productos del carrito
 */
export const getCarrito = () => {
    return carrito;
};

/**
 * Agrega un producto al carrito o incrementa su cantidad
 * @param {Object} producto - Objeto del producto con id, nombre, precio, etc.
 */
export const agregarAlCarrito = (producto) => {
    // Verificamos si el producto ya está en el carrito
    const existe = carrito.find(item => item.id === producto.id);
    
    if (existe) {
        existe.cantidad++;
    } else {
        // Agregamos el producto con cantidad inicial 1
        carrito.push({ 
            ...producto, 
            cantidad: 1,
            precio_unitario: producto.precio // Guardamos el precio original
        });
    }
    
    // Guardamos en localStorage y actualizamos UI
    guardarCarrito();
    actualizarContadorCarrito();
    mostrarNotificacion(`${producto.nombre} agregado al carrito`);
};

/**
 * Elimina un producto del carrito
 * @param {number} productId - ID del producto a eliminar
 */
export const eliminarDelCarrito = (productId) => {
    carrito = carrito.filter(item => item.id !== productId);
    guardarCarrito();
    actualizarContadorCarrito();
    renderizarCarrito();
};

/**
 * Actualiza la cantidad de un producto en el carrito
 * @param {number} productId - ID del producto
 * @param {number} nuevaCantidad - Nueva cantidad (debe ser >= 1)
 */
export const actualizarCantidad = (productId, nuevaCantidad) => {
    if (nuevaCantidad < 1) {
        eliminarDelCarrito(productId);
        return;
    }
    
    const producto = carrito.find(item => item.id === productId);
    if (producto) {
        producto.cantidad = nuevaCantidad;
        guardarCarrito();
        actualizarContadorCarrito();
        renderizarCarrito();
    }
};

/**
 * Vacía completamente el carrito
 */
export const vaciarCarrito = () => {
    if (confirm('¿Deseas vaciar todo el carrito?')) {
        carrito = [];
        guardarCarrito();
        actualizarContadorCarrito();
        renderizarCarrito();
    }
};

/**
 * Vacía el carrito silenciosamente (sin confirmación)
 * Usar tras una compra exitosa
 */
export const limpiarCarrito = () => {
    carrito = [];
    guardarCarrito();
    actualizarContadorCarrito();
    renderizarCarrito();
};

/**
 * Calcula el total del carrito
 * @returns {number} Total a pagar
 */
export const calcularTotal = () => {
    return carrito.reduce((total, item) => {
        return total + (item.precio_unitario * item.cantidad);
    }, 0);
};

/**
 * Guarda el carrito en localStorage
 */
const guardarCarrito = () => {
    localStorage.setItem('tecnostore_cart', JSON.stringify(carrito));
};

/**
 * Actualiza el contador del carrito en el header
 */
const actualizarContadorCarrito = () => {
    const cartCounter = document.querySelector('.cart-counter');
    if (cartCounter) {
        const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
        cartCounter.textContent = totalItems;
    }
};

/**
 * Renderiza el carrito en el side drawer
 */
export const renderizarCarrito = () => {
    const cartItemsContainer = document.querySelector('.cart-items-container');
    const cartTotal = document.querySelector('.cart-total');
    
    if (!cartItemsContainer) return;
    
    cartItemsContainer.innerHTML = '';

    if (carrito.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Tu carrito está vacío</p>
            </div>
        `;
        if (cartTotal) cartTotal.textContent = '$0';
        return;
    }

    let total = 0;

    carrito.forEach(item => {
        const subtotal = item.precio_unitario * item.cantidad;
        total += subtotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.imagen_url || 'assets/images/lenovo-v14.jpg'}" 
                     alt="${item.nombre}"
                     onerror="this.src='assets/images/lenovo-v14.jpg'">
            </div>
            <div class="cart-item-details">
                <h4>${item.nombre}</h4>
                <p class="price">${formatPrice(item.precio_unitario)}</p>
                <div class="cart-item-breakdown" data-id="${item.id}"></div>
                <div class="quantity-controls">
                    <button class="btn-qty" data-action="decrease" data-id="${item.id}">−</button>
                    <input type="number" value="${item.cantidad}" min="1" data-id="${item.id}" class="qty-input" readonly>
                    <button class="btn-qty" data-action="increase" data-id="${item.id}">+</button>
                </div>
            </div>
            <div class="cart-item-actions">
                <p class="subtotal">${formatPrice(subtotal)}</p>
                <button class="btn-remove" data-id="${item.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        cartItemsContainer.appendChild(cartItem);
    });

    if (cartTotal) {
        // Actualizamos con la estimación FIFO si es posible
        fetch(`${BASE_URL}/cart/estimate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: carrito.map(i => ({ id: i.id, cantidad: i.cantidad })) })
        }).then(r => r.json()).then(data => {
            if (data && data.items) {
                // Actualizar subtotales y breakdown por item
                data.items.forEach(it => {
                    const item = carrito.find(ci => ci.id === it.id_producto);
                    if (!item) return;
                    // actualizar subtotal mostrado
                    const cartItemNode = document.querySelector(`.cart-item .cart-item-actions .subtotal`);
                    // mejor: buscar el subtotal específico para este item
                    const container = Array.from(document.querySelectorAll('.cart-item')).find(node => {
                        return Number(node.querySelector('.btn-qty').getAttribute('data-id')) === it.id_producto;
                    });
                    if (container) {
                        const subtotalEl = container.querySelector('.subtotal');
                        if (subtotalEl) subtotalEl.textContent = formatPrice(it.total_producto);

                        const breakdownEl = container.querySelector('.cart-item-breakdown');
                        if (breakdownEl) {
                            if (it.asignaciones && it.asignaciones.length > 1) {
                                breakdownEl.innerHTML = '<small>Desglose: ' + it.asignaciones.map(a => `${a.cantidad} × ${formatPrice(a.precio_venta_unitario)}`).join(' + ') + '</small>';
                            } else if (it.asignaciones && it.asignaciones.length === 1) {
                                breakdownEl.innerHTML = `<small>Precio por unidad: ${formatPrice(it.asignaciones[0].precio_venta_unitario)}</small>`;
                            } else {
                                breakdownEl.innerHTML = `<small>Sin stock suficiente</small>`;
                            }
                        }
                    }
                });

                cartTotal.textContent = formatPrice(data.total || 0);

                // Mostrar advertencia si algún producto usa múltiples lotes (precio puede variar)
                const warningEl = document.querySelector('.cart-warning');
                const anyMixed = data.items.some(it => it.asignaciones && it.asignaciones.length > 1);
                const anyShort = data.items.some(it => it.restante && it.restante > 0);
                if (warningEl) {
                    if (anyShort) {
                        warningEl.style.display = 'block';
                        warningEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="margin-right:8px"></i> Atención: stock insuficiente para algunas cantidades solicitadas.';
                    } else if (anyMixed) {
                        warningEl.style.display = 'block';
                        warningEl.innerHTML = '<i class="fas fa-info-circle" style="margin-right:8px"></i> Nota: el precio puede variar ligeramente si el pedido consume unidades de varios lotes.';
                    } else {
                        warningEl.style.display = 'none';
                        warningEl.textContent = '';
                    }
                }
            } else {
                cartTotal.textContent = formatPrice(total);
            }
        }).catch((err) => {
            console.error('Error al estimar carrito:', err);
            cartTotal.textContent = formatPrice(total);
        });
    } else {
        cartTotal.textContent = formatPrice(total);
    }

    // Agregar event listeners a los botones de cantidad
    setupQuantityControls();
    setupRemoveButtons();
};

/**
 * Configura los controles de cantidad en el carrito
 */
const setupQuantityControls = () => {
    const botonesQty = document.querySelectorAll('.btn-qty');

    botonesQty.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            const productId = parseInt(e.target.getAttribute('data-id'));
            const producto = carrito.find(item => item.id === productId);

            if (producto) {
                if (action === 'increase') {
                    actualizarCantidad(productId, producto.cantidad + 1);
                } else if (action === 'decrease') {
                    actualizarCantidad(productId, producto.cantidad - 1);
                }
            }
        });
    });
};

/**
 * Configura los botones de eliminar
 */
const setupRemoveButtons = () => {
    const botonesRemove = document.querySelectorAll('.btn-remove');

    botonesRemove.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(btn.getAttribute('data-id'));
            eliminarDelCarrito(productId);
        });
    });
};

/**
 * Abre/Cierra el drawer del carrito
 */
export const toggleCartDrawer = () => {
    const cartDrawer = document.querySelector('.cart-drawer');
    if (cartDrawer) {
        cartDrawer.classList.toggle('active');
        // Renderizar el carrito al abrir el drawer
        if (cartDrawer.classList.contains('active')) {
            renderizarCarrito();
        }
    }
};

/**
 * Cierra el drawer del carrito
 */
export const closeCartDrawer = () => {
    const cartDrawer = document.querySelector('.cart-drawer');
    if (cartDrawer) {
        cartDrawer.classList.remove('active');
    }
};

/**
 * Abre el drawer del carrito
 */
export const openCartDrawer = () => {
    const cartDrawer = document.querySelector('.cart-drawer');
    if (cartDrawer) {
        cartDrawer.classList.add('active');
        renderizarCarrito();
    }
};

/**
 * Muestra una notificación temporal
 * @param {string} mensaje - Mensaje a mostrar
 */
const mostrarNotificacion = (mensaje) => {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = mensaje;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
};

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
 * Obtiene el carrito formateado para enviar al servidor
 * @returns {Array} Array con los items del carrito listo para enviar
 */
export const prepararCarritoParaPedido = () => {
    return carrito.map(item => ({
        id_producto: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.precio_unitario * item.cantidad
    }));
};

/**
 * Inicializa el carrito en la página
 */
export const initCart = () => {
    // Cargar carrito guardado al iniciar
    carrito = JSON.parse(localStorage.getItem('tecnostore_cart')) || [];
    actualizarContadorCarrito();

    // Event listener para abrir/cerrar el drawer
    const cartLink = document.querySelector('.cart-link');
    const cartDrawerOverlay = document.querySelector('.cart-drawer-overlay');
    const cartDrawerClose = document.querySelector('.cart-drawer-close');

    if (cartLink) {
        cartLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleCartDrawer();
        });
    }

    if (cartDrawerOverlay) {
        cartDrawerOverlay.addEventListener('click', closeCartDrawer);
    }

    if (cartDrawerClose) {
        cartDrawerClose.addEventListener('click', closeCartDrawer);
    }

    // Renderizar carrito si hay productos guardados
    if (carrito.length > 0) {
        renderizarCarrito();
    }
};
