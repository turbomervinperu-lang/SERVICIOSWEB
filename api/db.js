/**
 * Módulo de Conexión a Base de Datos Neon PostgreSQL (Vercel Serverless)
 * Proyecto: SERVICIOSWEB
 * Base de Datos: SERVICIOSWEB
 */

let neonSql = null;

function getConnectionString() {
    return process.env.POSTGRES_URL ||
           process.env.DATABASE_URL ||
           process.env.POSTGRES_PRISMA_URL ||
           process.env.POSTGRES_URL_NON_POOLING ||
           process.env.NEON_DATABASE_URL ||
           'postgresql://neondb_owner:npg_r5eHh7JLFzsg@ep-dark-water-b8kmycoy-pooler.c-14.us-east-1.aws.neon.tech/SERVICIOSWEB?sslmode=require&channel_binding=require';
}

function getDb() {
    const connectionString = getConnectionString();
    if (!connectionString) {
        throw new Error('No se encontró la cadena de conexión de Neon Postgres (POSTGRES_URL o DATABASE_URL).');
    }

    if (!neonSql) {
        try {
            const { neon } = require('@neondatabase/serverless');
            neonSql = neon(connectionString);
        } catch (err) {
            console.warn('Fallback a módulo pg nativo:', err.message);
            const { Pool } = require('pg');
            const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
            neonSql = async (strings, ...values) => {
                let query = '';
                for (let i = 0; i < strings.length; i++) {
                    query += strings[i];
                    if (i < values.length) {
                        query += `$${i + 1}`;
                    }
                }
                const res = await pool.query(query, values);
                return res.rows;
            };
        }
    }
    return neonSql;
}

/**
 * Garantiza que las tablas necesarias existan en la base de datos Neon
 */
async function ensureTables() {
    const sql = getDb();

    // 1. Tabla de Solicitudes y Prospectos (Leads)
    await sql`
        CREATE TABLE IF NOT EXISTS leads (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            whatsapp VARCHAR(50) NOT NULL,
            service_type VARCHAR(100) NOT NULL,
            business_type VARCHAR(255) DEFAULT '',
            details TEXT DEFAULT '',
            budget VARCHAR(100) DEFAULT '',
            source VARCHAR(100) DEFAULT 'web',
            status VARCHAR(50) DEFAULT 'nuevo',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    // 2. Tabla de Configuración de la Agencia
    await sql`
        CREATE TABLE IF NOT EXISTS site_config (
            key VARCHAR(100) PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    // 3. Tabla de Catálogo de Servicios
    await sql`
        CREATE TABLE IF NOT EXISTS services (
            id VARCHAR(50) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            short_desc TEXT NOT NULL,
            features JSONB DEFAULT '[]'::jsonb,
            price_range VARCHAR(100) DEFAULT '',
            badge VARCHAR(50) DEFAULT '',
            icon VARCHAR(50) DEFAULT '',
            sort_order INT DEFAULT 0
        );
    `;

    // 4. Semilla de Configuración Inicial si no existe
    const configCheck = await sql`SELECT COUNT(*)::int as count FROM site_config WHERE key = 'main';`;
    if ((configCheck[0]?.count || 0) === 0) {
        const defaultConfig = {
            agencyName: "SERVICIOSWEB",
            tagline: "Desarrollo Web de Alto Rendimiento, Catálogos Interactivos y Manejo Estratégico de Redes Sociales",
            whatsappNumber: "51929198813",
            whatsappDisplay: "+51 929 198 813",
            email: "contacto@serviciosweb.pe",
            location: "Lima, Perú - Cobertura Nacional e Internacional",
            currencySymbol: "S/",
            currencyCode: "PEN",
            adminPin: "1234",
            totalLeadsCount: 15,
            bannerAlert: "🚀 ¡Promoción Especial de Lanzamiento! Consulta tu web o catálogo digital y obtén integración a WhatsApp sin costo adicional."
        };

        await sql`
            INSERT INTO site_config (key, value)
            VALUES ('main', ${JSON.stringify(defaultConfig)}::jsonb)
            ON CONFLICT (key) DO NOTHING;
        `;
    }

    return true;
}

function getDbInfo() {
    const conn = getConnectionString();
    if (!conn) {
        return { database: 'Desconectado', host: 'Sin conexión', connected: false };
    }
    try {
        const u = new URL(conn);
        return {
            database: u.pathname.replace(/^\//, '') || 'SERVICIOSWEB',
            host: u.hostname,
            connected: true
        };
    } catch {
        return {
            database: 'SERVICIOSWEB',
            host: 'ep-dark-water-b8kmycoy.c-14.us-east-1.aws.neon.tech',
            connected: true
        };
    }
}

module.exports = {
    getConnectionString,
    getDb,
    ensureTables,
    getDbInfo
};
