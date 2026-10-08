/**
 * Endpoint Serverless para subida directa de imágenes a Cloudflare R2
 * POST /api/upload
 * Proyecto: SERVICIOSWEB
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

function getR2Client() {
    let accountId = (process.env.R2_ACCOUNT_ID || '').trim();
    const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
    const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();

    if (accountId === accessKeyId || !accountId) {
        accountId = 'f60c528df815c081601e0a4a2ce32edf';
    }

    if (!accountId || !accessKeyId || !secretAccessKey) {
        return null;
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: true,
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Diagnóstico GET /api/upload
    if (req.method === 'GET') {
        const isConfigured = !!(
            process.env.R2_ACCOUNT_ID &&
            process.env.R2_ACCESS_KEY_ID &&
            process.env.R2_SECRET_ACCESS_KEY
        );

        return res.status(200).json({
            enabled: isConfigured,
            provider: 'Cloudflare R2 Object Storage',
            bucket: process.env.R2_BUCKET_NAME || 'serviciosweb',
            publicUrl: process.env.R2_PUBLIC_URL || 'https://pub-03357662772540c68740c6e96697d46b.r2.dev'
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método HTTP no permitido' });
    }

    try {
        const r2 = getR2Client();
        if (!r2) {
            return res.status(503).json({
                success: false,
                error: 'Cloudflare R2 no está configurado en las variables de entorno.'
            });
        }

        const bucketName = process.env.R2_BUCKET_NAME || 'serviciosweb';
        const publicUrl = (process.env.R2_PUBLIC_URL || 'https://pub-03357662772540c68740c6e96697d46b.r2.dev').replace(/\/$/, '');

        const { filename, data, contentType, folder } = req.body || {};
        if (!data) {
            return res.status(400).json({ success: false, error: 'No se envió información de imagen.' });
        }

        let buffer;
        let mime = contentType || 'image/webp';

        if (typeof data === 'string' && data.startsWith('data:')) {
            const matches = data.match(/^data:([^;]+);base64,(.*)$/);
            if (matches) {
                mime = matches[1];
                buffer = Buffer.from(matches[2], 'base64');
            } else {
                buffer = Buffer.from(data, 'base64');
            }
        } else if (Buffer.isBuffer(data)) {
            buffer = data;
        } else {
            buffer = Buffer.from(data, 'base64');
        }

        let ext = 'webp';
        if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        else if (mime.includes('png')) ext = 'png';
        else if (mime.includes('svg')) ext = 'svg';

        const safeFolder = (folder || 'portfolio').replace(/[^a-z0-9_-]/g, '');
        const safeBaseName = (filename || 'image')
            .replace(/\.[^/.]+$/, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .substring(0, 35);

        const key = `${safeFolder}/${Date.now()}-${safeBaseName}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: mime,
            CacheControl: 'public, max-age=31536000, immutable'
        });

        await r2.send(command);

        const fileUrl = `${publicUrl}/${key}`;

        return res.status(200).json({
            success: true,
            url: fileUrl,
            key: key,
            size: buffer.length,
            provider: 'Cloudflare R2'
        });

    } catch (err) {
        console.error('Error al subir a Cloudflare R2:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Error al procesar subida a Cloudflare R2.'
        });
    }
};
