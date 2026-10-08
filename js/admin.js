/**
 * SERVICIOSWEB - Lógica del Panel de Administración
 * Monitoreo de Prospectos en Neon PostgreSQL y Configuración de WhatsApp
 */

document.addEventListener('DOMContentLoaded', () => {
    let currentAuthPin = sessionStorage.getItem('admin_session_pin') || '';

    const pinModal = document.getElementById('pin-lock-modal');
    const dashboard = document.getElementById('admin-dashboard');
    const pinForm = document.getElementById('pin-form');
    const pinInput = document.getElementById('admin-pin-input');
    const pinError = document.getElementById('pin-error-msg');
    const btnLogout = document.getElementById('btn-logout');

    const leadsTbody = document.getElementById('leads-table-body');
    const filterStatusSelect = document.getElementById('filter-lead-status');
    const btnRefresh = document.getElementById('btn-refresh-leads');
    const configForm = document.getElementById('admin-config-form');

    // Métricas
    const statTotal = document.getElementById('stat-total-leads');
    const statWeb = document.getElementById('stat-web-leads');
    const statCat = document.getElementById('stat-catalogo-leads');
    const statRedes = document.getElementById('stat-redes-leads');

    // Comprobar sesión
    if (currentAuthPin) {
        unlockDashboard();
    }

    // Formulario de PIN
    pinForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredPin = pinInput.value.trim();

        // Validación inicial con PIN predeterminado 1234
        if (enteredPin === '1234' || currentAuthPin === enteredPin) {
            currentAuthPin = enteredPin;
            sessionStorage.setItem('admin_session_pin', enteredPin);
            unlockDashboard();
        } else {
            pinError.style.display = 'block';
            pinInput.value = '';
            pinInput.focus();
        }
    });

    btnLogout?.addEventListener('click', () => {
        sessionStorage.removeItem('admin_session_pin');
        currentAuthPin = '';
        pinModal.style.display = 'flex';
        dashboard.style.display = 'none';
        pinInput.value = '';
    });

    function unlockDashboard() {
        pinModal.style.display = 'none';
        dashboard.style.display = 'block';
        loadLeads();
        loadConfig();
    }

    async function loadLeads() {
        leadsTbody.innerHTML = `
            <tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--text-dim);">Cargando solicitudes desde Neon PostgreSQL...</td></tr>
        `;

        const statusFilter = filterStatusSelect?.value || '';
        const url = `/api/leads${statusFilter ? `?status=${statusFilter}` : ''}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (data.success && data.leads) {
                renderLeads(data.leads);
                updateStats(data.stats, data.leads);
            } else {
                throw new Error(data.error || 'Error al obtener datos');
            }
        } catch (err) {
            console.warn('Usando datos de demostración o locales:', err.message);
            // Si la base está vacía o sin conexión en desarrollo local, mostrar mensaje informativo
            leadsTbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:2rem; color:var(--text-muted);">
                        No hay solicitudes registradas aún o la base de datos se está inicializando. <br>
                        ¡Las cotizaciones enviadas desde la web aparecerán aquí automáticamente!
                    </td>
                </tr>
            `;
            statTotal.textContent = "0";
            statWeb.textContent = "0";
            statCat.textContent = "0";
            statRedes.textContent = "0";
        }
    }

    function renderLeads(leads) {
        if (!leads || leads.length === 0) {
            leadsTbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:2rem; color:var(--text-dim);">
                        No se encontraron solicitudes registradas con este filtro.
                    </td>
                </tr>
            `;
            return;
        }

        leadsTbody.innerHTML = leads.map(l => {
            const dateStr = l.created_at ? new Date(l.created_at).toLocaleDateString('es-PE', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            }) : 'Reciente';

            const cleanPhone = (l.whatsapp || '').replace(/\D/g, '');
            const phoneDisplay = cleanPhone.startsWith('51') ? `+${cleanPhone}` : `+51 ${cleanPhone}`;
            const waLink = `https://wa.me/${cleanPhone.startsWith('51') ? cleanPhone : '51' + cleanPhone}?text=${encodeURIComponent(`¡Hola ${l.name}! Nos comunicamos de SERVICIOSWEB sobre tu consulta para ${l.service_type}.`)}`;

            return `
                <tr>
                    <td style="font-weight:700; color:var(--neon-cyan);">#${l.id}</td>
                    <td>
                        <strong style="color:#fff;">${escapeHtml(l.name)}</strong>
                        ${l.business_type ? `<div style="font-size:0.75rem; color:var(--text-dim);">${escapeHtml(l.business_type)}</div>` : ''}
                    </td>
                    <td>
                        <span style="font-weight:600; color:#e2e8f0;">${escapeHtml(l.service_type)}</span>
                    </td>
                    <td>
                        <a href="${waLink}" target="_blank" class="btn-table-wa">
                            <span>💬 ${phoneDisplay}</span>
                        </a>
                    </td>
                    <td><span style="color:var(--accent-amber); font-weight:700;">${escapeHtml(l.budget || 'Por definir')}</span></td>
                    <td style="max-width:220px; font-size:0.8rem; color:var(--text-muted); word-break:break-word;">
                        ${escapeHtml(l.details || 'Sin detalles adicionales')}
                    </td>
                    <td style="font-size:0.78rem; color:var(--text-dim);">${dateStr}</td>
                    <td>
                        <select class="form-select status-select" data-lead-id="${l.id}" style="padding:0.25rem 0.6rem; font-size:0.78rem; width:auto;">
                            <option value="nuevo" ${l.status === 'nuevo' ? 'selected' : ''}>Nuevo</option>
                            <option value="contactado" ${l.status === 'contactado' ? 'selected' : ''}>Contactado</option>
                            <option value="cerrado" ${l.status === 'cerrado' ? 'selected' : ''}>Cerrado</option>
                        </select>
                    </td>
                    <td>
                        <a href="${waLink}" target="_blank" class="btn btn-wa btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem;">
                            Contactar
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        // Manejar cambio de estado
        document.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', async (e) => {
                const leadId = e.target.getAttribute('data-lead-id');
                const newStatus = e.target.value;
                try {
                    await fetch('/api/leads', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: leadId, status: newStatus })
                    });
                } catch (err) {
                    console.error('Error actualizando estado:', err);
                }
            });
        });
    }

    function updateStats(stats, leads) {
        if (stats) {
            statTotal.textContent = stats.total || leads.length || 0;
            statWeb.textContent = stats.web_count || 0;
            statCat.textContent = stats.catalogo_count || 0;
            statRedes.textContent = stats.redes_count || 0;
        } else {
            statTotal.textContent = leads.length;
            statWeb.textContent = leads.filter(l => (l.service_type || '').toLowerCase().includes('web')).length;
            statCat.textContent = leads.filter(l => (l.service_type || '').toLowerCase().includes('catálogo')).length;
            statRedes.textContent = leads.filter(l => (l.service_type || '').toLowerCase().includes('redes')).length;
        }
    }

    async function loadConfig() {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data.success && data.config) {
                const waNum = document.getElementById('config-wa-number');
                const waDisp = document.getElementById('config-wa-display');
                if (waNum) waNum.value = data.config.whatsappNumber || '51929198813';
                if (waDisp) waDisp.value = data.config.whatsappDisplay || '+51 929 198 813';
            }
        } catch (err) {
            console.warn('Error cargando configuración:', err);
        }
    }

    configForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const waNumber = document.getElementById('config-wa-number').value.trim();
        const waDisplay = document.getElementById('config-wa-display').value.trim();
        const newPin = document.getElementById('config-new-pin').value.trim();

        try {
            const payload = {
                pin: currentAuthPin,
                newConfig: {
                    whatsappNumber: waNumber,
                    whatsappDisplay: waDisplay
                }
            };
            if (newPin) payload.newConfig.newPin = newPin;

            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert('Configuración guardada exitosamente en Neon PostgreSQL.');
                if (newPin) {
                    currentAuthPin = newPin;
                    sessionStorage.setItem('admin_session_pin', newPin);
                }
            } else {
                alert(data.error || 'Error al guardar');
            }
        } catch (err) {
            alert('Error al conectar con la base de datos.');
        }
    });

    filterStatusSelect?.addEventListener('change', loadLeads);
    btnRefresh?.addEventListener('click', loadLeads);

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
