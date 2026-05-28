const mysql = require('mysql2');

// Crear el pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

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