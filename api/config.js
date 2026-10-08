/**
 * API Serverless Endpoint para Configuración de SERVICIOSWEB
 * GET  /api/config -> Obtiene la configuración pública
 * POST /api/config -> Actualiza la configuración (requiere PIN de seguridad)
 */

const { getDb, ensureTables, getDbInfo } = require('./db');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const sql = getDb();
        await ensureTables();

        if (req.method === 'GET') {
            const rows = await sql`SELECT value FROM site_config WHERE key = 'main';`;
            const config = rows[0]?.value || {
                agencyName: "SERVICIOSWEB",
                tagline: "Desarrollo Web de Alto Rendimiento, Catálogos Interactivos y Manejo Estratégico de Redes Sociales",
                whatsappNumber: "51929198813",
                whatsappDisplay: "+51 929 198 813",
                email: "contacto@serviciosweb.pe",
                location: "Lima, Perú",
                currencySymbol: "S/"
            };

            const info = getDbInfo();
            // Retornar configuración segura (sin exponer adminPin al público a menos que sea autenticado)
            const publicConfig = { ...config };
            delete publicConfig.adminPin;

            return res.status(200).json({
                success: true,
                config: publicConfig,
                database: info.database,
                connected: info.connected
            });
        }

        if (req.method === 'POST') {
            const { pin, newConfig } = req.body || {};

            const rows = await sql`SELECT value FROM site_config WHERE key = 'main';`;
            const currentConfig = rows[0]?.value || {};
            const expectedPin = currentConfig.adminPin || '1234';

            if (pin !== expectedPin) {
                return res.status(401).json({ success: false, error: 'PIN de administrador incorrecto.' });
            }

            const merged = { ...currentConfig, ...newConfig };
            // Si el nuevo config incluye nuevo pin, mantenerlo
            if (newConfig.newPin) {
                merged.adminPin = newConfig.newPin;
                delete merged.newPin;
            }

            await sql`
                INSERT INTO site_config (key, value, updated_at)
                VALUES ('main', ${JSON.stringify(merged)}::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    updated_at = CURRENT_TIMESTAMP;
            `;

            return res.status(200).json({
                success: true,
                message: 'Configuración guardada en Neon PostgreSQL.',
                config: merged
            });
        }

        return res.status(405).json({ success: false, error: 'Método no permitido.' });

    } catch (error) {
        console.error('Error en /api/config:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error en configuración de Neon.'
        });
    }
};
