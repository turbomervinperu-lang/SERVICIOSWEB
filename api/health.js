/**
 * Endpoint de Diagnóstico de Salud
 * GET /api/health
 */

const { getDb, ensureTables, getDbInfo } = require('./db');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const startTime = Date.now();
    const info = getDbInfo();

    try {
        const sql = getDb();
        await ensureTables();
        const dbTest = await sql`SELECT 1 as alive, current_database() as db, count(*)::int as total_leads FROM leads;`;
        const latency = Date.now() - startTime;

        return res.status(200).json({
            status: 'operational',
            neonConnected: true,
            database: dbTest[0]?.db || info.database,
            totalLeads: dbTest[0]?.total_leads || 0,
            latencyMs: latency,
            r2Configured: !!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        return res.status(500).json({
            status: 'degraded',
            neonConnected: false,
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
};
