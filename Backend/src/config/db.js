const mysql = require('mysql2');

// Crear el pool de conexiones con soporte opcional de SSL (p.ej. Aiven requiere SSL)
const poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

if (process.env.DB_SSL && process.env.DB_SSL.toUpperCase() === 'REQUIRED') {
    // Habilita SSL; para Aiven normalmente basta indicar SSL. Si Aiven requiere CA,
    // puedes añadir `ssl: { ca: fs.readFileSync('/path/to/ca.pem') }`.
    poolConfig.ssl = { rejectUnauthorized: true };
}

const pool = mysql.createPool(poolConfig);

// Obtener una conexión del pool para probar
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error al conectar a MySQL:', err.message);
        return;
    }
    console.log('✅ Conexión a MySQL exitosa (TecnoStore DB)');
    connection.release(); // Liberar la conexión
});

// Exportar el pool para usarlo en otros archivos
module.exports = pool;