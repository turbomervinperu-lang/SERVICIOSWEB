/**
 * SERVICIOSWEB - Widget Flotante de WhatsApp
 * Número: 929198813 (Internacional: +51 929198813)
 */

document.addEventListener('DOMContentLoaded', () => {
    const waTrigger = document.getElementById('wa-floating-trigger');
    const waPopup = document.getElementById('wa-popup-card');
    const waClose = document.getElementById('wa-close-btn');
    const waChips = document.querySelectorAll('.wa-chip-btn');

    const OFFICIAL_PHONE = "51929198813";

    if (waTrigger && waPopup) {
        waTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            waPopup.classList.toggle('open');
        });
    }

    if (waClose && waPopup) {
        waClose.addEventListener('click', (e) => {
            e.stopPropagation();
            waPopup.classList.remove('open');
        });
    }

    // Cerrar al hacer clic fuera del popup
    document.addEventListener('click', (e) => {
        if (waPopup && waPopup.classList.contains('open') && !waPopup.contains(e.target) && e.target !== waTrigger) {
            waPopup.classList.remove('open');
        }
    });

    // Opciones rápidas de consulta
    waChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const topic = chip.getAttribute('data-topic') || 'informacion';
            let message = "¡Hola SERVICIOSWEB! 👋 ";

            switch (topic) {
                case 'web':
                    message += "Estoy interesado en cotizar el diseño y desarrollo de una *Página Web* para mi empresa o negocio. ¿Cuáles son los planes y tiempos de entrega?";
                    break;
                case 'catalogo':
                    message += "¡Hola! Me gustaría crear un *Catálogo Digital Interactivo* con carrito de compras y pedidos directos a WhatsApp, similar al modelo de Tecnosistemas MDOS. ¿Cómo podemos empezar?";
                    break;
                case 'redes':
                    message += "¡Hola! Necesito apoyo en el *Manejo de mis Redes Sociales* (creación de contenido, diseño gráfico, reels y campañas publicitarias para vender más). ¿Podrían darme información?";
                    break;
                case 'asesor':
                default:
                    message += "¡Hola! Me gustaría hablar directamente con un asesor para comentarle sobre un proyecto especial que tengo en mente.";
                    break;
            }

            const waUrl = `https://wa.me/${OFFICIAL_PHONE}?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');
            waPopup.classList.remove('open');
        });
    });

    // Enlazar todos los botones con la clase `btn-wa-direct`
    const directWaBtns = document.querySelectorAll('.btn-wa-direct');
    directWaBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const service = btn.getAttribute('data-service') || 'General';
            let msg = `👋 ¡Hola SERVICIOSWEB! Deseo información y cotización sobre el servicio de: *${service}*.`;
            window.open(`https://wa.me/${OFFICIAL_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
        });
    });
});
