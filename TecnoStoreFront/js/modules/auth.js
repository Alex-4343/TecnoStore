/**
 * Módulo de Autenticación
 * Maneja sesión de usuario en localStorage
 */

const BASE_URL = 'https://tecnostore-3opr.onrender.com/api';
const SESSION_KEY = 'tecnostore_usuario';

// ─── Sesión ───────────────────────────────────────────────

export const getUsuario = () => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
};

export const estaLogueado = () => getUsuario() !== null;

const guardarSesion = (usuario) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
};

export const cerrarSesion = () => {
    localStorage.removeItem(SESSION_KEY);
};

// ─── API calls ────────────────────────────────────────────

export const login = async (correo, contrasena) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
    }

    guardarSesion(data);
    return data;
};

export const register = async (nombre, correo, contrasena, telefono, direccion) => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, correo, contrasena, telefono, direccion })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Error al registrarse');
    }

    guardarSesion(data);
    return data;
};

// ─── UI del Header ────────────────────────────────────────

/**
 * Actualiza el ícono de usuario en el header según la sesión activa
 */
export const actualizarHeaderAuth = () => {
    const userLink = document.querySelector('.user-icons a[title="Mi Cuenta"]');
    if (!userLink) return;

    const usuario = getUsuario();

    if (usuario) {
        // Mostrar nombre y opción de cerrar sesión
        userLink.innerHTML = `<i class="far fa-user"></i>`;
        userLink.title = usuario.nombre;
        userLink.setAttribute('href', '#');

        // Crear dropdown de usuario si no existe
        if (!document.getElementById('user-dropdown')) {
            const dropdown = document.createElement('div');
            dropdown.id = 'user-dropdown';
            dropdown.className = 'user-dropdown-menu';
            
            let adminLink = '';
            if (usuario.rol === 'administrador') {
                adminLink = `
                <a href="admin.html" class="user-dropdown-item">
                    <i class="fas fa-cog"></i> Panel Administrador
                </a>
                `;
            }

            dropdown.innerHTML = `
                <div class="user-dropdown-name">
                    <i class="fas fa-user-circle"></i>
                    <span>${usuario.nombre}</span>
                </div>
                <hr class="user-dropdown-divider">
                ${adminLink}
                <a href="mis-pedidos.html" class="user-dropdown-item">
                    <i class="fas fa-box-open"></i> Mis Pedidos
                </a>
                <button id="btn-logout" class="user-dropdown-item logout">
                    <i class="fas fa-sign-out-alt"></i> Cerrar sesión
                </button>
            `;
            userLink.parentElement.appendChild(dropdown);

            // Toggle dropdown al hacer click en el ícono de usuario
            userLink.addEventListener('click', (e) => {
                e.preventDefault();
                dropdown.classList.toggle('active');
            });

            // Cerrar al hacer click fuera
            document.addEventListener('click', (e) => {
                if (!userLink.parentElement.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });

            // Cerrar sesión
            document.getElementById('btn-logout').addEventListener('click', () => {
                cerrarSesion();
                window.location.reload();
            });
        }
    } else {
        // Usuario no logueado → ir a login
        userLink.innerHTML = `<i class="far fa-user"></i>`;
        userLink.title = 'Iniciar sesión';
        userLink.setAttribute('href', 'login.html');
    }
};
