const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3308,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'medinex_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection and print the full error if it fails
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the medinex_db database!');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err.code, err.message);
        console.error(err);
        if (err.errors) {
            err.errors.forEach(e => console.error(' -', e.code, e.address, e.port));
        }
    });

module.exports = pool;