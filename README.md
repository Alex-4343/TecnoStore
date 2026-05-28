# 💻 TecnoStore - Sistema de Gestión E-commerce y Control de Inventarios (V4.0)

![Estado: Desplegado]

**TecnoStore** es una plataforma integral de comercio electrónico diseñada para la venta de equipos tecnológicos y servicios técnicos. Más allá de un simple frontend de ventas, este proyecto implementa un backend robusto con control de inventarios basado en el método **FIFO (Primeras Entradas, Primeras Salidas)**, gestión de proveedores y análisis de rentabilidad real.

## 🚀 Características Principales

### 🛒 Experiencia de Cliente (B2C)
* **Catálogo Dinámico:** Navegación por categorías (Portátiles, Periféricos, Componentes).
* **Carrito de Compras Seguro:** Validación de sesiones y gestión de cantidades.
* **Pasarela de Pagos (Simulada):** Selección de métodos de pago locales (Nequi, Bancolombia, Daviplata) con flujo de estados (`Pendiente` -> `Pagado`).
* **Seguimiento de Pedidos:** Panel de cliente para visualizar el estado del envío.

### ⚙️ Panel Administrativo (B2B / ERP)
* **Gestión de Inventario (Lotes):** Implementación de la metodología FIFO. El sistema registra cada entrada de mercancía como un lote independiente, manteniendo el costo de adquisición histórico.
* **Cálculo de Utilidad Real:** Gracias al sistema FIFO, el dashboard calcula el margen de ganancia exacto basado en el costo específico del lote vendido (no en un costo promedio).
* **Gestión de Proveedores:** Trazabilidad completa de a quién se le compró cada producto.
* **Dashboard Financiero:** Métricas clave (KPIs) en tiempo real, incluyendo inversión total en bodega y rentabilidad bruta ($23\%$).

---

## 🛠️ Tecnologías y Arquitectura

El proyecto sigue una arquitectura **Cliente-Servidor**, renderizando vistas desde el backend e interactuando con una base de datos relacional optimizada.

**Frontend:**
* HTML5 / CSS (Diseño responsivo y personalizado).
* JavaScript (Vanilla) para interactividad y manipulación del DOM.

**Backend:**
* **Node.js** con **Express.js**: Enrutamiento y lógica de negocio.
* Autenticación y gestión de sesiones.

**Base de Datos:**
* **MySQL**: Base de datos relacional estructurada 
* Diseño altamente normalizado (`Productos`, `Proveedores`, `Lotes_Inventario`, `Movimientos`, `Pedidos`).

**Despliegue (DevOps):**
* **Railway:** Plataforma de hosting para el servidor Node.js y el motor de base de datos MySQL.

---

## 🧠 Lógica de Negocio Destacada: El Sistema FIFO

El mayor desafío técnico de TecnoStore  es su algoritmo de venta FIFO. Cuando un cliente realiza un pedido, el sistema en Node.js realiza el siguiente proceso:
1. Consulta los lotes disponibles del producto ordenados por fecha de entrada (los más antiguos primero).
2. Descuenta el stock del lote más antiguo.
3. Si el lote no cubre la cantidad solicitada, agota el lote y pasa al siguiente.
4. Registra en el detalle del pedido el `precio_compra_lote` exacto, permitiendo una contabilidad perfecta sin pérdida de datos históricos frente a fluctuaciones de precios.

*Autor* Alex-4343
Rol: Fullstack Developer & Database Architect.
