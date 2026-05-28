require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./src/config/db');

async function migrate() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'fifo_migration.sql'), 'utf8');
        const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
        
        console.log('Iniciando migración FIFO...');
        for (let stmt of statements) {
            if (stmt.trim()) {
                await pool.promise().query(stmt);
                console.log('Ejecutado:', stmt.substring(0, 50).trim().replace(/\n/g, ' ') + '...');
            }
        }
        console.log('Migración completada exitosamente.');
    } catch (error) {
        console.error('Error en la migración:', error);
    } finally {
        process.exit();
    }
}

migrate();
