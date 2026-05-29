/**
 * Módulo Admin - Panel Administrador de TecnoStore
 * Gestiona Dashboard, Productos, Kardex y Reportes
 */

const API = {
  get: async (endpoint) => {
    const res = await fetch(
      `https://tecnostore-3opr.onrender.com/api${endpoint}`,
    );
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  },
  post: async (endpoint, data) => {
    const res = await fetch(
      `https://tecnostore-3opr.onrender.com/api${endpoint}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  },
  put: async (endpoint, data) => {
    const res = await fetch(
      `https://tecnostore-3opr.onrender.com/api${endpoint}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  },
  patch: async (endpoint, data) => {
    const res = await fetch(
      `https://tecnostore-3opr.onrender.com/api${endpoint}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  },
  delete: async (endpoint) => {
    const res = await fetch(
      `https://tecnostore-3opr.onrender.com/api${endpoint}`,
      {
        method: "DELETE",
      },
    );
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  },
};

const Auth = {
  logout: () => {
    localStorage.removeItem("tecnostore_usuario");
  },
};

class AdminModule {
  constructor() {
    this.currentProductId = null;
    this.currentProveedorId = null;
    this.categorias = [];
    this.proveedores = [];
    this.init();
  }

  // ===== INICIALIZACIÓN =====

  init() {
    this.setupEventListeners();
    this.loadDashboard();
    this.loadCategorias();
    this.loadProveedoresList();
  }

  setupEventListeners() {
    // Navegación
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.switchSection(e.target.dataset.section),
      );
    });

    // Productos
    document
      .getElementById("btn-new-product")
      ?.addEventListener("click", () => this.openProductModal());
    document
      .getElementById("product-form")
      ?.addEventListener("submit", (e) => this.submitProductForm(e));

    // Proveedores
    document
      .getElementById("btn-new-proveedor")
      ?.addEventListener("click", () => this.openProveedorModal());
    document
      .getElementById("proveedor-form")
      ?.addEventListener("submit", (e) => this.submitProveedorForm(e));

    // Logout
    document
      .getElementById("logout-btn")
      ?.addEventListener("click", () => this.logout());

    // Reportes
    // Ventas Consolidadas
    document.getElementById("sales-period")?.addEventListener("change", (e) => {
      const container = document.getElementById("sales-consolidated-container");
      if (e.target.value === "especifico") {
        document.getElementById("sales-date-container").style.display = "flex";
      } else {
        document.getElementById("sales-date-container").style.display = "none";
      }
      if (container && !container.classList.contains("hidden")) {
        this.loadSalesConsolidatedReport(false);
      }
    });

    // Producto Más Vendido
    document
      .getElementById("best-seller-period")
      ?.addEventListener("change", (e) => {
        const container = document.getElementById("best-sellers-container");
        if (e.target.value === "especifico") {
          document.getElementById("best-seller-date-container").style.display =
            "flex";
        } else {
          document.getElementById("best-seller-date-container").style.display =
            "none";
        }
        if (container && !container.classList.contains("hidden")) {
          this.loadBestSellersReport(false);
        }
      });

    // Información de Lotes Compra
    document
      .getElementById("lotes-info-period")
      ?.addEventListener("change", (e) => {
        const container = document.getElementById("lotes-info-container");
        if (e.target.value === "especifico") {
          document.getElementById("lotes-info-date-container").style.display =
            "flex";
        } else {
          document.getElementById("lotes-info-date-container").style.display =
            "none";
        }
        if (container && !container.classList.contains("hidden")) {
          this.loadLotesInfoReport(false);
        }
      });

    // Cliente Estrella (Top Buyer)
    document
      .getElementById("top-buyers-period")
      ?.addEventListener("change", (e) => {
        const container = document.getElementById("top-buyers-container");
        if (e.target.value === "especifico") {
          document.getElementById("top-buyers-date-container").style.display =
            "flex";
        } else {
          document.getElementById("top-buyers-date-container").style.display =
            "none";
        }
        if (container && !container.classList.contains("hidden")) {
          this.loadTopBuyersReport(false);
        }
      });

    // Desempeño de Proveedores
    document
      .getElementById("providers-period")
      ?.addEventListener("change", (e) => {
        const container = document.getElementById(
          "providers-performance-container",
        );
        if (e.target.value === "especifico") {
          document.getElementById("providers-date-container").style.display =
            "flex";
        } else {
          document.getElementById("providers-date-container").style.display =
            "none";
        }
        if (container && !container.classList.contains("hidden")) {
          this.loadProvidersPerformanceReport(false);
        }
      });

    // Cliente con mayor compra por producto
    document
      .getElementById("top-buyers-prod-period")
      ?.addEventListener("change", (e) => {
        const container = document.getElementById(
          "top-buyers-per-product-container",
        );
        if (e.target.value === "especifico") {
          document.getElementById(
            "top-buyers-prod-date-container",
          ).style.display = "flex";
        } else {
          document.getElementById(
            "top-buyers-prod-date-container",
          ).style.display = "none";
        }
        if (container && !container.classList.contains("hidden")) {
          this.loadTopBuyersPerProductReport(false);
        }
      });
  }

  // ===== NAVEGACIÓN =====

  switchSection(section) {
    // Cambiar vista activa
    document
      .querySelectorAll(".admin-section")
      .forEach((s) => s.classList.remove("active"));
    document.querySelector(`#${section}`)?.classList.add("active");

    // Cambiar botón activo
    document
      .querySelectorAll(".nav-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelector(`[data-section="${section}"]`)
      ?.classList.add("active");

    // Cargar datos según sección
    if (section === "productos") this.loadProductos();
    else if (section === "proveedores") this.loadProveedores();
    else if (section === "kardex") this.loadKardex();
    else if (section === "pedidos") this.loadPedidos();
    else if (section === "lotes") this.loadLotes();
  }

  // ===== DASHBOARD =====

  async loadDashboard() {
    try {
      // Cargar estadísticas
      const stats = await API.get("/admin/stats");
      this.renderStats(stats);

      // Cargar resumen de ventas
      const sales = await API.get("/admin/sales-resumen");
      this.renderSalesResumen(sales);

      // Cargar top productos
      const topProducts = await API.get("/admin/top-products");
      this.renderTopProducts(topProducts);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
      this.showNotification("Error al cargar el dashboard", "error");
    }
  }

  renderStats(stats) {
    document.getElementById("inversion-total").textContent = this.formatMoney(
      stats.inversion_total || 0,
    );
    document.getElementById("venta-potencial").textContent = this.formatMoney(
      stats.venta_potencial || 0,
    );
    document.getElementById("ganancia-proyectada").textContent =
      this.formatMoney(stats.ganancia_proyectada || 0);
    document.getElementById("total-productos").textContent =
      stats.total_productos || 0;
  }

  renderSalesResumen(sales) {
    document.getElementById("total-pedidos").textContent =
      sales.total_pedidos || 0;
    document.getElementById("total-unidades").textContent =
      sales.total_unidades || 0;
    document.getElementById("total-vendido").textContent = this.formatMoney(
      sales.total_vendido || 0,
    );
    document.getElementById("ganancia-real").textContent = this.formatMoney(
      sales.ganancia_real || 0,
    );
  }

  renderTopProducts(products) {
    const container = document.getElementById("top-products-container");
    container.innerHTML = "";

    if (products.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #999;">No hay datos disponibles</p>';
      return;
    }

    // Mapa de imágenes locales (igual que en cart.js y mis-pedidos)
    const localImages = {
      "Portátil Lenovo V14": "assets/images/lenovo-v14.jpg",
      "Portátil HP Victus Gaming": "assets/images/hp-victus.jpg",
      "PC Gamer Armado": "assets/images/pc-gamer.jpg",
      "Mouse Logitech G203": "assets/images/mouse-logitech.jpg",
      "Teclado Mecánico Redragon Kumara": "assets/images/teclado-redragon.jpg",
    };

    // SVG placeholder inline (nunca falla)
    const placeholderSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23f0f2f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23bbb'%3E📦%3C/text%3E%3C/svg%3E`;

    const resolveImage = (product) => {
      // 1. Intentar imagen local por nombre exacto
      if (localImages[product.nombre]) return localImages[product.nombre];
      // 2. Usar imagen_url de la BD si existe y no está vacía
      if (product.imagen_url && product.imagen_url.trim() !== "") {
        const url = product.imagen_url.trim();
        // Quitar slash inicial si lo tiene (para que sea relativa al panel)
        return url.startsWith("/") ? url.slice(1) : url;
      }
      // 3. Fallback al placeholder
      return placeholderSvg;
    };

    const html = products
      .map((product, index) => {
        const imgSrc = resolveImage(product);
        // Fallback en cascada: local por nombre → placeholder
        const localFallback = localImages[product.nombre] || placeholderSvg;

        return `
            <div class="product-item">
                <img src="${imgSrc}"
                     alt="${product.nombre}"
                     class="product-image"
                     onerror="this.onerror=null;this.src='${localFallback}';">
                <div class="product-info">
                    <h4>${index + 1}. ${product.nombre}</h4>
                    <p>${product.total_vendido} unidades vendidas</p>
                </div>
                <div class="product-stats">
                    <div class="stat">
                        <div class="stat-label">Ingreso</div>
                        <div class="stat-value">${this.formatMoney(product.ingreso_total)}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Stock</div>
                        <div class="stat-value">${product.stock_actual}</div>
                    </div>
                </div>
            </div>
        `;
      })
      .join("");

    container.innerHTML = html;
  }

  // ===== GESTIÓN DE PRODUCTOS =====

  async loadProveedoresList() {
    try {
      this.proveedores = await API.get("/proveedores");
      this.updateProveedorSelects();
    } catch (error) {
      console.error("Error cargando proveedores:", error);
    }
  }

  updateProveedorSelects() {
    const select = document.getElementById("proveedor-select");
    if (!select) return;

    select.innerHTML =
      '<option value="">Seleccionar proveedor</option>' +
      this.proveedores
        .map((p) => `<option value="${p.id}">${p.nombre}</option>`)
        .join("");
  }

  async loadCategorias() {
    try {
      this.categorias = await API.get("/categorias");
      this.updateCategoriaSelects();
    } catch (error) {
      console.error("Error cargando categorías:", error);
    }
  }

  updateCategoriaSelects() {
    const select = document.getElementById("categoria-select");
    if (!select) return;

    select.innerHTML =
      '<option value="">Seleccionar categoría</option>' +
      this.categorias
        .map((c) => `<option value="${c.id}">${c.nombre}</option>`)
        .join("");
  }

  async loadProductos() {
    try {
      const productos = await API.get("/admin/products");
      this.renderProductos(productos);

      // Actualizar filtro de kardex
      this.updateKardexProductFilter(productos);
    } catch (error) {
      console.error("Error cargando productos:", error);
      this.showNotification("Error al cargar productos", "error");
    }
  }

  renderProductos(productos) {
    const tbody = document.getElementById("productos-tbody");
    tbody.innerHTML = "";

    if (productos.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align: center;">No hay productos</td></tr>';
      return;
    }

    const html = productos
      .map(
        (p) => `
            <tr>
                <td>${p.id}</td>
                <td>${p.nombre}</td>
                <td>${p.categoria}<br><small style="color: #7f8c8d;">${p.proveedor || ""}</small></td>
                <td>${this.formatMoney(p.precio_compra)}</td>
                <td>${this.formatMoney(p.precio_venta)}</td>
                <td>
                    <span style="color: ${Number(p.porcentaje_ganancia) > 30 ? "#27ae60" : Number(p.porcentaje_ganancia) > 0 ? "#f39c12" : "#e74c3c"}">
                        ${Number(p.porcentaje_ganancia).toFixed(1)}%
                    </span>
                </td>
                <td>
                    <strong style="color: ${p.stock < 10 ? "#e74c3c" : "#27ae60"}">
                        ${p.stock}
                    </strong>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-edit" onclick="admin.openProductModal(${p.id})">✏️</button>
                        <button class="btn-stock" onclick="admin.openRestockModal(${p.id}, '${p.nombre}', ${p.stock})">📦</button>
                        <button class="btn-delete" onclick="admin.deleteProduct(${p.id})">🗑️</button>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");

    tbody.innerHTML = html;
  }

  openProductModal(productId = null) {
    const modal = document.getElementById("product-modal");
    const form = document.getElementById("product-form");
    const title = document.getElementById("modal-title");

    form.reset();
    this.currentProductId = productId;

    if (productId) {
      title.textContent = "Editar Producto";
      // Aquí deberías cargar los datos del producto
      // Por ahora, dejamos que el usuario llene el formulario
    } else {
      title.textContent = "Nuevo Producto";
    }

    modal.classList.remove("hidden");
  }

  openRestockModal(productId, productName, currentStock) {
    const modal = document.getElementById("restock-modal");
    document.getElementById("restock-product-id").value = productId;
    document.getElementById("restock-product-name").value = productName;
    document.getElementById("restock-current").value = currentStock;
    document.getElementById("restock-form").reset();
    modal.classList.remove("hidden");
  }

  async submitProductForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // Convertir campos numéricos
    // Ya no se usan precio_compra ni precio_venta en creación de producto
    if (data.precio_compra) delete data.precio_compra;
    if (data.precio_venta) delete data.precio_venta;
    // No enviar campo stock, ya no es necesario
    if (data.stock) delete data.stock;
    if (data.id_categoria) data.id_categoria = parseInt(data.id_categoria);
    if (data.id_proveedor) data.id_proveedor = parseInt(data.id_proveedor);

    try {
      if (this.currentProductId) {
        await API.put(`/admin/products/${this.currentProductId}`, data);
        this.showNotification("Producto actualizado exitosamente", "success");
      } else {
        await API.post("/admin/products", data);
        this.showNotification("Producto creado exitosamente", "success");
      }

      document.getElementById("product-modal").classList.add("hidden");
      this.loadProductos();
    } catch (error) {
      console.error("Error guardando producto:", error);
      this.showNotification("Error al guardar producto", "error");
    }
  }

  async deleteProduct(productId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) return;

    try {
      await API.delete(`/admin/products/${productId}`);
      this.showNotification("Producto eliminado exitosamente", "success");
      this.loadProductos();
    } catch (error) {
      console.error("Error eliminando producto:", error);
      this.showNotification("Error al eliminar producto", "error");
    }
  }

  // Manejar formulario de reabastecer stock
  async handleRestockSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById("restock-product-id").value;
    const cantidad = document.querySelector(
      '#restock-form input[name="cantidad"]',
    ).value;
    const precioCompra = document.querySelector(
      '#restock-form input[name="precio_compra_lote"]',
    ).value;
    const descripcion =
      document.querySelector('#restock-form input[name="descripcion"]').value ||
      "";

    // Validaciones básicas en cliente
    if (!precioCompra || Number(precioCompra) <= 0) {
      this.showNotification("Ingrese un precio de compra válido", "error");
      return;
    }

    try {
      await API.patch(`/admin/products/${productId}/stock`, {
        cantidad: parseInt(cantidad),
        tipo: "entrada",
        precio_compra_lote: Number(precioCompra),
        descripcion: descripcion,
      });

      this.showNotification("Stock actualizado exitosamente", "success");
      document.getElementById("restock-modal").classList.add("hidden");
      this.loadProductos();
      this.loadKardex();
    } catch (error) {
      console.error("Error actualizando stock:", error);
      // Mostrar mensaje devuelto por backend cuando exista
      if (error && error.message) {
        this.showNotification(
          `Error al actualizar stock: ${error.message}`,
          "error",
        );
      } else {
        this.showNotification("Error al actualizar stock", "error");
      }
    }
  }

  // ===== GESTIÓN DE PROVEEDORES =====

  async loadProveedores() {
    try {
      const proveedores = await API.get("/proveedores");
      this.renderProveedores(proveedores);
    } catch (error) {
      console.error("Error cargando proveedores:", error);
      this.showNotification("Error al cargar proveedores", "error");
    }
  }

  renderProveedores(proveedores) {
    const tbody = document.getElementById("proveedores-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (proveedores.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center;">No hay proveedores</td></tr>';
      return;
    }

    const html = proveedores
      .map(
        (p) => `
            <tr>
                <td>${p.id}</td>
                <td>${p.nombre}</td>
                <td>${p.contacto || "-"}</td>
                <td>${p.telefono || "-"}</td>
                <td>${p.correo || "-"}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-edit" onclick="admin.openProveedorModal(${p.id})">✏️</button>
                        <button class="btn-delete" onclick="admin.deleteProveedor(${p.id})">🗑️</button>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");

    tbody.innerHTML = html;
  }

  openProveedorModal(proveedorId = null) {
    const modal = document.getElementById("proveedor-modal");
    const form = document.getElementById("proveedor-form");
    const title = document.getElementById("modal-proveedor-title");

    form.reset();
    this.currentProveedorId = proveedorId;

    if (proveedorId) {
      title.textContent = "Editar Proveedor";
      const proveedor = this.proveedores.find((p) => p.id === proveedorId);
      if (proveedor) {
        form.nombre.value = proveedor.nombre || "";
        form.contacto.value = proveedor.contacto || "";
        form.telefono.value = proveedor.telefono || "";
        form.correo.value = proveedor.correo || "";
      }
    } else {
      title.textContent = "Nuevo Proveedor";
    }

    modal.classList.remove("hidden");
  }

  async submitProveedorForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      if (this.currentProveedorId) {
        await API.put(`/proveedores/${this.currentProveedorId}`, data);
        this.showNotification("Proveedor actualizado", "success");
      } else {
        await API.post("/proveedores", data);
        this.showNotification("Proveedor creado", "success");
      }

      document.getElementById("proveedor-modal").classList.add("hidden");
      this.loadProveedores();
      this.loadProveedoresList(); // Actualizar selects
    } catch (error) {
      console.error("Error guardando proveedor:", error);
      this.showNotification("Error al guardar proveedor", "error");
    }
  }

  async deleteProveedor(id) {
    if (!confirm("¿Seguro que deseas eliminar este proveedor?")) return;
    try {
      await API.delete(`/proveedores/${id}`);
      this.showNotification("Proveedor eliminado", "success");
      this.loadProveedores();
      this.loadProveedoresList();
    } catch (error) {
      console.error("Error eliminando proveedor:", error);
      this.showNotification("Error al eliminar proveedor", "error");
    }
  }

  // ===== GESTIÓN DE PEDIDOS =====

  async loadPedidos() {
    try {
      const filtro =
        document.getElementById("pedidos-estado-filter")?.value || "";
      let endpoint = "/pedidos";
      if (filtro) endpoint += `?estado=${filtro}`;
      const pedidos = await API.get(endpoint);
      // Filtrado en cliente si el backend no soporta query param
      const filtrados = filtro
        ? pedidos.filter(
            (p) => (p.estado_pedido || "").toLowerCase() === filtro,
          )
        : pedidos;
      this.renderPedidosAdmin(filtrados);
    } catch (error) {
      console.error("Error cargando pedidos:", error);
      this.showNotification("Error al cargar pedidos", "error");
    }
  }

  renderPedidosAdmin(pedidos) {
    const tbody = document.getElementById("pedidos-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (pedidos.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:#999">No hay pedidos con ese estado</td></tr>';
      return;
    }

    const estadoColors = {
      pendiente: { bg: "#fff8e1", color: "#b78a00", icon: "⏳" },
      pagado: { bg: "#e8f9ee", color: "#1a8a3f", icon: "✅" },
      enviado: { bg: "#e8f4ff", color: "#005a9e", icon: "🚚" },
    };

    const html = pedidos
      .map((p) => {
        const est = (p.estado_pedido || "pendiente").toLowerCase();
        const estilo = estadoColors[est] || {
          bg: "#f0f0f0",
          color: "#666",
          icon: "●",
        };
        const fechaRaw = p.fecha_pedido || p.fecha;
        const fecha = fechaRaw
          ? new Date(fechaRaw).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "-";
        const nombreCliente =
          p.nombre_usuario || p.usuario_nombre || p.id_usuario || "-";
        const btnConfirmar =
          est === "pendiente"
            ? `<button class="btn-confirmar-pago" onclick="admin.confirmarPago(${p.id})" title="Confirmar pago">
                       <span>✔</span> Confirmar Pago
                   </button>`
            : `<span style="color:#bbb;font-size:.8rem">Confirmado</span>`;

        const btnVerDetalle = `<button class="btn-info" onclick="admin.verDetallePedido(${p.id})" title="Ver detalle" style="background:#17a2b8;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;margin-right:5px;font-size:0.8rem;">👁 Ver detalles</button>`;

        return `
                <tr>
                    <td><strong>#${p.id}</strong></td>
                    <td>${nombreCliente}</td>
                    <td>
                        <span style="font-size:.82rem;font-weight:600">
                            ${p.metodo_pago || "-"}
                        </span>
                    </td>
                    <td><strong>${this.formatMoney(p.total)}</strong></td>
                    <td style="font-size:.82rem;color:#888">${fecha}</td>
                    <td>
                        <span style="background:${estilo.bg};color:${estilo.color};padding:4px 10px;border-radius:20px;font-size:.78rem;font-weight:700">
                            ${estilo.icon} ${p.estado_pedido || "pendiente"}
                        </span>
                    </td>
                    <td><div style="display:flex;align-items:center;">${btnVerDetalle}${btnConfirmar}</div></td>
                </tr>
            `;
      })
      .join("");

    tbody.innerHTML = html;
  }

  async confirmarPago(pedidoId) {
    if (
      !confirm(
        `¿Confirmar el pago del pedido #${pedidoId}? El cliente verá su pedido como pagado.`,
      )
    )
      return;
    try {
      await API.put(`/pedidos/confirmar-pago/${pedidoId}`, {});
      this.showNotification(
        `✅ Pago del pedido #${pedidoId} confirmado`,
        "success",
      );
      this.loadPedidos();
    } catch (error) {
      console.error("Error confirmando pago:", error);
      this.showNotification("Error al confirmar el pago", "error");
    }
  }

  async verDetallePedido(pedidoId) {
    try {
      const pedido = await API.get(`/pedidos/${pedidoId}`);

      const modal = document.getElementById("pedido-detalle-modal");
      const title = document.getElementById("modal-pedido-title");
      const body = document.getElementById("pedido-detalle-body");

      title.textContent = `Detalles del Pedido #${pedido.id}`;

      if (!pedido.detalles || pedido.detalles.length === 0) {
        body.innerHTML = "<p>No hay detalles para este pedido.</p>";
      } else {
        const detallesHtml = pedido.detalles
          .map((d) => {
            const imagen =
              d.imagen_url && d.imagen_url.trim() !== ""
                ? d.imagen_url.startsWith("/")
                  ? d.imagen_url.slice(1)
                  : d.imagen_url
                : "assets/images/lenovo-v14.jpg";
            return `
                    <div style="display: flex; align-items: center; border-bottom: 1px solid #eee; padding: 10px 0;">
                        <img src="${imagen}" alt="${d.producto_nombre}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 15px;" onerror="this.src='assets/images/lenovo-v14.jpg'">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0; font-size: 0.95rem;">${d.producto_nombre}</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #555;">Cantidad: <strong>${d.cantidad}</strong></p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; font-size: 0.9rem; color: #007bff; font-weight: bold;">${this.formatMoney(d.precio_unitario * d.cantidad)}</p>
                        </div>
                    </div>`;
          })
          .join("");

        body.innerHTML = `
                    <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                        <p style="margin: 0 0 5px 0;"><strong>Cliente:</strong> ${pedido.usuario_nombre || "-"}</p>
                        <p style="margin: 0 0 5px 0;"><strong>Correo:</strong> ${pedido.usuario_correo || "-"}</p>
                        <p style="margin: 0 0 5px 0;"><strong>Método de pago:</strong> ${pedido.metodo_pago || "-"}</p>
                        <p style="margin: 0; font-size: 1.1rem;"><strong>Total:</strong> <span style="color:#28a745;">${this.formatMoney(pedido.total)}</span></p>
                    </div>
                    <div>
                        <h4 style="margin-bottom: 10px; border-bottom: 2px solid #007bff; display: inline-block; padding-bottom: 3px;">Productos</h4>
                        ${detallesHtml}
                    </div>
                `;
      }

      modal.classList.remove("hidden");
    } catch (error) {
      console.error("Error cargando detalles del pedido:", error);
      this.showNotification("Error al cargar los detalles del pedido", "error");
    }
  }

  // ===== LOTES FIFO =====

  async loadLotes() {
    try {
      const lotes = await API.get("/admin/lotes");
      this.renderLotes(lotes);
    } catch (error) {
      console.error("Error cargando lotes:", error);
      this.showNotification("Error al cargar lotes", "error");
    }
  }

  renderLotes(lotes) {
    const tbody = document.getElementById("lotes-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (lotes.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="9" style="text-align: center;">No hay lotes activos</td></tr>';
      return;
    }

    const html = lotes
      .map((l) => {
        const fecha = new Date(l.fecha_entrada).toLocaleString("es-CO");
        const porAgotar = l.cantidad_disponible <= 5;
        const badgeClass = porAgotar
          ? "badge badge-danger"
          : "badge badge-success";
        const badgeText = porAgotar ? "Por Agotar" : "Disponible";

        return `
                <tr>
                    <td><strong>#${l.id}</strong></td>
                    <td>${l.producto_nombre}</td>
                    <td>${l.proveedor_nombre || "-"}</td>
                    <td>${l.cantidad_inicial}</td>
                    <td><strong style="color: ${porAgotar ? "#c0392b" : "#27ae60"};">${l.cantidad_disponible}</strong></td>
                    <td>${this.formatMoney(l.precio_compra_lote)}</td>
                    <td>${this.formatMoney(l.valor_lote)}</td>
                    <td style="font-size: 0.85rem; color: #666;">${fecha}</td>
                    <td><span class="${badgeClass}">${badgeText}</span></td>
                </tr>
            `;
      })
      .join("");

    tbody.innerHTML = html;
  }

  // ===== KARDEX =====

  async loadKardex() {
    try {
      const kardex = await API.get("/admin/kardex");
      this.renderKardex(kardex);
    } catch (error) {
      console.error("Error cargando kardex:", error);
      this.showNotification("Error al cargar kardex", "error");
    }
  }

  renderKardex(kardex) {
    const tbody = document.getElementById("kardex-tbody");
    tbody.innerHTML = "";

    if (kardex.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center;">No hay movimientos</td></tr>';
      return;
    }

    const html = kardex
      .map(
        (k) => `
            <tr>
                <td>${new Date(k.fecha_movimiento).toLocaleDateString("es-ES")}</td>
                <td>${k.producto_nombre}</td>
                <td>
                    <span style="background: ${k.tipo_movimiento === "entrada" ? "#d4edda" : "#f8d7da"}; 
                                 color: ${k.tipo_movimiento === "entrada" ? "#155724" : "#721c24"};
                                 padding: 0.25rem 0.5rem; border-radius: 4px;">
                        ${k.tipo_movimiento === "entrada" ? "📥 Entrada" : "📤 Salida"}
                    </span>
                </td>
                <td>${k.cantidad}</td>
                <td>${k.descripcion || "-"}</td>
            </tr>
        `,
      )
      .join("");

    tbody.innerHTML = html;
  }

  updateKardexProductFilter(productos) {
    const select = document.getElementById("kardex-product-filter");
    select.innerHTML =
      '<option value="">📦 Todos los productos</option>' +
      productos
        .map((p) => `<option value="${p.id}">${p.nombre}</option>`)
        .join("");

    select.addEventListener("change", async (e) => {
      const productId = e.target.value;
      try {
        const kardex = productId
          ? await API.get(`/admin/kardex?id_producto=${productId}`)
          : await API.get("/admin/kardex");
        this.renderKardex(kardex);
      } catch (error) {
        console.error("Error filtrando kardex:", error);
      }
    });
  }

  // ===== REPORTES =====

  async loadLowStockReport() {
    try {
      const container = document.getElementById("low-stock-container");
      container.classList.toggle("hidden");

      if (container.classList.contains("hidden")) return;

      const data = await API.get("/admin/reports/low-stock?umbral=10");
      this.renderLowStockReport(data, container);
    } catch (error) {
      console.error("Error cargando reporte de bajo stock:", error);
      this.showNotification("Error al cargar reporte", "error");
    }
  }

  renderLowStockReport(products, container) {
    if (products.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #27ae60;">✅ Todos los productos tienen stock adecuado</p>';
      return;
    }

    const html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Stock</th>
                        <th>Precio Compra</th>
                        <th>Precio Venta</th>
                    </tr>
                </thead>
                <tbody>
                    ${products
                      .map(
                        (p) => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td><strong style="color: #e74c3c;">${p.stock}</strong></td>
                            <td>${this.formatMoney(p.precio_compra)}</td>
                            <td>${this.formatMoney(p.precio_venta)}</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;

    container.innerHTML = html;
  }

  async loadProfitabilityReport() {
    try {
      const container = document.getElementById("profitability-container");
      container.classList.toggle("hidden");

      if (container.classList.contains("hidden")) return;

      const data = await API.get("/admin/reports/profitability");
      this.renderProfitabilityReport(data, container);
    } catch (error) {
      console.error("Error cargando reporte de rentabilidad:", error);
      this.showNotification("Error al cargar reporte", "error");
    }
  }

  renderProfitabilityReport(products, container) {
    const html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Margen Unitario</th>
                        <th>% Margen</th>
                        <th>Ganancia Proyectada</th>
                        <th>Vendidas</th>
                    </tr>
                </thead>
                <tbody>
                    ${products
                      .map(
                        (p) => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${this.formatMoney(p.margen_unitario)}</td>
                            <td><span style="color: ${Number(p.porcentaje_margen) > 30 ? "#27ae60" : "#f39c12"}">${Number(p.porcentaje_margen).toFixed(1)}%</span></td>
                            <td><strong>${this.formatMoney(p.ganancia_proyectada)}</strong></td>
                            <td>${p.unidades_vendidas}</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;

    container.innerHTML = html;
  }

  async loadKardexResumen() {
    try {
      const container = document.getElementById("kardex-resumen-container");
      container.classList.toggle("hidden");

      if (container.classList.contains("hidden")) return;

      const data = await API.get("/admin/kardex-resumen");
      this.renderKardexResumen(data, container);
    } catch (error) {
      console.error("Error cargando resumen de kardex:", error);
      this.showNotification("Error al cargar reporte", "error");
    }
  }

  renderKardexResumen(data, container) {
    const html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Total Movimientos</th>
                        <th>Entradas</th>
                        <th>Salidas</th>
                        <th>Último Movimiento</th>
                    </tr>
                </thead>
                <tbody>
                    ${data
                      .map(
                        (d) => `
                        <tr>
                            <td>${d.producto_nombre}</td>
                            <td>${d.total_movimientos}</td>
                            <td><span style="color: #27ae60;">+${d.total_entradas || 0}</span></td>
                            <td><span style="color: #e74c3c;">-${d.total_salidas || 0}</span></td>
                            <td>${new Date(d.ultimo_movimiento).toLocaleDateString("es-ES")}</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;

    container.innerHTML = html;
  }

  async loadTopBuyersReport(toggle = true) {
    try {
      const container = document.getElementById("top-buyers-container");
      if (toggle) {
        container.classList.toggle("hidden");
      } else {
        container.classList.remove("hidden");
      }

      if (container.classList.contains("hidden")) return;

      const periodo =
        document.getElementById("top-buyers-period")?.value || "dia";
      let query = `?periodo=${periodo}`;
      if (periodo === "especifico") {
        const fecha = document.getElementById("top-buyers-date")?.value;
        if (fecha) query += `&fecha=${fecha}`;
      }

      const data = await API.get(`/admin/reports/top-buyers${query}`);
      this.renderTopBuyersReport(data, container);
    } catch (error) {
      console.error("Error cargando reporte de clientes estrella:", error);
      this.showNotification("Error al cargar reporte", "error");
    }
  }

  renderTopBuyersReport(data, container) {
    if (data.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #999;">No hay datos disponibles</p>';
      return;
    }
    const html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Correo</th>
                        <th>Pedidos</th>
                        <th>Total Invertido</th>
                    </tr>
                </thead>
                <tbody>
                    ${data
                      .map(
                        (u) => `
                        <tr>
                            <td><strong>${u.cliente}</strong></td>
                            <td style="font-size: 0.85rem; color: #555;">${u.correo}</td>
                            <td>${u.total_pedidos}</td>
                            <td><strong style="color: #27ae60;">${this.formatMoney(u.total_invertido)}</strong></td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
    container.innerHTML = html;
  }

  async loadBestSellersReport(toggle = true) {
    try {
      const container = document.getElementById("best-sellers-container");
      if (toggle) {
        container.classList.toggle("hidden");
      } else {
        container.classList.remove("hidden");
      }

      if (container.classList.contains("hidden")) return;

      const periodo =
        document.getElementById("best-seller-period")?.value || "dia";
      let query = `?periodo=${periodo}`;
      if (periodo === "especifico") {
        const fecha = document.getElementById("best-seller-date")?.value;
        if (fecha) query += `&fecha=${fecha}`;
      }

      const data = await API.get(`/admin/reports/best-sellers${query}`);
      this.renderBestSellersReport(data, container);
    } catch (error) {
      console.error("Error cargando reporte de productos más vendidos:", error);
      this.showNotification("Error al cargar reporte", "error");
    }
  }

  renderBestSellersReport(data, container) {
    if (data.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #999;">No hay datos disponibles</p>';
      return;
    }
    const html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Unidades</th>
                        <th>Ingresos</th>
                    </tr>
                </thead>
                <tbody>
                    ${data
                      .map(
                        (p) => `
                        <tr>
                            <td><strong>${p.producto}</strong></td>
                            <td>${p.categoria}</td>
                            <td>${p.unidades_vendidas}</td>
                            <td><strong style="color: #27ae60;">${this.formatMoney(p.ingresos_generados)}</strong></td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
    container.innerHTML = html;
  }

  async loadSalesConsolidatedReport(toggle = true) {
    try {
      const container = document.getElementById("sales-consolidated-container");
      if (toggle) {
        container.classList.toggle("hidden");
      } else {
        container.classList.remove("hidden");
      }

      if (container.classList.contains("hidden")) return;

      const periodo = document.getElementById("sales-period").value;
      let query = `?periodo=${periodo}`;
      if (periodo === "especifico") {
        const fecha = document.getElementById("sales-date")?.value;
        if (fecha) query += `&fecha=${fecha}`;
      }

      const data = await API.get(`/admin/reports/sales-consolidated${query}`);
      this.renderSalesConsolidatedReport(data, container, periodo);
    } catch (error) {
      console.error("Error cargando reporte de ventas consolidadas:", error);
      this.showNotification("Error al cargar reporte", "error");
    }
  }

  renderSalesConsolidatedReport(data, container, periodo) {
    const periodNames = {
      dia: "Hoy",
      semana: "Últimos 7 días",
      mes: "Últimos 30 días",
      ano: "Último año",
    };
    const label = periodNames[periodo] || periodo;

    const html = `
            <div style="background: #f8f9fa; border-radius: 6px; padding: 16px; border-left: 4px solid #00d4ff;">
                <h4 style="margin: 0 0 12px 0; color: #1a1a2e;">Resumen Período: <strong>${label}</strong></h4>
                <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #ddd; padding-bottom: 6px;">
                        <span style="color: #666;">Número de Ventas:</span>
                        <strong style="color: #1a1a2e; font-size: 1.1rem;">${data.numero_ventas}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #ddd; padding-bottom: 6px;">
                        <span style="color: #666;">Total Facturado:</span>
                        <strong style="color: #007bff; font-size: 1.1rem;">${this.formatMoney(data.total_facturado)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-bottom: 4px;">
                        <span style="color: #666; font-weight: 600;">Utilidad Neta Real (FIFO):</span>
                        <strong style="color: #28a745; font-size: 1.15rem;">${this.formatMoney(data.ganancia_real_neta)}</strong>
                    </div>
                </div>
            </div>
        `;
    container.innerHTML = html;
  }

  async loadProvidersPerformanceReport(toggle = true) {
    try {
      const container = document.getElementById(
        "providers-performance-container",
      );
      if (toggle) {
        container.classList.toggle("hidden");
      } else {
        container.classList.remove("hidden");
      }

      if (container.classList.contains("hidden")) return;

      const periodo =
        document.getElementById("providers-period")?.value || "dia";
      let query = `?periodo=${periodo}`;
      if (periodo === "especifico") {
        const fecha = document.getElementById("providers-date")?.value;
        if (fecha) query += `&fecha=${fecha}`;
      }

      const data = await API.get(
        `/admin/reports/providers-performance${query}`,
      );
      this.renderProvidersPerformanceReport(data, container);
    } catch (error) {
      console.error("Error cargando reporte de proveedores:", error);
      this.showNotification("Error al cargar reporte", "error");
    }
  }

  renderProvidersPerformanceReport(data, container) {
    if (data.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #999;">No hay datos disponibles</p>';
      return;
    }
    const html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Proveedor</th>
                        <th>Variedad</th>
                        <th>Uds.</th>
                        <th>Inversión</th>
                    </tr>
                </thead>
                <tbody>
                    ${data
                      .map(
                        (p) => `
                        <tr>
                            <td><strong>${p.proveedor}</strong></td>
                            <td>${p.variedad_productos}</td>
                            <td>${p.total_unidades_compradas}</td>
                            <td><strong style="color: #dc3545; white-space: nowrap;">${this.formatMoney(p.inversion_total_real)}</strong></td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
    container.innerHTML = html;
  }

  async loadPaymentMethodsReport() {
    try {
      const container = document.getElementById("payment-methods-container");
      container.classList.toggle("hidden");

      if (container.classList.contains("hidden")) return;

      const data = await API.get("/admin/reports/payment-methods");
      this.renderPaymentMethodsReport(data, container);
    } catch (error) {
      console.error("Error cargando reporte de métodos de pago:", error);
      this.showNotification("Error al cargar reporte", "error");
    }
  }

  renderPaymentMethodsReport(data, container) {
    if (data.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #999;">No hay datos disponibles</p>';
      return;
    }
    const html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Método Pago</th>
                        <th>Transacciones</th>
                        <th>Monto Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${data
                      .map(
                        (m) => `
                        <tr>
                            <td><strong>${m.metodo_pago || "Otro"}</strong></td>
                            <td>${m.total_transacciones}</td>
                            <td><strong style="color: #27ae60;">${this.formatMoney(m.monto_total_procesado)}</strong></td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
    container.innerHTML = html;
  }

  // ===== REPORTE: CLIENTE TOP POR PRODUCTO =====

  async loadTopBuyersPerProductReport(toggle = true) {
    try {
      const container = document.getElementById(
        "top-buyers-per-product-container",
      );
      if (toggle) {
        container.classList.toggle("hidden");
      } else {
        container.classList.remove("hidden");
      }

      if (container.classList.contains("hidden")) return;

      container.innerHTML =
        '<p style="text-align: center; color: #888;">Cargando...</p>';

      const periodo =
        document.getElementById("top-buyers-prod-period")?.value || "dia";
      let query = `?periodo=${periodo}`;
      if (periodo === "especifico") {
        const fecha = document.getElementById("top-buyers-prod-date")?.value;
        if (fecha) query += `&fecha=${fecha}`;
      }

      const data = await API.get(
        `/admin/reports/top-buyers-per-product${query}`,
      );
      this.renderTopBuyersPerProductReport(data, container);
    } catch (error) {
      console.error(
        "Error cargando reporte de cliente top por producto:",
        error,
      );
      this.showNotification("Error al cargar reporte", "error");
    }
  }

  renderTopBuyersPerProductReport(data, container) {
    if (data.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #999;">No hay datos disponibles</p>';
      return;
    }
    const html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cliente</th>
                        <th>Uds.</th>
                        <th>Gasto Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${data
                      .map(
                        (r) => `
                        <tr>
                            <td><strong>${r.producto}</strong></td>
                            <td>${r.cliente}</td>
                            <td style="text-align: center;"><strong>${r.total_unidades}</strong></td>
                            <td><strong style="color: #27ae60; white-space: nowrap;">${this.formatMoney(r.total_gasto)}</strong></td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
    container.innerHTML = html;
  }

  // ===== REPORTE: INFORMACIÓN DE LOTES COMPRA =====

  async loadLotesInfoReport(toggle = true) {
    try {
      const container = document.getElementById("lotes-info-container");
      if (toggle) {
        container.classList.toggle("hidden");
      } else {
        container.classList.remove("hidden");
      }

      if (container.classList.contains("hidden")) return;

      container.innerHTML =
        '<p style="text-align: center; color: #888;">Cargando...</p>';

      const periodo =
        document.getElementById("lotes-info-period")?.value || "dia";
      let query = `?periodo=${periodo}`;
      if (periodo === "especifico") {
        const fecha = document.getElementById("lotes-info-date")?.value;
        if (fecha) query += `&fecha=${fecha}`;
      }

      const data = await API.get(`/admin/reports/lotes-info${query}`);
      this.renderLotesInfoReport(data, container);
    } catch (error) {
      console.error("Error cargando reporte de información de lotes:", error);
      this.showNotification("Error al cargar reporte", "error");
    }
  }

  renderLotesInfoReport(data, container) {
    if (data.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #999;">No hay datos disponibles para esta fecha</p>';
      return;
    }
    const html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Proveedor</th>
                        <th>Inicial</th>
                        <th>Disponible</th>
                        <th>Vendida</th>
                        <th>Costo Unit.</th>
                        <th>Fecha Entrada</th>
                    </tr>
                </thead>
                <tbody>
                    ${data
                      .map(
                        (l) => `
                        <tr>
                            <td><strong>${l.producto}</strong></td>
                            <td>${l.proveedor || "-"}</td>
                            <td style="text-align: center;">${l.cantidad_inicial}</td>
                            <td style="text-align: center;"><strong style="color: #27ae60;">${l.cantidad_disponible}</strong></td>
                            <td style="text-align: center;"><strong style="color: #007bff;">${l.cantidad_vendida}</strong></td>
                            <td>${this.formatMoney(l.precio_compra_lote)}</td>
                            <td style="font-size: 0.85rem; color: #555;">${new Date(l.fecha_entrada).toLocaleDateString("es-CO")}</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
    container.innerHTML = html;
  }

  // ===== UTILIDADES =====

  formatMoney(amount) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === "success" ? "#27ae60" : type === "error" ? "#e74c3c" : "#3498db"};
            color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  logout() {
    Auth.logout();
    window.location.href = "login.html";
  }
}

// Crear instancia global
const admin = new AdminModule();

// Event listeners para reportes
window.loadLowStockReport = () => admin.loadLowStockReport();
window.loadProfitabilityReport = () => admin.loadProfitabilityReport();
window.loadKardexResumen = () => admin.loadKardexResumen();
window.loadTopBuyersReport = () => admin.loadTopBuyersReport();
window.loadBestSellersReport = () => admin.loadBestSellersReport();
window.loadSalesConsolidatedReport = () => admin.loadSalesConsolidatedReport();
window.loadProvidersPerformanceReport = () =>
  admin.loadProvidersPerformanceReport();
window.loadPaymentMethodsReport = () => admin.loadPaymentMethodsReport();
window.loadTopBuyersPerProductReport = () =>
  admin.loadTopBuyersPerProductReport();
window.loadLotesInfoReport = () => admin.loadLotesInfoReport();

// Manejar el formulario de reabastecer stock
document
  .getElementById("restock-form")
  ?.addEventListener("submit", (e) => admin.handleRestockSubmit(e));

// Agregar estilos para animación de notificaciones
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
