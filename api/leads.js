/**
 * API Serverless Endpoint para Captación y Gestión de Clientes / Leads
 * POST /api/leads -> Registra una nueva solicitud/cotización en Neon PostgreSQL
 * GET  /api/leads -> Obtiene la lista de solicitudes (con filtro o para el panel admin)
 * PATCH /api/leads -> Actualiza el estado de un lead (contactado, cerrado, descartado)
 */

const { getDb, ensureTables } = require('./db');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const sql = getDb();
        await ensureTables();

        // 1. GET: Listar prospectos
        if (req.method === 'GET') {
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
            const statusFilter = req.query.status;

            let rows;
            if (statusFilter) {
                rows = await sql`
                    SELECT * FROM leads
                    WHERE status = ${statusFilter}
                    ORDER BY created_at DESC
                    LIMIT ${limit};
                `;
            } else {
                rows = await sql`
                    SELECT * FROM leads
                    ORDER BY created_at DESC
                    LIMIT ${limit};
                `;
            }

            const stats = await sql`
                SELECT 
                    COUNT(*)::int as total,
                    COUNT(*) FILTER (WHERE service_type ILIKE '%web%')::int as web_count,
                    COUNT(*) FILTER (WHERE service_type ILIKE '%catalogo%')::int as catalogo_count,
                    COUNT(*) FILTER (WHERE service_type ILIKE '%redes%')::int as redes_count,
                    COUNT(*) FILTER (WHERE status = 'nuevo')::int as new_count
                FROM leads;
            `;

            return res.status(200).json({
                success: true,
                leads: rows,
                stats: stats[0] || {}
            });
        }

        // 2. POST: Registrar nuevo cliente/lead
        if (req.method === 'POST') {
            const {
                name,
                whatsapp,
                serviceType,
                businessType,
                details,
                budget,
                source
            } = req.body || {};

            if (!name || !whatsapp || !serviceType) {
                return res.status(400).json({
                    success: false,
                    error: 'Faltan campos requeridos: nombre, WhatsApp y tipo de servicio.'
                });
            }

            const cleanedPhone = whatsapp.replace(/\D/g, '');
            const safeService = serviceType.substring(0, 100);
            const safeBusiness = (businessType || '').substring(0, 255);
            const safeDetails = details || '';
            const safeBudget = (budget || '').substring(0, 100);
            const safeSource = (source || 'web-cotizador').substring(0, 100);

            const inserted = await sql`
                INSERT INTO leads (
                    name, whatsapp, service_type, business_type, details, budget, source, status
                ) VALUES (
                    ${name.trim()},
                    ${cleanedPhone},
                    ${safeService},
                    ${safeBusiness},
                    ${safeDetails},
                    ${safeBudget},
                    ${safeSource},
                    'nuevo'
                )
                RETURNING id, created_at;
            `;

            const leadId = inserted[0]?.id;

            // Formatear mensaje sugerido para WhatsApp
            const message = `👋 ¡Hola SERVICIOSWEB! Mi nombre es *${name.trim()}*.\n` +
                `💼 Estoy interesado en el servicio de: *${safeService}*\n` +
                (safeBusiness ? `🏢 Rubro/Negocio: *${safeBusiness}*\n` : '') +
                (safeBudget ? `💰 Presupuesto estimado: *${safeBudget}*\n` : '') +
                (safeDetails ? `📝 Detalles adicionales:\n"${safeDetails}"\n` : '') +
                `\n¿Podrían brindarme información y una cotización personalizada?`;

            const encodedMessage = encodeURIComponent(message);
            const targetNumber = process.env.WHATSAPP_NUMBER || '51929198813';
            const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodedMessage}`;

            return res.status(201).json({
                success: true,
                message: 'Lead registrado exitosamente en Neon PostgreSQL.',
                leadId: leadId,
                whatsappUrl: whatsappUrl
            });
        }

        // 3. PATCH: Cambiar estado de lead (atendido, en proceso, etc.)
        if (req.method === 'PATCH') {
            const { id, status } = req.body || {};
            if (!id || !status) {
                return res.status(400).json({ success: false, error: 'Falta ID o status.' });
            }

            await sql`
                UPDATE leads
                SET status = ${status}
                WHERE id = ${parseInt(id, 10)};
            `;

            return res.status(200).json({
                success: true,
                message: 'Estado del prospecto actualizado.'
            });
        }

        return res.status(405).json({ success: false, error: 'Método no permitido.' });

    } catch (error) {
        console.error('Error en /api/leads:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error al procesar la solicitud en Neon.'
        });
    }
};
