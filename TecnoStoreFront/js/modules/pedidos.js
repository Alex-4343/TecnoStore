/**
 * Módulo de Gestión de Pedidos
 * Maneja la creación y envío de pedidos al servidor
 */

import { getCarrito, vaciarCarrito, limpiarCarrito, prepararCarritoParaPedido } from './cart.js';

const BASE_URL = 'http://localhost:3000/api';

/**
 * Finaliza la compra enviando carrito + usuario al endpoint transaccional.
 * El backend crea el pedido, los detalles y descuenta el stock en una sola transacción.
 * @param {Object} usuario - Datos del usuario autenticado {id, nombre, ...}
 * @returns {Promise<Object>} Respuesta del servidor con el id del pedido creado
 */
export const crearPedido = async (usuario, metodo_pago) => {
    const carrito = getCarrito();

    if (carrito.length === 0) {
        throw new Error('El carrito está vacío');
    }

    if (!usuario || !usuario.id) {
        throw new Error('Debes iniciar sesión para finalizar la compra');
    }

    if (!metodo_pago) {
        throw new Error('Debes seleccionar un método de pago');
    }

    // Total calculado en el frontend (el backend lo valida internamente)
    const total = carrito.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0);

    // Payload que espera el endpoint /finalizar-compra
    const payload = {
        id_usuario: usuario.id,
        total,
        metodo_pago,
        productos: carrito.map(item => ({
            id: item.id,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario
        }))
    };

    try {
        const response = await fetch(`${BASE_URL}/pedidos/finalizar-compra`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            // El backend devuelve el mensaje de error específico (ej: stock insuficiente)
            throw new Error(data.error || `Error del servidor: ${response.status}`);
        }

        // Solo vaciar el carrito si la transacción fue exitosa
        limpiarCarrito();

        return data;

    } catch (error) {
        console.error('❌ Error al finalizar compra:', error);
        throw error;
    }
};

/**
 * Abre el modal de pasarela de pago para seleccionar método
 * @returns {Promise<string|null>} Método seleccionado o null si canceló
 */
export const abrirModalPasarelaPago = () => {
    return new Promise((resolve) => {
        // Eliminar modal previo si existe
        document.getElementById('modal-pasarela')?.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-pasarela';
        modal.innerHTML = `
            <div class="pasarela-overlay" id="pasarela-overlay">
                <div class="pasarela-content">
                    <div class="pasarela-header">
                        <div class="pasarela-icon"><i class="fas fa-lock"></i></div>
                        <h3>Pago Seguro</h3>
                        <p>Selecciona tu método de pago</p>
                        <button class="pasarela-close" id="pasarela-close-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="metodos-grid">
                        <div class="metodo-opt" data-pago="Bancolombia" id="opt-bancolombia">
                            <div class="metodo-logo-wrap">
                                <img src="assets/images/bancolombia-logo.png" alt="Bancolombia" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                                <div class="metodo-fallback" style="display:none;background:#FFD100;color:#8B0000;">🏦</div>
                            </div>
                            <span>Bancolombia</span>
                            <div class="metodo-check"><i class="fas fa-check-circle"></i></div>
                        </div>
                        <div class="metodo-opt" data-pago="Nequi" id="opt-nequi">
                            <div class="metodo-logo-wrap">
                                <img src="assets/images/nequi-logo.png" alt="Nequi" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                                <div class="metodo-fallback" style="display:none;background:linear-gradient(135deg,#e91e8c,#c2185b);color:#fff;">💳</div>
                            </div>
                            <span>Nequi</span>
                            <div class="metodo-check"><i class="fas fa-check-circle"></i></div>
                        </div>
                        <div class="metodo-opt" data-pago="Daviplata" id="opt-daviplata">
                            <div class="metodo-logo-wrap">
                                <img src="assets/images/daviplata-logo.png" alt="Daviplata" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                                <div class="metodo-fallback" style="display:none;background:#E30613;color:#fff;">💸</div>
                            </div>
                            <span>Daviplata</span>
                            <div class="metodo-check"><i class="fas fa-check-circle"></i></div>
                        </div>
                    </div>
                    <div class="pasarela-nota">
                        <i class="fas fa-info-circle"></i>
                        Realiza la transferencia al número registrado y envía el comprobante.
                        El admin confirmará tu pago manualmente.
                    </div>
                    <button class="pasarela-btn-confirmar" id="confirmar-pago-btn" disabled>
                        <i class="fas fa-shield-alt"></i> Confirmar y Finalizar
                    </button>
                    <button class="pasarela-btn-cancelar" id="cancelar-pago-btn">Cancelar</button>
                </div>
            </div>
        `;

        // Estilos del modal
        const style = document.createElement('style');
        style.id = 'pasarela-styles';
        style.textContent = `
            #modal-pasarela {
                position: fixed; inset: 0; z-index: 9999;
                animation: pasaFadeIn .25s ease;
            }
            .pasarela-overlay {
                width: 100%; height: 100%;
                background: rgba(10,10,30,.65);
                backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                padding: 20px;
            }
            .pasarela-content {
                background: #fff;
                border-radius: 22px;
                padding: 36px 32px 28px;
                max-width: 420px; width: 100%;
                box-shadow: 0 24px 64px rgba(0,0,0,.28);
                position: relative;
                animation: pasaSlideUp .3s cubic-bezier(.34,1.56,.64,1);
            }
            .pasarela-header { text-align: center; margin-bottom: 26px; }
            .pasarela-icon {
                width: 56px; height: 56px; border-radius: 50%;
                background: linear-gradient(135deg,#007bff,#0040c8);
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 14px; font-size: 1.5rem; color: #fff;
            }
            .pasarela-header h3 { font-size: 1.35rem; font-weight: 800; color: #1a1a2e; margin-bottom: 4px; }
            .pasarela-header p { font-size: .88rem; color: #888; }
            .pasarela-close {
                position: absolute; top: 18px; right: 18px;
                background: #f0f0f0; border: none; border-radius: 50%;
                width: 32px; height: 32px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                font-size: .85rem; color: #666;
                transition: background .2s;
            }
            .pasarela-close:hover { background: #e0e0e0; }
            .metodos-grid {
                display: grid; grid-template-columns: repeat(3,1fr); gap: 14px;
                margin-bottom: 20px;
            }
            .metodo-opt {
                border: 2.5px solid #e8e8e8;
                border-radius: 16px;
                padding: 18px 10px 14px;
                cursor: pointer;
                text-align: center;
                transition: all .2s;
                position: relative;
                background: #fafafa;
            }
            .metodo-opt:hover { border-color: #007bff; background: #f0f6ff; transform: translateY(-2px); }
            .metodo-opt.selected {
                border-color: #007bff;
                background: #e8f0fe;
                box-shadow: 0 4px 16px rgba(0,123,255,.2);
            }
            .metodo-logo-wrap {
                width: 64px; height: 64px; border-radius: 14px;
                overflow: hidden; margin: 0 auto 10px;
            }
            .metodo-logo-wrap img { width: 100%; height: 100%; object-fit: cover; }
            .metodo-fallback {
                width: 100%; height: 100%;
                border-radius: 14px;
                align-items: center; justify-content: center;
                font-size: 2rem;
            }
            .metodo-opt span { font-size: .8rem; font-weight: 700; color: #333; display: block; }
            .metodo-check {
                position: absolute; top: 8px; right: 8px;
                color: #007bff; font-size: 1rem;
                opacity: 0; transition: opacity .2s;
            }
            .metodo-opt.selected .metodo-check { opacity: 1; }
            .pasarela-nota {
                background: #fffbe6; border: 1px solid #ffe566;
                border-radius: 10px; padding: 12px 14px;
                font-size: .8rem; color: #6b5300; line-height: 1.5;
                margin-bottom: 20px; display: flex; gap: 10px; align-items: flex-start;
            }
            .pasarela-nota i { margin-top: 2px; flex-shrink: 0; }
            .pasarela-btn-confirmar {
                width: 100%; padding: 15px;
                background: linear-gradient(135deg,#007bff,#0040c8);
                color: #fff; border: none; border-radius: 12px;
                font-size: 1rem; font-weight: 700; cursor: pointer;
                transition: all .2s; display: flex; align-items: center;
                justify-content: center; gap: 8px; margin-bottom: 10px;
            }
            .pasarela-btn-confirmar:not(:disabled):hover {
                background: linear-gradient(135deg,#0056d6,#003094);
                transform: translateY(-1px);
                box-shadow: 0 8px 20px rgba(0,123,255,.35);
            }
            .pasarela-btn-confirmar:disabled {
                background: #ccc; cursor: not-allowed; opacity: .7;
            }
            .pasarela-btn-cancelar {
                width: 100%; padding: 10px;
                background: none; border: none; color: #999;
                font-size: .88rem; cursor: pointer; border-radius: 8px;
                transition: color .2s;
            }
            .pasarela-btn-cancelar:hover { color: #555; }
            @keyframes pasaFadeIn { from { opacity:0; } to { opacity:1; } }
            @keyframes pasaSlideUp { from { transform: translateY(40px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        `;

        document.getElementById('pasarela-styles')?.remove();
        document.head.appendChild(style);
        document.body.appendChild(modal);

        let metodoSeleccionado = null;
        const btnConfirmar = modal.querySelector('#confirmar-pago-btn');
        const btnCancelar = modal.querySelector('#cancelar-pago-btn');
        const btnClose   = modal.querySelector('#pasarela-close-btn');

        // Selección de método
        modal.querySelectorAll('.metodo-opt').forEach(opt => {
            opt.addEventListener('click', () => {
                modal.querySelectorAll('.metodo-opt').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                metodoSeleccionado = opt.dataset.pago;
                btnConfirmar.disabled = false;
            });
        });

        const cerrar = (resultado) => {
            modal.style.animation = 'pasaFadeIn .2s ease reverse';
            setTimeout(() => { modal.remove(); resolve(resultado); }, 200);
        };

        btnConfirmar.addEventListener('click', () => {
            if (metodoSeleccionado) cerrar(metodoSeleccionado);
        });

        btnCancelar.addEventListener('click', () => cerrar(null));
        btnClose.addEventListener('click',   () => cerrar(null));

        // Cerrar al hacer clic fuera
        modal.querySelector('#pasarela-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) cerrar(null);
        });
    });
};


/**
 * Obtiene un pedido específico por ID
 * @param {number} pedidoId - ID del pedido
 * @returns {Promise<Object>} Datos del pedido
 */
export const obtenerPedido = async (pedidoId) => {
    try {
        const response = await fetch(`${BASE_URL}/pedidos/${pedidoId}`);

        if (!response.ok) {
            throw new Error(`Error al obtener pedido: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Error al obtener pedido:', error);
        throw error;
    }
};

/**
 * Obtiene los pedidos de un usuario específico
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} Lista de pedidos del usuario
 */
export const obtenerPedidosUsuario = async (usuarioId) => {
    try {
        const response = await fetch(`${BASE_URL}/pedidos?id_usuario=${usuarioId}`);

        if (!response.ok) {
            throw new Error(`Error al obtener pedidos: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Error al obtener pedidos del usuario:', error);
        return [];
    }
};

/**
 * Actualiza el estado de un pedido
 * @param {number} pedidoId - ID del pedido
 * @param {string} nuevoEstado - Nuevo estado ('procesando', 'enviado', 'entregado', 'cancelado')
 * @returns {Promise<Object>} Datos actualizados del pedido
 */
export const actualizarEstadoPedido = async (pedidoId, nuevoEstado) => {
    try {
        const response = await fetch(`${BASE_URL}/pedidos/${pedidoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        if (!response.ok) {
            throw new Error(`Error al actualizar pedido: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Error al actualizar estado del pedido:', error);
        throw error;
    }
};

/**
 * Valida los datos del cliente antes de crear el pedido
 * @param {Object} datosCliente - Datos a validar
 * @returns {Object} {valido: boolean, errores: Array}
 */
export const validarDatosCliente = (datosCliente) => {
    const errores = [];

    if (!datosCliente.nombre || datosCliente.nombre.trim() === '') {
        errores.push('El nombre es requerido');
    }

    if (!datosCliente.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datosCliente.email)) {
        errores.push('El email no es válido');
    }

    if (!datosCliente.telefono || datosCliente.telefono.trim() === '') {
        errores.push('El teléfono es requerido');
    }

    if (!datosCliente.direccion || datosCliente.direccion.trim() === '') {
        errores.push('La dirección es requerida');
    }

    return {
        valido: errores.length === 0,
        errores: errores
    };
};

/**
 * Abre un modal de confirmación de compra
 * @returns {Promise<Object>} Datos del cliente si confirma, null si cancela
 */
export const abrirModalConfirmacion = () => {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-confirmacion';
        modal.innerHTML = `
            <div class="modal-contenido">
                <h2>Completar tu compra</h2>
                <form id="formulario-cliente">
                    <div class="form-group">
                        <label for="nombre">Nombre completo *</label>
                        <input type="text" id="nombre" name="nombre" required>
                    </div>

                    <div class="form-group">
                        <label for="email">Email *</label>
                        <input type="email" id="email" name="email" required>
                    </div>

                    <div class="form-group">
                        <label for="telefono">Teléfono *</label>
                        <input type="tel" id="telefono" name="telefono" required>
                    </div>

                    <div class="form-group">
                        <label for="direccion">Dirección de entrega *</label>
                        <textarea id="direccion" name="direccion" rows="3" required></textarea>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-cancelar">Cancelar</button>
                        <button type="submit" class="btn-confirmar">Confirmar compra</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const form = modal.querySelector('#formulario-cliente');
        const btnCancelar = modal.querySelector('.btn-cancelar');

        btnCancelar.addEventListener('click', () => {
            modal.remove();
            resolve(null);
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const datosCliente = {
                nombre: form.nombre.value,
                email: form.email.value,
                telefono: form.telefono.value,
                direccion: form.direccion.value
            };

            const validacion = validarDatosCliente(datosCliente);

            if (!validacion.valido) {
                alert('Errores:\n' + validacion.errores.join('\n'));
                return;
            }

            modal.remove();
            resolve(datosCliente);
        });

        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    });
};
