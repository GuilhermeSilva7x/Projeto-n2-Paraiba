
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

require('dotenv').config({
    path: path.resolve(__dirname, '../../.env.local')
});

// Certificado SSL do Supabase
const certificado = fs.readFileSync(
    path.resolve(__dirname, '../../certs/supabase-ca.crt'),
    'utf8'
);

// Conexão com PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
    ssl: {
        ca: certificado,
        rejectUnauthorized: true
    }
});

module.exports = pool;
