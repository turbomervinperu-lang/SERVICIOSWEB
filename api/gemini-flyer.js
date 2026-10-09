/**
 * API Serverless Endpoint para Generación de Publicidad & Análisis de Imágenes con Google Gemini Gratuito
 * POST /api/gemini-flyer
 * 
 * Utiliza el modelo multimodal gratuito Gemini 1.5 Flash / Gemini 2.0 Flash de Google AI Studio
 * para analizar la foto del producto, identificar características, redactar titulares persuasivos,
 * copy publicitario para redes y sugerir etiquetas de precios.
 */

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' });
    }

    try {
        const { imageBase64, mimeType = 'image/jpeg', price = '', currency = 'S/', customKey = '' } = req.body || {};

        // La API key puede venir de variables de entorno o ser provista por el admin
        const apiKey = customKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            // Si no hay API key configurada todavía, retornar un objeto descriptivo con plantilla inteligente
            return res.status(200).json({
                success: true,
                isDemo: true,
                message: "Modo Asistido (Sin API Key configurada aún). Para usar Gemini en vivo ingresa tu clave gratuita de Google AI Studio.",
                data: {
                    productName: "Producto Exclusivo de Temporada",
                    category: "Novedades & Tendencias",
                    hookTitle: "¡Calidad Superior al Mejor Precio!",
                    badge: "¡OFERTA LIMITADA!",
                    priceFormatted: `${currency} ${price || '49.90'}`,
                    features: [
                        "Materiales de alta durabilidad y diseño moderno",
                        "Garantía de satisfacción y soporte inmediato",
                        "Envíos rápidos y seguros a nivel nacional"
                    ],
                    socialCopy: `🔥 ¡ATENCIÓN! Ya disponible este increíble producto a un precio irrepetible.\n\n✨ Calidad garantizada, diseño exclusivo y listo para entrega inmediata.\n\n💰 Precio especial: ${currency} ${price || '49.90'}\n📲 ¡Escríbenos ahora mismo al WhatsApp para reservar el tuyo antes de que se agote el stock! 🚀`,
                    hashtags: "#OfertasPeru #TiendaOnline #ProductosDeCalidad #Descuentos #ServiciosWeb"
                }
            });
        }

        if (!imageBase64) {
            return res.status(400).json({ success: false, error: 'Se requiere la imagen en base64 para analizarla.' });
        }

        // Limpiar base64 si incluye el prefijo data:image/...;base64,
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');

        // Prompt especializado para publicidad en redes sociales
        const systemPrompt = `Eres un experto publicista y director creativo de marketing digital para redes sociales (Facebook, Instagram, WhatsApp, TikTok).
Analiza detalladamente la imagen adjunta de este producto que un cliente desea vender por el precio indicado de ${currency} ${price || 'a consultar'}.

Debes devolver EXCLUSIVAMENTE un objeto JSON válido (sin formato markdown adicional ni bloques \`\`\`json) con esta estructura exacta:
{
  "productName": "Nombre comercial llamativo y preciso del producto identificado en la imagen",
  "category": "Categoría comercial (ej: Calzado, Moda, Tecnología, Hogar, Belleza, etc.)",
  "hookTitle": "Titular de alto impacto persuasivo para el flyer (máximo 6 palabras)",
  "badge": "Frase de etiqueta de urgencia (ej: ¡EDICIÓN LIMITADA!, ¡LIQUIDACIÓN TOTAL!, ¡OFERTA EXCLUSIVA!)",
  "features": [
    "Ventaja o característica atractiva 1",
    "Ventaja o característica atractiva 2",
    "Ventaja o beneficio diferencial 3"
  ],
  "socialCopy": "Texto de persuasión comercial completo listo para publicar en Facebook e Instagram, usando emojis atractivos, mencionando el precio de ${currency} ${price || ''} y con llamada a la acción para contactar por WhatsApp",
  "hashtags": "5 a 7 hashtags virales y de venta relevantes para el producto"
}`;

        // Endpoint de Google Gemini 1.5 Flash (Tier 100% Gratuito en Google AI Studio)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [
                {
                    parts: [
                        { text: systemPrompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: cleanBase64
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json"
            }
        };

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Error en Gemini API:', errText);
            return res.status(response.status).json({
                success: false,
                error: `Error desde Gemini API: ${response.statusText}`,
                details: errText
            });
        }

        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidateText) {
            throw new Error('Gemini no devolvió texto de respuesta.');
        }

        // Limpiar posibles delimitadores de código
        const jsonClean = candidateText.trim().replace(/^```json/, '').replace(/```$/, '').trim();
        const parsedJson = JSON.parse(jsonClean);
        parsedJson.priceFormatted = `${currency} ${price || 'Consultar'}`;

        return res.status(200).json({
            success: true,
            isDemo: false,
            data: parsedJson
        });

    } catch (err) {
        console.error('Error procesando solicitud de Gemini Flyer:', err);
        return res.status(500).json({
            success: false,
            error: 'No se pudo procesar la imagen con Gemini: ' + err.message
        });
    }
};
