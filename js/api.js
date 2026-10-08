/**
 * SERVICIOSWEB - Cliente API Frontend
 * Maneja la interacción con Neon PostgreSQL y el backend serverless de Vercel
 */

const API = {
    // Número oficial de WhatsApp de Perú
    WHATSAPP_NUMBER: '51929198813',

    /**
     * Obtener configuración institucional de la agencia
     */
    async getConfig() {
        try {
            const res = await fetch('/api/config');
            if (!res.ok) throw new Error('Error al consultar configuración');
            return await res.json();
        } catch (err) {
            console.warn('Usando configuración local de respaldo:', err.message);
            return {
                success: true,
                config: {
                    agencyName: "SERVICIOSWEB",
                    whatsappNumber: this.WHATSAPP_NUMBER,
                    whatsappDisplay: "+51 929 198 813",
                    email: "contacto@serviciosweb.pe"
                }
            };
        }
    },

    /**
     * Enviar nueva solicitud de cliente / prospecto
     */
    async submitLead(data) {
        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            return result;
        } catch (err) {
            console.warn('Error enviando a la base de datos Neon, usando redirección directa:', err);
            // Generación de WhatsApp de respaldo sin perder al cliente
            const msg = `👋 ¡Hola SERVICIOSWEB! Mi nombre es *${data.name}*.\n` +
                `💼 Estoy interesado en el servicio de: *${data.serviceType}*\n` +
                (data.businessType ? `🏢 Rubro/Negocio: *${data.businessType}*\n` : '') +
                (data.budget ? `💰 Presupuesto estimado: *${data.budget}*\n` : '') +
                (data.details ? `📝 Detalles adicionales:\n"${data.details}"\n` : '') +
                `\n¿Podrían brindarme una cotización personalizada?`;

            return {
                success: true,
                whatsappUrl: `https://wa.me/${this.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
            };
        }
    },

    /**
     * Generar URL directa de WhatsApp con texto codificado
     */
    getWhatsAppUrl(customText) {
        const defaultText = "¡Hola SERVICIOSWEB! 👋 Vi sus servicios y me gustaría cotizar un proyecto para mi negocio.";
        const text = customText || defaultText;
        return `https://wa.me/${this.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    }
};

window.API = API;
