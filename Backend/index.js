const express = require('express');
const cors = require('cors');
require('dotenv').config(); // <-- Esto activa tu archivo .env
require('./src/config/db.js'); // <-- Importar la configuración de la base de datos

const app = express();
// Intenta leer el puerto del .env, si no existe usa el 3000
const PORT = process.env.SERVER_PORT || 3000; 

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/usuarios', require('./src/routes/usuarios'));
app.use('/api/categorias', require('./src/routes/categorias'));
app.use('/api/productos', require('./src/routes/productos'));
app.use('/api/pedidos', require('./src/routes/pedidos'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/proveedores', require('./src/routes/proveedores'));
app.use('/api/cart', require('./src/routes/cart'));

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});