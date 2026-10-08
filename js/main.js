/**
 * SERVICIOSWEB - Script Principal
 * Interactividad de UI: Navegación, Filtros de Portafolio, FAQ Accordions, Animaciones
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Navbar con efecto blur al hacer scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }
    });

    // 2. Filtros de Portafolio
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioCards = document.querySelectorAll('.portfolio-card');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter') || 'all';

            portfolioCards.forEach(card => {
                const category = card.getAttribute('data-category') || '';
                if (filterValue === 'all' || category === filterValue) {
                    card.style.display = 'flex';
                    card.style.animation = 'fadeInCard 0.4s ease forwards';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // 3. Acordeón de Preguntas Frecuentes (FAQ)
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question?.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            // Cerrar los demás acordeones para mantener orden
            faqItems.forEach(i => i.classList.remove('open'));

            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });

    // 4. Smooth scroll para enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '') return;
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // 5. Carga dinámica de precios y WhatsApp desde Neon PostgreSQL
    async function syncDynamicConfig() {
        if (!window.API) return;
        try {
            const data = await window.API.getConfig();
            if (data.success && data.config) {
                const cfg = data.config;

                // Actualizar WhatsApp si se modificó en el panel
                if (cfg.whatsappNumber) {
                    window.API.WHATSAPP_NUMBER = cfg.whatsappNumber;
                }

                // Actualizar precios dinámicos desde Neon
                if (cfg.prices) {
                    const p = cfg.prices;

                    const priceWeb = document.getElementById('price-web-display');
                    const noteWeb = document.getElementById('note-web-display');
                    if (priceWeb && p.webPrice) priceWeb.textContent = p.webPrice;
                    if (noteWeb && p.webNote) noteWeb.textContent = p.webNote;

                    const priceCat = document.getElementById('price-cat-display');
                    const noteCat = document.getElementById('note-cat-display');
                    if (priceCat && p.catalogoPrice) priceCat.textContent = p.catalogoPrice;
                    if (noteCat && p.catalogoNote) noteCat.textContent = p.catalogoNote;

                    const priceRedes = document.getElementById('price-redes-display');
                    const noteRedes = document.getElementById('note-redes-display');
                    if (priceRedes && p.redesPrice) priceRedes.textContent = p.redesPrice;
                    if (noteRedes && p.redesNote) noteRedes.textContent = p.redesNote;
                }
            }
        } catch (err) {
            console.warn('Usando configuración predeterminada:', err);
        }
    }

    syncDynamicConfig();

    console.log('⚡ SERVICIOSWEB inicializado exitosamente.');
});
