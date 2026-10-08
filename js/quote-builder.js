/**
 * SERVICIOSWEB - Cotizador Interactivo en Vivo
 * Permite seleccionar servicio, extras, ingresar datos de negocio y enviar a WhatsApp 929198813
 */

document.addEventListener('DOMContentLoaded', () => {
    const serviceCards = document.querySelectorAll('.service-choice-card');
    const addonCheckboxes = document.querySelectorAll('.addon-checkbox');
    const summaryServiceEl = document.getElementById('summary-service-name');
    const summaryFeaturesList = document.getElementById('summary-features-list');
    const leadForm = document.getElementById('quote-lead-form');
    const btnSendWhatsApp = document.getElementById('btn-send-quote-wa');

    let currentSelectedService = "Páginas Web Profesionales";
    let selectedAddons = [];

    // Opciones predefinidas por servicio
    const serviceData = {
        web: {
            title: "Página Web Profesional & Landing Page",
            features: [
                "Diseño moderno 100% responsivo (Móvil y PC)",
                "Optimización SEO para aparecer en Google",
                "Integración con botón flotante de WhatsApp",
                "Certificado de seguridad SSL y alta velocidad"
            ]
        },
        catalogo: {
            title: "Catálogo Digital Interactivo con Carrito",
            features: [
                "Carrito de compras integrado en Soles (S/)",
                "Envío de pedidos estructurados a tu WhatsApp",
                "Medios de pago peruanos (Yape, Plin, BCP, Interbank)",
                "Panel de control para fotos y stock",
                "Compresión automática de imágenes rápida"
            ]
        },
        redes: {
            title: "Manejo Estratégico de Redes Sociales",
            features: [
                "Diseño de publicaciones de alto impacto visual",
                "Edición de Reels y videos cortos para TikTok/Instagram",
                "Estrategia mensual con calendario de contenidos",
                "Configuración de anuncios pagados (Meta Ads)",
                "Copywriting orientado a captar clientes"
            ]
        },
        pack: {
            title: "Pack Todo en Uno (Web + Catálogo + Redes)",
            features: [
                "Página web completa con catálogo digital integrado",
                "Campaña de lanzamiento en Redes Sociales (1 mes)",
                "Reels y piezas gráficas publicitarias incluidas",
                "Máxima visibilidad y conversión inmediata"
            ]
        }
    };

    function updateSummary() {
        if (summaryServiceEl) {
            summaryServiceEl.textContent = currentSelectedService;
        }

        if (summaryFeaturesList) {
            summaryFeaturesList.innerHTML = '';

            // Detectar clave del servicio seleccionado
            let key = 'web';
            if (currentSelectedService.includes('Catálogo')) key = 'catalogo';
            else if (currentSelectedService.includes('Redes')) key = 'redes';
            else if (currentSelectedService.includes('Pack')) key = 'pack';

            const baseFeatures = serviceData[key]?.features || [];

            baseFeatures.forEach(feat => {
                const li = document.createElement('li');
                li.className = 'summary-feature-item';
                li.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>${feat}</span>
                `;
                summaryFeaturesList.appendChild(li);
            });

            // Agregar extras seleccionados
            selectedAddons.forEach(addon => {
                const li = document.createElement('li');
                li.className = 'summary-feature-item';
                li.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" stroke-width="2.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 8 12 12 14 14"></polyline>
                    </svg>
                    <span style="color:#00e5ff; font-weight:600;">+ Extra: ${addon}</span>
                `;
                summaryFeaturesList.appendChild(li);
            });
        }
    }

    // Selección de Tipo de Servicio
    serviceCards.forEach(card => {
        card.addEventListener('click', () => {
            serviceCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            currentSelectedService = card.getAttribute('data-service-name') || "Páginas Web Profesionales";
            updateSummary();
        });
    });

    // Checkboxes de Extras
    addonCheckboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            const label = chk.closest('.addon-checkbox-label');
            if (chk.checked) {
                label.classList.add('checked');
            } else {
                label.classList.remove('checked');
            }

            selectedAddons = Array.from(addonCheckboxes)
                .filter(c => c.checked)
                .map(c => c.getAttribute('data-addon-name'));

            updateSummary();
        });
    });

    // Envío del Formulario y Generación de WhatsApp
    if (leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nameInput = document.getElementById('client-name');
            const phoneInput = document.getElementById('client-phone');
            const businessInput = document.getElementById('client-business');
            const detailsInput = document.getElementById('client-details');
            const budgetInput = document.getElementById('client-budget');

            const name = nameInput?.value.trim() || '';
            const phone = phoneInput?.value.trim() || '';
            const business = businessInput?.value.trim() || 'No especificado';
            const details = detailsInput?.value.trim() || '';
            const budget = budgetInput?.value || 'Por definir';

            if (!name || !phone) {
                alert('Por favor ingrese su Nombre y número de WhatsApp para contactarle.');
                return;
            }

            const fullDetails = [
                `Extras solicitados: ${selectedAddons.length > 0 ? selectedAddons.join(', ') : 'Ninguno'}`,
                details ? `Nota: ${details}` : ''
            ].filter(Boolean).join(' | ');

            if (btnSendWhatsApp) {
                btnSendWhatsApp.disabled = true;
                btnSendWhatsApp.innerHTML = `
                    <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                        <path d="M12 2a10 10 0 0 1 10 10"></path>
                    </svg>
                    <span>Conectando a WhatsApp...</span>
                `;
            }

            // Registrar en Neon PostgreSQL
            try {
                const res = await window.API.submitLead({
                    name,
                    whatsapp: phone,
                    serviceType: currentSelectedService,
                    businessType: business,
                    budget: budget,
                    details: fullDetails,
                    source: 'cotizador-en-vivo'
                });

                // Abrir WhatsApp directamente
                const waUrl = res.whatsappUrl || window.API.getWhatsAppUrl(
                    `👋 ¡Hola SERVICIOSWEB! Mi nombre es *${name}*.\n` +
                    `💼 Me interesa: *${currentSelectedService}*\n` +
                    `🏢 Rubro: *${business}*\n` +
                    (selectedAddons.length > 0 ? `✨ Extras: *${selectedAddons.join(', ')}*\n` : '') +
                    (budget ? `💰 Presupuesto estimado: *${budget}*\n` : '') +
                    (details ? `📝 Consulta: "${details}"\n` : '') +
                    `\n¿Podrían darme más información y detalles para iniciar?`
                );

                window.open(waUrl, '_blank');

            } catch (err) {
                console.error('Error al procesar:', err);
                const fallbackUrl = window.API.getWhatsAppUrl(`¡Hola! Deseo cotizar: ${currentSelectedService}`);
                window.open(fallbackUrl, '_blank');
            } finally {
                if (btnSendWhatsApp) {
                    btnSendWhatsApp.disabled = false;
                    btnSendWhatsApp.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/>
                        </svg>
                        <span>📲 Enviar Cotización a WhatsApp (+51 929 198 813)</span>
                    `;
                }
            }
        });
    }

    // Inicializar resumen inicial
    updateSummary();
});
