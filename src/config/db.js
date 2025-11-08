// config/db.js
import mysql from 'mysql2/promise';
import 'dotenv/config';

// Crear un pool de conexiones
const pool = mysql.createPool({
    uri: process.env.DATABASE_URL, 
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0
});

console.log(' Módulo de MySQL configurado y listo.');

export default pool;