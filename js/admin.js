/**
 * SERVICIOSWEB - Lógica del Panel de Administración con Menú Lateral
 * Gestión de Prospectos en Neon PostgreSQL y Modificación de Precios en Vivo
 */

document.addEventListener('DOMContentLoaded', () => {
    let currentAuthPin = sessionStorage.getItem('admin_session_pin') || '';

    // Elementos de Autenticación
    const pinModal = document.getElementById('pin-lock-modal');
    const dashboard = document.getElementById('admin-dashboard');
    const pinForm = document.getElementById('pin-form');
    const pinInput = document.getElementById('admin-pin-input');
    const pinError = document.getElementById('pin-error-msg');
    const btnLogout = document.getElementById('btn-logout');

    // Elementos de Navegación Lateral (Sidebar)
    const sidebarNavItems = document.querySelectorAll('.sidebar-nav-item');
    const tabPanes = document.querySelectorAll('.admin-tab-pane');
    const currentSectionTitle = document.getElementById('admin-current-section-title');
    const currentSectionDesc = document.getElementById('admin-current-section-desc');
    const sidebarCounterLeads = document.getElementById('sidebar-counter-leads');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const adminSidebar = document.getElementById('admin-sidebar');
    const btnRefresh = document.getElementById('btn-refresh-data');

    // Elementos de Leads
    const leadsTbody = document.getElementById('leads-table-body');
    const filterStatusSelect = document.getElementById('filter-lead-status');
    const statTotal = document.getElementById('stat-total-leads');
    const statNew = document.getElementById('stat-new-leads');
    const statWeb = document.getElementById('stat-web-leads');
    const statCatRedes = document.getElementById('stat-cat-redes-leads');

    // Elementos de Editor de Precios
    const formPrices = document.getElementById('form-manage-prices');
    const priceWebVal = document.getElementById('price-web-val');
    const priceWebNote = document.getElementById('price-web-note');
    const priceCatVal = document.getElementById('price-cat-val');
    const priceCatNote = document.getElementById('price-cat-note');
    const priceRedesVal = document.getElementById('price-redes-val');
    const priceRedesNote = document.getElementById('price-redes-note');
    const pricePackVal = document.getElementById('price-pack-val');
    const pricePackNote = document.getElementById('price-pack-note');
    const btnSavePrices = document.getElementById('btn-save-prices');

    // Elementos de Configuración General
    const configForm = document.getElementById('admin-config-form');
    const configWaNumber = document.getElementById('config-wa-number');
    const configWaDisplay = document.getElementById('config-wa-display');
    const configAgencyName = document.getElementById('config-agency-name');
    const configNewPin = document.getElementById('config-new-pin');
    const topbarWaLabel = document.getElementById('topbar-wa-label');

    // 1. COMPROBAR SESIÓN INICIAL
    if (currentAuthPin) {
        unlockDashboard();
    }

    // 2. VALIDAR PIN
    pinForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredPin = pinInput.value.trim();

        // Pin predeterminado 1234 o pin autenticado
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
        dashboard.style.display = 'flex';
        loadLeads();
        loadConfig();
    }

    // 3. NAVEGACIÓN ENTRE SECCIONES DEL MENÚ LATERAL (SIDEBAR TABS)
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTabId = item.getAttribute('data-tab');

            // Quitar clase activa
            sidebarNavItems.forEach(i => i.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Activar item y pestaña seleccionada
            item.classList.add('active');
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) targetPane.classList.add('active');

            // Actualizar encabezado superior
            switch (targetTabId) {
                case 'tab-clientes':
                    currentSectionTitle.textContent = "Registros de Clientes";
                    currentSectionDesc.textContent = "Listado en tiempo real de prospectos y solicitudes que han cotizado en la web.";
                    loadLeads();
                    break;
                case 'tab-precios':
                    currentSectionTitle.textContent = "Modificación de Precios";
                    currentSectionDesc.textContent = "Configura los precios y notas que tus clientes verán en la página web principal.";
                    loadConfig();
                    break;
                case 'tab-configuracion':
                    currentSectionTitle.textContent = "Configurar WhatsApp & Datos";
                    currentSectionDesc.textContent = "Número oficial receptor de solicitudes, nombre de la agencia y seguridad.";
                    loadConfig();
                    break;
                case 'tab-metricas':
                    currentSectionTitle.textContent = "Métricas & Diagnóstico";
                    currentSectionDesc.textContent = "Estado de salud de Neon PostgreSQL y Cloudflare R2.";
                    break;
            }

            // En móvil, cerrar sidebar al seleccionar pestaña
            if (window.innerWidth <= 860) {
                adminSidebar?.classList.remove('open');
            }
        });
    });

    // Alternar menú lateral en pantallas pequeñas
    sidebarToggleBtn?.addEventListener('click', () => {
        adminSidebar?.classList.toggle('open');
    });

    // 4. CARGA DE PROSPECTOS / LEADS DESDE NEON POSTGRESQL
    async function loadLeads() {
        leadsTbody.innerHTML = `
            <tr><td colspan="9" style="text-align:center; padding:3rem; color:var(--text-dim);">Cargando registros desde Neon PostgreSQL...</td></tr>
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
                throw new Error(data.error || 'Error al obtener registros');
            }
        } catch (err) {
            console.warn('Advertencia al consultar base de datos:', err.message);
            leadsTbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:3rem; color:var(--text-muted);">
                        No hay solicitudes registradas con este filtro. <br>
                        ¡Cada vez que un cliente cotice en la web, su registro aparecerá aquí al instante!
                    </td>
                </tr>
            `;
            statTotal.textContent = "0";
            statNew.textContent = "0";
            statWeb.textContent = "0";
            statCatRedes.textContent = "0";
            sidebarCounterLeads.textContent = "0";
        }
    }

    function renderLeads(leads) {
        if (!leads || leads.length === 0) {
            leadsTbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:3rem; color:var(--text-dim);">
                        No se encontraron registros de clientes con este filtro.
                    </td>
                </tr>
            `;
            return;
        }

        leadsTbody.innerHTML = leads.map(l => {
            const dateStr = l.created_at ? new Date(l.created_at).toLocaleDateString('es-PE', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Reciente';

            const cleanPhone = (l.whatsapp || '').replace(/\D/g, '');
            const phoneDisplay = cleanPhone.startsWith('51') ? `+${cleanPhone}` : `+51 ${cleanPhone}`;
            const targetPhone = cleanPhone.startsWith('51') ? cleanPhone : '51' + cleanPhone;
            const waLink = `https://wa.me/${targetPhone}?text=${encodeURIComponent(`👋 ¡Hola ${l.name}! Nos comunicamos de SERVICIOSWEB respecto a tu consulta sobre ${l.service_type}. ¿Podemos coordinar los detalles?`)}`;

            return `
                <tr>
                    <td style="font-weight:800; color:var(--neon-cyan);">#${l.id}</td>
                    <td>
                        <strong style="color:#fff; font-size:0.95rem;">${escapeHtml(l.name)}</strong>
                        ${l.business_type ? `<div style="font-size:0.75rem; color:var(--text-dim);">🏢 ${escapeHtml(l.business_type)}</div>` : ''}
                    </td>
                    <td>
                        <span style="font-weight:600; color:#e2e8f0;">${escapeHtml(l.service_type)}</span>
                    </td>
                    <td>
                        <a href="${waLink}" target="_blank" class="btn-table-wa" title="Abrir chat en WhatsApp">
                            <span>💬 ${phoneDisplay}</span>
                        </a>
                    </td>
                    <td><span style="color:var(--accent-amber); font-weight:700;">${escapeHtml(l.budget || 'Por definir')}</span></td>
                    <td style="max-width:240px; font-size:0.8rem; color:var(--text-muted); word-break:break-word;">
                        ${escapeHtml(l.details || 'Sin especificaciones adicionales')}
                    </td>
                    <td style="font-size:0.78rem; color:var(--text-dim); white-space:nowrap;">${dateStr}</td>
                    <td>
                        <select class="form-select status-select" data-lead-id="${l.id}" style="padding:0.25rem 0.6rem; font-size:0.78rem; width:auto;">
                            <option value="nuevo" ${l.status === 'nuevo' ? 'selected' : ''}>Nuevo</option>
                            <option value="contactado" ${l.status === 'contactado' ? 'selected' : ''}>Contactado</option>
                            <option value="cerrado" ${l.status === 'cerrado' ? 'selected' : ''}>Cerrado</option>
                        </select>
                    </td>
                    <td>
                        <a href="${waLink}" target="_blank" class="btn btn-wa btn-sm" style="padding:0.35rem 0.75rem; font-size:0.75rem; white-space:nowrap;">
                            Chatear &rarr;
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        // Listener para cambiar estado del lead
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
                    console.error('Error al actualizar estado:', err);
                }
            });
        });
    }

    function updateStats(stats, leads) {
        const total = stats?.total || leads.length || 0;
        const newCount = stats?.new_count || leads.filter(l => l.status === 'nuevo').length || 0;
        const webCount = stats?.web_count || leads.filter(l => (l.service_type || '').toLowerCase().includes('web')).length || 0;
        const catCount = stats?.catalogo_count || leads.filter(l => (l.service_type || '').toLowerCase().includes('catálogo')).length || 0;
        const redesCount = stats?.redes_count || leads.filter(l => (l.service_type || '').toLowerCase().includes('redes')).length || 0;

        statTotal.textContent = total;
        statNew.textContent = newCount;
        statWeb.textContent = webCount;
        statCatRedes.textContent = catCount + redesCount;
        sidebarCounterLeads.textContent = total;
    }

    // 5. CARGA Y EDICIÓN DE PRECIOS & CONFIGURACIÓN
    async function loadConfig() {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data.success && data.config) {
                const cfg = data.config;

                // Datos de WhatsApp y Agencia
                if (configWaNumber) configWaNumber.value = cfg.whatsappNumber || '51929198813';
                if (configWaDisplay) configWaDisplay.value = cfg.whatsappDisplay || '+51 929 198 813';
                if (configAgencyName) configAgencyName.value = cfg.agencyName || 'SERVICIOSWEB';
                if (topbarWaLabel) topbarWaLabel.textContent = cfg.whatsappDisplay || '+51 929 198 813';

                // Precios de Servicios
                const p = cfg.prices || {};
                if (priceWebVal) priceWebVal.value = p.webPrice || 'A Cotizar';
                if (priceWebNote) priceWebNote.value = p.webNote || 'Planes a medida';

                if (priceCatVal) priceCatVal.value = p.catalogoPrice || 'A Cotizar';
                if (priceCatNote) priceCatNote.value = p.catalogoNote || 'Planes según productos';

                if (priceRedesVal) priceRedesVal.value = p.redesPrice || 'A Cotizar';
                if (priceRedesNote) priceRedesNote.value = p.redesNote || 'Planes mensuales';

                if (pricePackVal) pricePackVal.value = p.packPrice || 'A Cotizar';
                if (pricePackNote) pricePackNote.value = p.packNote || 'Todo en Uno';
            }
        } catch (err) {
            console.warn('Error al cargar configuración:', err);
        }
    }

    // Guardar Precios
    formPrices?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (btnSavePrices) {
            btnSavePrices.disabled = true;
            btnSavePrices.textContent = "Guardando en Neon PostgreSQL...";
        }

        const updatedPrices = {
            webPrice: priceWebVal.value.trim(),
            webNote: priceWebNote.value.trim(),
            catalogoPrice: priceCatVal.value.trim(),
            catalogoNote: priceCatNote.value.trim(),
            redesPrice: priceRedesVal.value.trim(),
            redesNote: priceRedesNote.value.trim(),
            packPrice: pricePackVal.value.trim(),
            packNote: pricePackNote.value.trim()
        };

        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pin: currentAuthPin,
                    newConfig: {
                        prices: updatedPrices
                    }
                })
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ ¡Precios actualizados con éxito en Neon PostgreSQL! Ahora se verán reflejados en tu página web.');
            } else {
                alert('❌ Error: ' + (result.error || 'No se pudo guardar'));
            }
        } catch (err) {
            alert('❌ Error de conexión al guardar los precios.');
        } finally {
            if (btnSavePrices) {
                btnSavePrices.disabled = false;
                btnSavePrices.innerHTML = `<span>💾 Guardar Precios en la Base de Datos</span>`;
            }
        }
    });

    // Guardar Configuración de WhatsApp y PIN
    configForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const waNum = configWaNumber.value.trim();
        const waDisp = configWaDisplay.value.trim();
        const agName = configAgencyName.value.trim();
        const newPin = configNewPin.value.trim();

        try {
            const payload = {
                pin: currentAuthPin,
                newConfig: {
                    whatsappNumber: waNum,
                    whatsappDisplay: waDisp,
                    agencyName: agName
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
                alert('✅ Configuración guardada exitosamente en Neon PostgreSQL.');
                if (topbarWaLabel) topbarWaLabel.textContent = waDisp;
                if (newPin) {
                    currentAuthPin = newPin;
                    sessionStorage.setItem('admin_session_pin', newPin);
                    configNewPin.value = '';
                }
            } else {
                alert('❌ ' + (data.error || 'Error al guardar'));
            }
        } catch (err) {
            alert('❌ Error de conexión al guardar configuración.');
        }
    });

    filterStatusSelect?.addEventListener('change', loadLeads);
    btnRefresh?.addEventListener('click', () => {
        loadLeads();
        loadConfig();
    });

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
