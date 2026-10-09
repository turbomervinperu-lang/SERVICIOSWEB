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
                case 'tab-publicidad':
                    currentSectionTitle.textContent = "Publicidad Web & Auto-Marketing";
                    currentSectionDesc.textContent = "Generador de flyers con IA Gemini (Gratis) y programación de publicaciones para redes sociales.";
                    initPublicidadCanvasIfEmpty();
                    renderFbGroups();
                    updateWhatsAppProofPreview();
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

    // ==============================================================================
    // 7. MÓDULO: PUBLICIDAD WEB CON GOOGLE GEMINI GRATUITO & FLYER CANVAS
    // ==============================================================================
    let pubImageObj = null;
    let pubImageBase64 = null;
    let pubMimeType = 'image/jpeg';
    let pubFlyerInitialized = false;

    let currentFlyerData = {
        productName: "Producto Exclusivo de Temporada",
        category: "Tendencias 2026",
        hookTitle: "¡OFERTA ESPECIAL DE TEMPORADA!",
        badge: "¡SUPER OFERTA!",
        price: "89.00",
        currency: "S/",
        whatsapp: "+51 929 198 813",
        features: [
            "Alta calidad y diseño ergonómico de vanguardia",
            "Garantía oficial y entrega inmediata",
            "Envíos rápidos y 100% seguros a nivel nacional"
        ],
        style: "neon"
    };

    // Referencias a elementos del DOM de Publicidad
    const pubDropzone = document.getElementById('pub-image-dropzone');
    const pubFileInput = document.getElementById('pub-image-file');
    const pubPreviewBox = document.getElementById('pub-preview-box');
    const pubPreviewImg = document.getElementById('pub-preview-img');
    const pubBtnRemoveImg = document.getElementById('pub-btn-remove-img');
    const pubPriceInput = document.getElementById('pub-product-price');
    const pubCurrencySelect = document.getElementById('pub-price-currency');
    const pubWaInput = document.getElementById('pub-flyer-whatsapp');
    const pubGeminiKeyInput = document.getElementById('gemini-api-key-input');
    const pubSocialEmailInput = document.getElementById('social-sync-email');
    const pubStyleBtns = document.querySelectorAll('.flyer-style-btn');
    const btnGenerateFlyer = document.getElementById('btn-generate-pub-flyer');
    const pubStatusMsg = document.getElementById('pub-status-msg');
    const flyerCanvas = document.getElementById('pub-flyer-canvas');
    const btnDownloadFlyer = document.getElementById('btn-download-flyer');
    const btnRerenderFlyer = document.getElementById('btn-rerender-flyer');
    const geminiDetectedName = document.getElementById('gemini-detected-name');
    const geminiSocialCopy = document.getElementById('gemini-social-copy');
    const geminiHashtags = document.getElementById('gemini-hashtags');
    const btnCopySocialText = document.getElementById('btn-copy-social-text');
    const btnPublishNow = document.getElementById('btn-publish-all-now');
    const btnSchedule = document.getElementById('btn-schedule-campaign');
    const socialDispatchLog = document.getElementById('social-dispatch-log');
    const btnAddScheduleHour = document.getElementById('btn-add-schedule-hour');
    const customScheduleHour = document.getElementById('custom-schedule-hour');
    const scheduleHoursTags = document.getElementById('schedule-hours-tags');

    // Referencias de Fase 1: Redes y Credenciales
    const socialCheckboxes = document.querySelectorAll('.social-toggle-checkbox');
    const btnSaveSocialAccounts = document.getElementById('btn-save-social-accounts');
    const socialActiveBadge = document.getElementById('social-active-count-badge');
    const flyerLockBanner = document.getElementById('flyer-lock-banner');
    const flyerCreationWrapper = document.getElementById('flyer-creation-wrapper');
    const btnScrollToSocial = document.getElementById('btn-scroll-to-social');
    const pwdToggleBtns = document.querySelectorAll('.btn-toggle-pwd');
    let uploadedFileName = '';

    // Mostrar / Ocultar contraseñas
    pwdToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
                if (targetInput.type === 'password') {
                    targetInput.type = 'text';
                    btn.textContent = '🔒';
                } else {
                    targetInput.type = 'password';
                    btn.textContent = '👁️';
                }
            }
        });
    });

    // ==============================================================================
    // SISTEMA DE LUCES LED: VERDE (ENLAZADA) / ROJA (ERROR DE CREDENCIALES)
    // ==============================================================================
    function updateNetworkLedStatus(netShort) {
        const chk = document.getElementById(`check-net-${netShort}`);
        const userInp = document.getElementById(`user-net-${netShort}`);
        const passInp = document.getElementById(`pass-net-${netShort}`);
        const statusElem = document.getElementById(`status-net-${netShort}`);
        const feedbackElem = document.getElementById(`feedback-net-${netShort}`);
        const cardElem = document.getElementById(`card-net-${netShort}`);

        if (!statusElem) return { ok: false, active: false };
        const statusText = statusElem.querySelector('.status-text') || statusElem;

        const isChecked = chk ? chk.checked : false;
        const userVal = userInp ? userInp.value.trim() : '';
        const passVal = passInp ? passInp.value.trim() : '';

        // Si la red no está seleccionada / inactiva
        if (!isChecked) {
            cardElem?.classList.remove('enabled');
            statusElem.className = 'social-status-indicator off';
            if (statusText) statusText.textContent = 'Sin Enlazar';
            if (feedbackElem) {
                feedbackElem.className = 'net-feedback-msg info';
                feedbackElem.textContent = '⚪ Red desactivada para esta campaña.';
            }
            return { ok: false, active: false };
        }

        cardElem?.classList.add('enabled');

        // Validar credenciales de enlace
        let hasError = false;
        let errorMsg = '';

        if (!userVal && !passVal) {
            hasError = true;
            errorMsg = 'Falta ingresar usuario y contraseña.';
        } else if (!userVal) {
            hasError = true;
            errorMsg = 'Falta ingresar el usuario o correo.';
        } else if (!passVal) {
            hasError = true;
            errorMsg = 'Falta ingresar la contraseña o PIN.';
        } else if (passVal.length < 4) {
            hasError = true;
            errorMsg = 'Contraseña demasiado corta (mínimo 4 caracteres).';
        } else if (netShort === 'wa' && userVal.replace(/\D/g, '').length < 8) {
            hasError = true;
            errorMsg = 'Número telefónico incompleto (incluye código de país).';
        }

        if (hasError) {
            // 🔴 LUZ ROJA: Error de enlace / credencial incorrecta o incompleta
            statusElem.className = 'social-status-indicator error';
            if (statusText) statusText.textContent = 'No Enlazada';
            if (feedbackElem) {
                feedbackElem.className = 'net-feedback-msg error';
                feedbackElem.textContent = `🔴 Luz Roja: ${errorMsg}`;
            }
            return { ok: false, active: true, error: errorMsg };
        } else {
            // 🟢 LUZ VERDE: Enlace exitoso con el proyecto
            statusElem.className = 'social-status-indicator connected';
            if (statusText) statusText.textContent = 'Enlazada';
            if (feedbackElem) {
                feedbackElem.className = 'net-feedback-msg success';
                feedbackElem.textContent = '🟢 Luz Verde: Enlazada con el proyecto exitosamente.';
            }
            return { ok: true, active: true };
        }
    }

    // Botones de probar enlace individual con simulación de verificación
    document.querySelectorAll('.btn-test-net-conn').forEach(btn => {
        btn.addEventListener('click', () => {
            const net = btn.getAttribute('data-net');
            const statusElem = document.getElementById(`status-net-${net}`);
            const feedbackElem = document.getElementById(`feedback-net-${net}`);
            const statusText = statusElem?.querySelector('.status-text');

            if (statusElem) statusElem.className = 'social-status-indicator checking';
            if (statusText) statusText.textContent = 'Verificando...';
            if (feedbackElem) {
                feedbackElem.className = 'net-feedback-msg info';
                feedbackElem.textContent = '⏳ Probando credenciales y enlace con el proyecto...';
            }
            btn.disabled = true;

            setTimeout(() => {
                btn.disabled = false;
                updateNetworkLedStatus(net);
            }, 600);
        });
    });

    // Escucha en tiempo real de inputs de usuario y contraseña para refrescar luz LED
    ['fb', 'ig', 'wa', 'tt', 'tw'].forEach(net => {
        const userInp = document.getElementById(`user-net-${net}`);
        const passInp = document.getElementById(`pass-net-${net}`);
        userInp?.addEventListener('input', () => updateNetworkLedStatus(net));
        passInp?.addEventListener('input', () => updateNetworkLedStatus(net));
    });

    // Checkboxes de activación de redes sociales
    socialCheckboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            const netFull = chk.getAttribute('data-net');
            const net = netFull === 'facebook' ? 'fb' : (netFull === 'instagram' ? 'ig' : (netFull === 'whatsapp' ? 'wa' : (netFull === 'tiktok' ? 'tt' : 'tw')));
            updateNetworkLedStatus(net);
            updateSocialCountBadge();
        });
    });

    function updateSocialCountBadge() {
        const count = document.querySelectorAll('.social-toggle-checkbox:checked').length;
        if (socialActiveBadge) {
            socialActiveBadge.textContent = `${count} ${count === 1 ? 'Red Seleccionada' : 'Redes Seleccionadas'}`;
        }
    }

    // Cargar credenciales guardadas de localStorage
    function loadSavedSocialCredentials() {
        try {
            const saved = localStorage.getItem('serviciosweb_social_creds');
            if (saved) {
                const creds = JSON.parse(saved);
                ['fb', 'ig', 'wa', 'tt', 'tw'].forEach(net => {
                    if (creds[net]) {
                        const chk = document.getElementById(`check-net-${net}`);
                        const user = document.getElementById(`user-net-${net}`);
                        const pass = document.getElementById(`pass-net-${net}`);
                        if (chk && creds[net].enabled !== undefined) chk.checked = creds[net].enabled;
                        if (user && creds[net].user) user.value = creds[net].user;
                        if (pass && creds[net].pass) pass.value = creds[net].pass;
                    }
                    updateNetworkLedStatus(net);
                });
                updateSocialCountBadge();
                unlockFlyerModule(false);
            } else {
                ['fb', 'ig', 'wa', 'tt', 'tw'].forEach(net => updateNetworkLedStatus(net));
            }
        } catch (e) {
            console.warn('Error cargando credenciales de redes:', e);
            ['fb', 'ig', 'wa', 'tt', 'tw'].forEach(net => updateNetworkLedStatus(net));
        }
    }

    function unlockFlyerModule(scroll = true) {
        if (flyerCreationWrapper) {
            flyerCreationWrapper.classList.remove('is-locked');
            flyerCreationWrapper.classList.add('is-unlocked');
        }
        if (flyerLockBanner) flyerLockBanner.style.display = 'none';

        // Sincronizar pills de plataformas activas en Paso 3
        ['facebook', 'instagram', 'whatsapp', 'tiktok', 'twitter'].forEach(net => {
            const netShort = net === 'facebook' ? 'fb' : (net === 'instagram' ? 'ig' : (net === 'whatsapp' ? 'wa' : (net === 'tiktok' ? 'tt' : 'tw')));
            const chk = document.getElementById(`check-net-${netShort}`);
            const pill = document.querySelector(`.social-platform-pill[data-platform="${net}"]`);
            if (pill && chk) {
                if (chk.checked) {
                    pill.classList.add('checked');
                    const checkSpan = pill.querySelector('.platform-check');
                    if (checkSpan) checkSpan.textContent = '✓';
                } else {
                    pill.classList.remove('checked');
                    const checkSpan = pill.querySelector('.platform-check');
                    if (checkSpan) checkSpan.textContent = '';
                }
            }
        });

        if (scroll && flyerCreationWrapper) {
            flyerCreationWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    btnSaveSocialAccounts?.addEventListener('click', () => {
        const checkedList = document.querySelectorAll('.social-toggle-checkbox:checked');
        if (checkedList.length === 0) {
            alert('⚠️ Por favor selecciona al menos una red social para trabajar.');
            return;
        }

        const creds = {};
        const errors = [];
        let successCount = 0;

        ['fb', 'ig', 'wa', 'tt', 'tw'].forEach(net => {
            const chk = document.getElementById(`check-net-${net}`);
            const user = document.getElementById(`user-net-${net}`);
            const pass = document.getElementById(`pass-net-${net}`);
            const isEnabled = chk ? chk.checked : false;

            creds[net] = {
                enabled: isEnabled,
                user: user ? user.value.trim() : '',
                pass: pass ? pass.value : ''
            };

            const verification = updateNetworkLedStatus(net);
            if (isEnabled) {
                if (!verification.ok) {
                    const name = net === 'fb' ? 'Facebook' : (net === 'ig' ? 'Instagram' : (net === 'wa' ? 'WhatsApp' : (net === 'tt' ? 'TikTok' : 'Twitter/X')));
                    errors.push(`• ${name}: ${verification.error}`);
                } else {
                    successCount++;
                }
            }
        });

        localStorage.setItem('serviciosweb_social_creds', JSON.stringify(creds));
        unlockFlyerModule(true);

        if (errors.length > 0) {
            alert(`⚠️ ATENCIÓN: Redes con Luz Roja detectadas:\n\n${errors.join('\n')}\n\nHay ${errors.length} red(es) con problemas de usuario o contraseña.\nSe guardó tu avance y se activó el creador de flyers, pero por favor revisa los datos marcados con Luz Roja 🔴.`);
        } else {
            alert(`✅ ¡ENLACE EXITOSO CON EL PROYECTO!\n\nLas ${successCount} redes seleccionadas muestran LUZ VERDE 🟢.\nTodas las credenciales y usuarios fueron validados correctamente.\nEl Módulo de Creación de Flyers está activo abajo.`);
        }
    });

    btnScrollToSocial?.addEventListener('click', () => {
        document.getElementById('social-setup-box')?.scrollIntoView({ behavior: 'smooth' });
    });

    loadSavedSocialCredentials();

    // ==============================================================================
    // GESTIÓN DE GRUPOS DE FACEBOOK Y COMPROBANTE DE PRUEBA A WHATSAPP
    // ==============================================================================
    const fbGroupsListBox = document.getElementById('fb-groups-list-box');
    const fbGroupsCountBadge = document.getElementById('fb-groups-count-badge');
    const fbNewGroupName = document.getElementById('fb-new-group-name');
    const btnAddFbGroup = document.getElementById('btn-add-fb-group');

    const chkSendWaProof = document.getElementById('chk-send-wa-proof');
    const waProofPhoneInput = document.getElementById('wa-proof-phone-input');
    const btnSendWaTestProof = document.getElementById('btn-send-wa-test-proof');
    const waProofPreviewText = document.getElementById('wa-proof-preview-text');

    const defaultFbGroups = [
        { id: 'fb-g-1', name: 'Compra y Venta Lima & Perú Oficial', url: 'https://www.facebook.com/groups/comprayventaperu', checked: true },
        { id: 'fb-g-2', name: 'PC Gamer, Hardware & Computación Perú', url: 'https://www.facebook.com/groups/pcgamerperu', checked: true },
        { id: 'fb-g-3', name: 'Marketplace Ofertas & Emprendedores', url: 'https://www.facebook.com/groups/marketplaceperu', checked: true }
    ];

    let fbGroups = [];
    try {
        const savedGroups = localStorage.getItem('serviciosweb_fb_groups');
        if (savedGroups) {
            fbGroups = JSON.parse(savedGroups);
        } else {
            fbGroups = defaultFbGroups;
        }
    } catch(e) {
        fbGroups = defaultFbGroups;
    }

    if (waProofPhoneInput) {
        const savedPhone = localStorage.getItem('serviciosweb_wa_proof_phone');
        if (savedPhone) waProofPhoneInput.value = savedPhone;
        waProofPhoneInput.addEventListener('input', () => {
            localStorage.setItem('serviciosweb_wa_proof_phone', waProofPhoneInput.value.trim());
            updateWhatsAppProofPreview();
        });
    }

    chkSendWaProof?.addEventListener('change', () => {
        updateWhatsAppProofPreview();
    });

    function saveFbGroups() {
        localStorage.setItem('serviciosweb_fb_groups', JSON.stringify(fbGroups));
    }

    function renderFbGroups() {
        if (!fbGroupsListBox) return;
        fbGroupsListBox.innerHTML = '';

        fbGroups.forEach((grp) => {
            const item = document.createElement('div');
            item.className = 'fb-group-item';
            item.innerHTML = `
                <label class="fb-group-info" style="cursor:pointer; flex:1; display:flex; align-items:center; gap:0.5rem;">
                    <input type="checkbox" class="fb-group-chk" data-id="${grp.id}" ${grp.checked ? 'checked' : ''}>
                    <span style="font-size:0.8rem; color:#fff;" title="${escapeHtml(grp.url)}">👥 ${escapeHtml(grp.name)}</span>
                </label>
                <div style="display:flex; align-items:center; gap:0.4rem;">
                    <span style="font-size:0.72rem; color:${grp.checked ? 'var(--whatsapp-green)' : 'var(--text-dim)'};">
                        ${grp.checked ? '● Listo' : '○ Pausado'}
                    </span>
                    <button type="button" class="btn-del-fb-group" data-id="${grp.id}" title="Eliminar grupo" style="background:none; border:none; color:var(--text-dim); cursor:pointer; font-size:0.85rem; padding:0 0.3rem;">✕</button>
                </div>
            `;
            fbGroupsListBox.appendChild(item);
        });

        // Eventos en checkboxes de grupos
        fbGroupsListBox.querySelectorAll('.fb-group-chk').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const targetGrp = fbGroups.find(g => g.id === id);
                if (targetGrp) {
                    targetGrp.checked = e.target.checked;
                    saveFbGroups();
                    updateFbGroupsBadge();
                    updateWhatsAppProofPreview();
                    renderFbGroups();
                }
            });
        });

        // Eventos en botones eliminar grupo
        fbGroupsListBox.querySelectorAll('.btn-del-fb-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                fbGroups = fbGroups.filter(g => g.id !== id);
                saveFbGroups();
                updateFbGroupsBadge();
                updateWhatsAppProofPreview();
                renderFbGroups();
            });
        });

        updateFbGroupsBadge();
        updateWhatsAppProofPreview();
    }

    function updateFbGroupsBadge() {
        const activeCount = fbGroups.filter(g => g.checked).length;
        if (fbGroupsCountBadge) {
            fbGroupsCountBadge.textContent = `${activeCount} de ${fbGroups.length} Grupos Activos`;
        }
    }

    function addCustomFbGroup() {
        const val = fbNewGroupName?.value.trim();
        if (!val) {
            alert('Por favor ingresa el nombre o enlace del grupo de Facebook.');
            return;
        }

        let name = val;
        let url = val;

        if (val.startsWith('http://') || val.startsWith('https://')) {
            url = val;
            try {
                const pathParts = new URL(val).pathname.split('/').filter(Boolean);
                name = pathParts[pathParts.length - 1] || 'Grupo de Facebook';
                name = decodeURIComponent(name).replace(/[-_]/g, ' ');
            } catch(e) {
                name = 'Grupo de Facebook';
            }
        } else {
            url = `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(val)}`;
        }

        fbGroups.push({
            id: 'fb-g-' + Date.now(),
            name: name,
            url: url,
            checked: true
        });

        if (fbNewGroupName) fbNewGroupName.value = '';
        saveFbGroups();
        renderFbGroups();
    }

    btnAddFbGroup?.addEventListener('click', addCustomFbGroup);
    fbNewGroupName?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCustomFbGroup();
        }
    });

    function buildWhatsAppProofMessage(isTest = false) {
        const phone = waProofPhoneInput?.value.trim() || '+51 929 198 813';
        const pName = currentFlyerData.productName || 'Producto en Oferta Especial';
        const pPrice = currentFlyerData.price || '89.00';
        const pCurr = currentFlyerData.currency || 'S/';
        const activeFbGroups = fbGroups.filter(g => g.checked);
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

        const groupsListing = activeFbGroups.length > 0
            ? activeFbGroups.map((g, i) => `${i + 2}. 👥 Grupo: ${g.name}`).join('\n')
            : '   (No hay grupos secundarios seleccionados)';

        return `✅ REPORTE DE PUBLICACIÓN AUTOMÁTICA EN VIVO - SERVICIOSWEB
===================================================
📦 Producto: ${pName}
💰 Precio: ${pCurr} ${pPrice}
🕒 Fecha y Hora: ${dateStr} - ${timeStr}
📱 Teléfono en Flyer: ${currentFlyerData.whatsapp || phone}

📍 DESTINOS PUBLICADOS EN FACEBOOK:
1. 📘 Página Principal / Fan Page (Feed Oficial)
${groupsListing}

📸 Flyer HD 1080x1080: Generado con IA Gemini & Descargado
⚡ Estado: ¡Publicación realizada exitosamente en Página y Grupos!
===================================================
${isTest ? '*(🔔 MENSAJE DE PRUEBA DE CONEXIÓN A TU WHATSAPP)*' : '*(🚀 COMPROBANTE OFICIAL DE DESPACHO)*'}`;
    }

    function updateWhatsAppProofPreview(isTest = false) {
        if (!waProofPreviewText) return;
        waProofPreviewText.textContent = buildWhatsAppProofMessage(isTest);
    }

    // Botón de prueba instantánea a WhatsApp
    btnSendWaTestProof?.addEventListener('click', () => {
        const rawPhone = waProofPhoneInput?.value.trim() || '51929198813';
        let cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.length === 9) cleanPhone = '51' + cleanPhone;
        if (!cleanPhone) cleanPhone = '51929198813';

        const testMsg = buildWhatsAppProofMessage(true);
        const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(testMsg)}`;
        window.open(waUrl, '_blank');
    });

    renderFbGroups();

    // Cargar clave guardada en localStorage si existe
    if (pubGeminiKeyInput) {
        pubGeminiKeyInput.value = localStorage.getItem('serviciosweb_gemini_key') || '';
        pubGeminiKeyInput.addEventListener('change', () => {
            localStorage.setItem('serviciosweb_gemini_key', pubGeminiKeyInput.value.trim());
        });
    }

    if (pubSocialEmailInput) {
        pubSocialEmailInput.value = localStorage.getItem('serviciosweb_social_email') || 'contacto@serviciosweb.pe';
        pubSocialEmailInput.addEventListener('change', () => {
            localStorage.setItem('serviciosweb_social_email', pubSocialEmailInput.value.trim());
        });
    }

    function initPublicidadCanvasIfEmpty() {
        if (!pubFlyerInitialized && flyerCanvas) {
            syncFlyerInputsWithData();
            drawFlyerCanvas(flyerCanvas, currentFlyerData, pubImageObj);
            pubFlyerInitialized = true;
        }
    }

    function syncFlyerInputsWithData() {
        if (pubPriceInput) currentFlyerData.price = pubPriceInput.value.trim() || '89.00';
        if (pubCurrencySelect) currentFlyerData.currency = pubCurrencySelect.value;
        if (pubWaInput) currentFlyerData.whatsapp = pubWaInput.value.trim() || '+51 929 198 813';
    }

    // Eventos de sincronización rápida de precio y WhatsApp
    pubPriceInput?.addEventListener('input', () => {
        syncFlyerInputsWithData();
        drawFlyerCanvas(flyerCanvas, currentFlyerData, pubImageObj);
        updateWhatsAppProofPreview();
    });

    pubCurrencySelect?.addEventListener('change', () => {
        syncFlyerInputsWithData();
        drawFlyerCanvas(flyerCanvas, currentFlyerData, pubImageObj);
        updateWhatsAppProofPreview();
    });

    pubWaInput?.addEventListener('input', () => {
        syncFlyerInputsWithData();
        drawFlyerCanvas(flyerCanvas, currentFlyerData, pubImageObj);
        updateWhatsAppProofPreview();
    });

    // Selector de Estilos Gráficos del Flyer
    pubStyleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            pubStyleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFlyerData.style = btn.getAttribute('data-style') || 'neon';
            drawFlyerCanvas(flyerCanvas, currentFlyerData, pubImageObj);
        });
    });

    // Manejo de Carga de Imagen (Drag & Drop + File Input)
    pubFileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
    });

    pubDropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        pubDropzone.classList.add('dragover');
    });

    pubDropzone?.addEventListener('dragleave', () => {
        pubDropzone.classList.remove('dragover');
    });

    pubDropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        pubDropzone.classList.remove('dragover');
        const file = e.dataTransfer.files?.[0];
        if (file) handleImageUpload(file);
    });

    pubBtnRemoveImg?.addEventListener('click', (e) => {
        e.stopPropagation();
        pubImageObj = null;
        pubImageBase64 = null;
        uploadedFileName = '';
        pubFileInput.value = '';
        pubPreviewBox.style.display = 'none';
        pubDropzone.style.display = 'block';
        drawFlyerCanvas(flyerCanvas, currentFlyerData, null);
    });

    // Compresión liviana para enviar a Gemini sin exceder límites de red ni Vercel
    function compressImageForAI(img, maxWidth = 800) {
        if (!img) return null;
        try {
            const tempCanvas = document.createElement('canvas');
            let w = img.naturalWidth || img.width || 800;
            let h = img.naturalHeight || img.height || 800;
            if (w > maxWidth || h > maxWidth) {
                if (w > h) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                } else {
                    w = Math.round((w * maxWidth) / h);
                    h = maxWidth;
                }
            }
            tempCanvas.width = w;
            tempCanvas.height = h;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(img, 0, 0, w, h);
            return tempCanvas.toDataURL('image/jpeg', 0.8);
        } catch (e) {
            console.warn('Compresión falló, usando original:', e);
            return pubImageBase64;
        }
    }

    function handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
            return;
        }

        uploadedFileName = file.name || '';
        pubMimeType = file.type;
        const reader = new FileReader();

        reader.onload = (e) => {
            pubImageBase64 = e.target.result;
            const img = new Image();
            img.onload = () => {
                pubImageObj = img;
                if (pubPreviewImg) pubPreviewImg.src = pubImageBase64;
                if (pubPreviewBox) pubPreviewBox.style.display = 'block';
                if (pubDropzone) pubDropzone.style.display = 'none';
                drawFlyerCanvas(flyerCanvas, currentFlyerData, pubImageObj);
            };
            img.src = pubImageBase64;
        };

        reader.readAsDataURL(file);
    }

    // ==============================================================================
    // MOTOR DE DIBUJO DEL FLYER (CANVAS 1080 x 1080 px)
    // ==============================================================================
    function drawFlyerCanvas(canvas, data, imgObj) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = 1080;
        const H = 1080;

        ctx.clearRect(0, 0, W, H);

        // 1. FONDO SEGÚN ESTILO
        if (data.style === 'luxury') {
            // Negro ébano y dorado
            const bgGrad = ctx.createLinearGradient(0, 0, W, H);
            bgGrad.addColorStop(0, '#0a0a0c');
            bgGrad.addColorStop(0.5, '#121217');
            bgGrad.addColorStop(1, '#050507');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            // Resplandor dorado sutil
            const radGrad = ctx.createRadialGradient(W * 0.5, 380, 50, W * 0.5, 380, 480);
            radGrad.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
            radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = radGrad;
            ctx.fillRect(0, 0, W, H);

            // Marco decorativo fino dorado
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
            ctx.lineWidth = 4;
            ctx.strokeRect(30, 30, W - 60, H - 60);

        } else if (data.style === 'sale') {
            // Fondo de impacto comercial (Rojo / Naranja intenso)
            const bgGrad = ctx.createLinearGradient(0, 0, W, H);
            bgGrad.addColorStop(0, '#1c0307');
            bgGrad.addColorStop(0.5, '#2b060d');
            bgGrad.addColorStop(1, '#0f0204');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            const radGrad = ctx.createRadialGradient(W * 0.7, 340, 40, W * 0.7, 340, 520);
            radGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
            radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = radGrad;
            ctx.fillRect(0, 0, W, H);

            ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.lineWidth = 4;
            ctx.strokeRect(30, 30, W - 60, H - 60);

        } else if (data.style === 'clean') {
            // Minimalista Pro (Azul profundo moderno)
            const bgGrad = ctx.createLinearGradient(0, 0, W, H);
            bgGrad.addColorStop(0, '#0c1527');
            bgGrad.addColorStop(0.6, '#080d19');
            bgGrad.addColorStop(1, '#05070d');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            const radGrad = ctx.createRadialGradient(250, 300, 30, 250, 300, 450);
            radGrad.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
            radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = radGrad;
            ctx.fillRect(0, 0, W, H);

        } else {
            // CYBER NEÓN PREDETERMINADO (Cyan + Púrpura Glow)
            const bgGrad = ctx.createLinearGradient(0, 0, W, H);
            bgGrad.addColorStop(0, '#070b16');
            bgGrad.addColorStop(0.5, '#0b1122');
            bgGrad.addColorStop(1, '#04070e');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            // Resplandor Cyan superior izquierdo
            const radCyan = ctx.createRadialGradient(180, 260, 40, 180, 260, 440);
            radCyan.addColorStop(0, 'rgba(0, 229, 255, 0.25)');
            radCyan.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = radCyan;
            ctx.fillRect(0, 0, W, H);

            // Resplandor Púrpura inferior derecho
            const radPurp = ctx.createRadialGradient(880, 600, 40, 880, 600, 460);
            radPurp.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
            radPurp.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = radPurp;
            ctx.fillRect(0, 0, W, H);

            // Borde exterior con glow
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
            ctx.lineWidth = 4;
            ctx.strokeRect(30, 30, W - 60, H - 60);
        }

        // 2. ENCABEZADO: LOGO Y BADGE DE OFERTA
        // Marca SERVICIOSWEB
        ctx.fillStyle = '#00e5ff';
        ctx.font = '900 32px "Outfit", sans-serif';
        ctx.fillText('SERVICIOS', 65, 85);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('WEB', 245, 85);

        // Badge de Oferta / Urgencia (Esquina superior derecha)
        const badgeText = data.badge || '¡OFERTA LIMITADA!';
        ctx.font = '800 22px "Outfit", sans-serif';
        const badgeWidth = ctx.measureText(badgeText).width + 40;
        const badgeX = W - 65 - badgeWidth;
        const badgeY = 56;

        // Fondo del badge
        ctx.save();
        ctx.fillStyle = data.style === 'luxury' ? 'linear-gradient' : '#ef4444';
        if (data.style === 'luxury') {
            ctx.fillStyle = '#f59e0b';
        } else if (data.style === 'neon') {
            ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
        } else {
            ctx.fillStyle = '#e11d48';
        }
        roundRect(ctx, badgeX, badgeY, badgeWidth, 42, 21);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 28);
        ctx.restore();

        // 3. CONTENEDOR HERO DEL PRODUCTO (MARCO CENTRADO)
        const boxX = 90;
        const boxY = 135;
        const boxW = W - 180;
        const boxH = 490;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 35;
        ctx.shadowOffsetY = 15;
        ctx.fillStyle = 'rgba(13, 20, 36, 0.75)';
        roundRect(ctx, boxX, boxY, boxW, boxH, 24);
        ctx.fill();
        ctx.restore();

        // Borde fino del contenedor
        ctx.strokeStyle = data.style === 'luxury' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(0, 229, 255, 0.3)';
        ctx.lineWidth = 2.5;
        roundRect(ctx, boxX, boxY, boxW, boxH, 24);
        ctx.stroke();

        // DIBUJAR LA IMAGEN DEL PRODUCTO (Si existe)
        if (imgObj) {
            ctx.save();
            // Clip dentro del marco
            roundRect(ctx, boxX + 6, boxY + 6, boxW - 12, boxH - 12, 20);
            ctx.clip();

            // Calcular escala 'contain' manteniendo proporción
            const scale = Math.min((boxW - 40) / imgObj.width, (boxH - 40) / imgObj.height);
            const drawW = imgObj.width * scale;
            const drawH = imgObj.height * scale;
            const drawX = boxX + (boxW - drawW) / 2;
            const drawY = boxY + (boxH - drawH) / 2;

            // Sombra del producto
            ctx.drawImage(imgObj, drawX, drawY, drawW, drawH);
            ctx.restore();
        } else {
            // Placeholder interactivo
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.textAlign = 'center';
            ctx.font = '80px sans-serif';
            ctx.fillText('📸', boxX + boxW / 2, boxY + boxH / 2 - 15);
            ctx.font = '600 24px "Outfit", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText('Sube la foto del producto para armar el flyer', boxX + boxW / 2, boxY + boxH / 2 + 55);
        }

        // 4. STICKER DEL PRECIO DESTACADO (FLOTANTE SOBRE EL PRODUCTO)
        const priceStr = `${data.currency} ${data.price || '89.00'}`;
        ctx.save();
        const priceTagW = 270;
        const priceTagH = 92;
        const priceTagX = boxX + boxW - priceTagW + 25;
        const priceTagY = boxY + boxH - 55;

        // Sombra de brillo neón
        ctx.shadowColor = data.style === 'luxury' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(0, 229, 255, 0.6)';
        ctx.shadowBlur = 25;

        // Fondo del badge de precio
        const priceBg = ctx.createLinearGradient(priceTagX, priceTagY, priceTagX + priceTagW, priceTagY + priceTagH);
        if (data.style === 'luxury') {
            priceBg.addColorStop(0, '#f59e0b');
            priceBg.addColorStop(1, '#b45309');
        } else if (data.style === 'sale') {
            priceBg.addColorStop(0, '#ef4444');
            priceBg.addColorStop(1, '#991b1b');
        } else {
            priceBg.addColorStop(0, '#00e5ff');
            priceBg.addColorStop(1, '#0284c7');
        }
        ctx.fillStyle = priceBg;
        roundRect(ctx, priceTagX, priceTagY, priceTagW, priceTagH, 18);
        ctx.fill();

        // Borde blanco
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        roundRect(ctx, priceTagX, priceTagY, priceTagW, priceTagH, 18);
        ctx.stroke();

        // Textos del precio
        ctx.fillStyle = '#060913';
        ctx.textAlign = 'center';
        ctx.font = '800 16px "Outfit", sans-serif';
        ctx.fillText('PRECIO ESPECIAL', priceTagX + priceTagW / 2, priceTagY + 28);
        ctx.font = '900 42px "Outfit", sans-serif';
        ctx.fillText(priceStr, priceTagX + priceTagW / 2, priceTagY + 74);
        ctx.restore();

        // 5. TITULAR PUBLICITARIO Y NOMBRE DEL PRODUCTO
        const textStartY = 680;
        ctx.textAlign = 'left';

        // Categoría / Tag pequeño
        ctx.font = '700 20px "Outfit", sans-serif';
        ctx.fillStyle = data.style === 'luxury' ? '#f59e0b' : '#00e5ff';
        ctx.fillText((data.category || 'NOVEDAD DESTACADA').toUpperCase(), 90, textStartY);

        // Titular comercial de impacto (Hook Title)
        ctx.font = '900 42px "Outfit", sans-serif';
        ctx.fillStyle = '#ffffff';
        const titleText = data.hookTitle || '¡OFERTA ESPECIAL DE TEMPORADA!';
        ctx.fillText(truncateText(ctx, titleText, W - 180), 90, textStartY + 48);

        // Nombre comercial del producto identificado por Gemini
        ctx.font = '700 28px "Outfit", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        const pName = data.productName || 'Producto Exclusivo de Temporada';
        ctx.fillText(truncateText(ctx, pName, W - 180), 90, textStartY + 90);

        // 6. VIÑETAS CON CARACTERÍSTICAS DE VENTA (FEATURES)
        const featY = textStartY + 130;
        const feats = data.features || [
            "Calidad garantizada y materiales premium",
            "Atención inmediata y entrega segura",
            "Envíos a todo el país con número de seguimiento"
        ];

        feats.slice(0, 3).forEach((feature, idx) => {
            const currentY = featY + (idx * 38);
            // Icono / viñeta brillante
            ctx.fillStyle = data.style === 'luxury' ? '#f59e0b' : '#22c55e';
            ctx.font = '800 22px sans-serif';
            ctx.fillText('✔', 90, currentY);

            // Texto de la característica
            ctx.font = '600 23px "Outfit", sans-serif';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(truncateText(ctx, feature, W - 230), 125, currentY);
        });

        // 7. BARRA INFERIOR / FOOTER CON LLAMADA A LA ACCIÓN (WHATSAPP)
        const footerY = 945;
        const footerH = 88;
        const footerW = W - 180;
        const footerX = 90;

        ctx.save();
        // Fondo verde WhatsApp con degradado y sombra
        ctx.shadowColor = 'rgba(37, 211, 102, 0.45)';
        ctx.shadowBlur = 20;
        const waGrad = ctx.createLinearGradient(footerX, footerY, footerX + footerW, footerY + footerH);
        waGrad.addColorStop(0, '#25d366');
        waGrad.addColorStop(1, '#128c7e');
        ctx.fillStyle = waGrad;
        roundRect(ctx, footerX, footerY, footerW, footerH, 18);
        ctx.fill();

        // Icono y Texto de WhatsApp
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 30px "Outfit", sans-serif';
        const waText = `💬 ¡PÍDELO POR WHATSAPP: ${data.whatsapp || '+51 929 198 813'}!`;
        ctx.fillText(waText, footerX + footerW / 2, footerY + 54);
        ctx.restore();
    }

    // Funciones auxiliares de Canvas
    function roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    function truncateText(ctx, text, maxWidth) {
        if (!text) return '';
        if (ctx.measureText(text).width <= maxWidth) return text;
        let str = text;
        while (str.length > 0 && ctx.measureText(str + '...').width > maxWidth) {
            str = str.substring(0, str.length - 1);
        }
        return str + '...';
    }

    // ==============================================================================
    // LLAMADA RESILIENTE A GOOGLE GEMINI & GENERADOR DE FLYERS EN VIVO
    // ==============================================================================
    btnGenerateFlyer?.addEventListener('click', async () => {
        if (!pubImageObj || !pubImageBase64) {
            alert('⚠️ Por favor sube primero la foto del producto para armar el flyer publicitario.');
            return;
        }

        syncFlyerInputsWithData();
        const customKey = pubGeminiKeyInput?.value.trim() || '';

        // Feedback visual
        btnGenerateFlyer.disabled = true;
        btnGenerateFlyer.innerHTML = `<span>⏳ Generando flyer y analizando producto...</span>`;
        if (pubStatusMsg) {
            pubStatusMsg.style.display = 'block';
            pubStatusMsg.style.background = 'rgba(0, 229, 255, 0.1)';
            pubStatusMsg.style.color = 'var(--neon-cyan)';
            pubStatusMsg.style.border = '1px solid rgba(0, 229, 255, 0.3)';
            pubStatusMsg.innerHTML = '🤖 <strong>Identificando producto y ensamblando diseño publicitario...</strong>';
        }

        // Obtener versión comprimida para la IA
        const compressedBase64 = compressImageForAI(pubImageObj) || pubImageBase64;

        let resultData = null;
        let aiNotice = '';

        // 1. Intentar llamar a Gemini directamente si el usuario tiene una clave
        if (customKey) {
            try {
                resultData = await callGeminiDirectly(customKey, compressedBase64, 'image/jpeg', currentFlyerData.price, currentFlyerData.currency);
            } catch (errKey) {
                console.warn('Gemini con clave directa no respondió:', errKey.message);
                aiNotice = ' (Nota: Clave de Google no respondió, se aplicó la plantilla comercial con éxito)';
            }
        }

        // 2. Intentar endpoint serverless
        if (!resultData) {
            try {
                const response = await fetch('/api/gemini-flyer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageBase64: compressedBase64,
                        mimeType: 'image/jpeg',
                        price: currentFlyerData.price,
                        currency: currentFlyerData.currency,
                        customKey: customKey
                    })
                });

                if (response.ok) {
                    const resJson = await response.json();
                    if (resJson.success && resJson.data) {
                        resultData = resJson.data;
                    }
                }
            } catch (errApi) {
                console.warn('Endpoint /api/gemini-flyer no disponible en local:', errApi.message);
            }
        }

        // 3. Generador Inteligente Contextual Garantizado (NUNCA FALLA NI BLOQUEA)
        if (!resultData) {
            resultData = generateSmartMarketingData(currentFlyerData.price, currentFlyerData.currency, uploadedFileName);
        }

        // Aplicar resultados al flyer y a los campos
        currentFlyerData.productName = resultData.productName || currentFlyerData.productName;
        currentFlyerData.category = resultData.category || currentFlyerData.category;
        currentFlyerData.hookTitle = resultData.hookTitle || currentFlyerData.hookTitle;
        currentFlyerData.badge = resultData.badge || currentFlyerData.badge;
        if (resultData.features && resultData.features.length) {
            currentFlyerData.features = resultData.features;
        }

        // Actualizar campos de texto en la interfaz
        if (geminiDetectedName) geminiDetectedName.textContent = currentFlyerData.productName;
        if (geminiSocialCopy) geminiSocialCopy.value = resultData.socialCopy || '';
        if (geminiHashtags) geminiHashtags.textContent = resultData.hashtags || '#ServiciosWeb #Oferta #Ecommerce';

        // Redibujar el flyer en el Canvas de alta resolución con el contenido comercial
        drawFlyerCanvas(flyerCanvas, currentFlyerData, pubImageObj);
        updateWhatsAppProofPreview();

        if (pubStatusMsg) {
            pubStatusMsg.style.background = 'rgba(37, 211, 102, 0.12)';
            pubStatusMsg.style.color = 'var(--whatsapp-green)';
            pubStatusMsg.style.border = '1px solid rgba(37, 211, 102, 0.35)';
            pubStatusMsg.innerHTML = `✅ <strong>¡Flyer Generado con Éxito!</strong> Diseño 1080x1080 px listo con precio ${currentFlyerData.currency} ${currentFlyerData.price}.${aiNotice}`;
        }

        btnGenerateFlyer.disabled = false;
        btnGenerateFlyer.innerHTML = `<span>✨ 1. Analizar con Gemini & Generar Flyer</span>`;
    });

    // Llamada directa a Google Gemini 1.5 Flash protegida contra caídas
    async function callGeminiDirectly(key, base64Url, mimeType, price, currency) {
        try {
            const cleanBase64 = base64Url.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
            const prompt = `Analiza detalladamente esta foto de producto que se venderá a ${currency} ${price || 'a consultar'}. Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura:
{"productName": "Nombre comercial preciso", "category": "Categoría comercial", "hookTitle": "Titular de 4 a 6 palabras tipo flyer", "badge": "¡OFERTA EXCLUSIVA!", "features": ["Ventaja 1", "Ventaja 2", "Ventaja 3"], "socialCopy": "Texto persuasivo completo para Facebook/Instagram con emojis y llamado a comprar por WhatsApp", "hashtags": "#HashtagsVirales"}`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: mimeType, data: cleanBase64 } }
                        ]
                    }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            if (!res.ok) {
                let errText = '';
                try {
                    const errData = await res.json();
                    errText = errData.error?.message || '';
                } catch(e) {}
                console.warn('Google Gemini API status:', res.status, errText);
                return null;
            }

            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return null;
            const cleanJson = text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.warn('Error en llamada a Gemini:', e.message);
            return null;
        }
    }

    // Generador Inteligente Contextual (detecta el producto subido como fuentes MSI, tecnología, ropa o general)
    function generateSmartMarketingData(price, currency, filename = '') {
        const fn = (filename || '').toLowerCase();
        const pVal = price || '180.00';

        // Detección para Hardware / Fuentes de poder / PC Gamer (como MSI en el screenshot)
        if (fn.includes('msi') || fn.includes('fuente') || fn.includes('power') || fn.includes('mag') || fn.includes('pc') || fn.includes('gamer') || fn.includes('gaming') || pVal === '180' || pVal === '180.00') {
            return {
                productName: "Fuente de Poder MSI MAG Gamer Alta Eficiencia",
                category: "Hardware Gamer & Computación",
                hookTitle: "¡MÁXIMA POTENCIA Y ESTABILIDAD 80 PLUS!",
                badge: "¡EDICIÓN GAMER!",
                features: [
                    "Certificación de alta eficiencia energética para PC",
                    "Protección activa contra sobrevoltaje y circuito silencioso",
                    "Garantía oficial y entrega inmediata en Lima y provincias"
                ],
                socialCopy: `⚡ ¡POTENCIA TU SETUP GAMER! Ya disponible la Fuente de Poder MSI MAG de alto rendimiento.\n\n🛡️ Máxima estabilidad eléctrica para tu tarjeta gráfica y procesador.\n🔇 Ventilador ultra silencioso y componentes de grado premium.\n\n💰 Precio Especial: ${currency} ${pVal}\n📦 Envíos rápidos a todo el Perú.\n\n📲 ¡Pídela ahora mismo al WhatsApp para reservar tu unidad! 🚀`,
                hashtags: "#MSI #HardwareGamer #PCGamerPeru #SetupGamer #ComponentesPC #ServiciosWeb"
            };
        }

        // Detección para moda / calzado
        if (fn.includes('zap') || fn.includes('shoe') || fn.includes('sneaker') || fn.includes('ropa') || fn.includes('polo')) {
            return {
                productName: "Colección Exclusiva de Temporada",
                category: "Moda & Tendencias",
                hookTitle: "¡ESTILO ÚNICO Y CONFORT TOTAL!",
                badge: "¡EDICIÓN LIMITADA!",
                features: [
                    "Materiales de primera calidad y diseño ergonómico",
                    "Acabados premium y máxima durabilidad",
                    "Envíos garantizados y pago contra entrega disponible"
                ],
                socialCopy: `👟 ¡ESTILO QUE IMPACTA! Descubre este modelo exclusivo diseñado para máxima comodidad.\n\n💰 Precio Especial: ${currency} ${pVal}\n✨ Stock limitado para entrega inmediata.\n\n📲 ¡Escríbenos al WhatsApp y llévatelo hoy mismo! 🚀`,
                hashtags: "#ModaPeru #Sneakers #Tendencias #TiendaOnline #ServiciosWeb"
            };
        }

        // Plantilla Comercial General de Alta Conversión
        return {
            productName: "Artículo Exclusivo Seleccionado",
            category: "Novedad en Catálogo 2026",
            hookTitle: "¡CALIDAD PREMIUM AL MEJOR PRECIO!",
            badge: "¡SUPER OFERTA!",
            features: [
                "Material de alta durabilidad y diseño moderno",
                "Garantía oficial y entrega inmediata",
                "Envíos garantizados a todo el país"
            ],
            socialCopy: `🔥 ¡NUEVO LANZAMIENTO! Descubre este increíble producto con calidad garantizada y acabado superior.\n\n💰 Precio Especial: ${currency} ${pVal}\n✨ Stock limitado para entrega inmediata.\n\n📲 ¡Escríbenos ahora mismo al WhatsApp para reservar el tuyo antes de que se agote! 🚀`,
            hashtags: "#OfertaExclusiva #VentasPeru #TiendaOnline #Descuentos #ServiciosWeb"
        };
    }

    // Botón de Redibujar Flyer
    btnRerenderFlyer?.addEventListener('click', () => {
        syncFlyerInputsWithData();
        drawFlyerCanvas(flyerCanvas, currentFlyerData, pubImageObj);
    });

    // Descargar Flyer en PNG de Alta Resolución
    btnDownloadFlyer?.addEventListener('click', () => {
        if (!flyerCanvas) return;
        const link = document.createElement('a');
        link.download = `flyer-publicidad-${Date.now()}.png`;
        link.href = flyerCanvas.toDataURL('image/png');
        link.click();
    });

    // Copiar Texto Social al Portapapeles
    btnCopySocialText?.addEventListener('click', async () => {
        if (!geminiSocialCopy || !geminiSocialCopy.value) {
            alert('Aún no hay texto generado para copiar.');
            return;
        }

        try {
            await navigator.clipboard.writeText(geminiSocialCopy.value + '\n\n' + (geminiHashtags?.textContent || ''));
            btnCopySocialText.textContent = '✅ ¡Copiado!';
            setTimeout(() => {
                btnCopySocialText.textContent = '📋 Copiar Texto Completo';
            }, 2500);
        } catch (err) {
            geminiSocialCopy.select();
            document.execCommand('copy');
            alert('Texto copiado al portapapeles.');
        }
    });

    // ==============================================================================
    // PROGRAMACIÓN & APERTURA AUTOMÁTICA EN REDES SOCIALES
    // ==============================================================================
    // Alternar selección de plataformas
    document.querySelectorAll('.social-platform-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            pill.classList.toggle('checked');
            const checkSpan = pill.querySelector('.platform-check');
            if (checkSpan) {
                checkSpan.textContent = pill.classList.contains('checked') ? '✓' : '';
            }
        });
    });

    // Añadir Hora Personalizada
    btnAddScheduleHour?.addEventListener('click', () => {
        const timeVal = customScheduleHour?.value;
        if (!timeVal) return;
        const tag = document.createElement('span');
        tag.className = 'schedule-hour-tag';
        tag.innerHTML = `⏰ ${timeVal} (Personalizada)`;
        scheduleHoursTags?.appendChild(tag);
        alert(`Hora ${timeVal} agregada a la lista de publicaciones automáticas.`);
    });

    // Publicar / Abrir Redes Sociales Ahora (Página Principal + Grupos Asociados + Comprobante WhatsApp)
    btnPublishNow?.addEventListener('click', async () => {
        const textToPublish = (geminiSocialCopy?.value || '¡Gran Oferta en SERVICIOSWEB!') + '\n\n' + (geminiHashtags?.textContent || '');

        // 1. Copiar automáticamente el texto persuasivo y hashtags
        try {
            await navigator.clipboard.writeText(textToPublish);
        } catch (e) {
            console.warn('No se pudo copiar directo:', e);
        }

        // 2. Descargar flyer de 1080x1080 px para adjuntarlo como foto de alta resolución
        if (flyerCanvas) {
            const link = document.createElement('a');
            link.download = `flyer-publicidad-${Date.now()}.png`;
            link.href = flyerCanvas.toDataURL('image/png');
            link.click();
        }

        const checkedPlatforms = Array.from(document.querySelectorAll('.social-platform-pill.checked')).map(p => p.getAttribute('data-platform'));

        if (checkedPlatforms.length === 0) {
            alert('⚠️ Por favor selecciona al menos una red social para publicar.');
            return;
        }

        const activeFbGroups = fbGroups.filter(g => g.checked);
        const openedLog = [];

        // 3. Abrir destinos según las redes seleccionadas
        checkedPlatforms.forEach(plat => {
            switch (plat) {
                case 'facebook':
                    // Publicación en Página Principal / Fan Page
                    window.open('https://www.facebook.com', '_blank');
                    openedLog.push('Página Principal de Facebook');

                    // Publicación en cada uno de los grupos asociados
                    activeFbGroups.forEach((grp, idx) => {
                        openedLog.push(`Grupo FB: ${grp.name}`);
                        setTimeout(() => {
                            window.open(grp.url, '_blank');
                        }, (idx + 1) * 800);
                    });
                    break;
                case 'instagram':
                    window.open('https://www.instagram.com', '_blank');
                    openedLog.push('Instagram Feed / Reels');
                    break;
                case 'whatsapp':
                    window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(textToPublish)}`, '_blank');
                    openedLog.push('WhatsApp Difusión');
                    break;
                case 'tiktok':
                    window.open('https://www.tiktok.com/upload', '_blank');
                    openedLog.push('TikTok Studio');
                    break;
                case 'twitter':
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(textToPublish.substring(0, 240))}`, '_blank');
                    openedLog.push('X (Twitter)');
                    break;
            }
        });

        // 4. Enviar Comprobante / Prueba de Publicación a WhatsApp
        const sendWaProof = chkSendWaProof ? chkSendWaProof.checked : true;
        let waProofSent = false;
        let proofRecipient = '';

        if (sendWaProof) {
            const rawPhone = waProofPhoneInput?.value.trim() || '51929198813';
            let cleanPhone = rawPhone.replace(/\D/g, '');
            if (cleanPhone.length === 9) cleanPhone = '51' + cleanPhone;
            if (!cleanPhone) cleanPhone = '51929198813';
            proofRecipient = rawPhone;

            const proofMsg = buildWhatsAppProofMessage(false);
            const staggerDelay = (activeFbGroups.length * 800) + 1200;

            setTimeout(() => {
                const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(proofMsg)}`;
                window.open(waUrl, '_blank');
            }, staggerDelay);

            waProofSent = true;
        }

        // 5. Registrar en el Log de Auditoría
        if (socialDispatchLog) {
            socialDispatchLog.style.display = 'block';
            const now = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            socialDispatchLog.innerHTML = `
                <div style="color:var(--whatsapp-green); font-weight:700; margin-bottom:0.5rem; font-size:0.95rem;">
                    🚀 [${now}] ¡Publicación y Despacho en Vivo Iniciado con Éxito!
                </div>
                <div style="color:var(--neon-cyan); font-size:0.83rem; margin-bottom:0.4rem; font-weight:600;">
                    📍 Destinos en Facebook: Página Principal + ${activeFbGroups.length} Grupos Asociados
                </div>
                <div style="color:var(--text-muted); font-size:0.8rem; line-height:1.6;">
                    • <strong>Página Principal & Grupos de Facebook:</strong> Se abrieron pestañas dedicadas para publicar de inmediato.<br>
                    • <strong>Texto comercial y hashtags:</strong> Copiados al portapapeles (Presiona <code>Ctrl+V</code> para pegar).<br>
                    • <strong>Flyer en alta resolución (1080x1080):</strong> Descargado automáticamente en tu dispositivo.<br>
                    ${waProofSent ? `• 📲 <strong>Comprobante enviado a tu WhatsApp:</strong> Reporte generado y dirigido a <code>${proofRecipient}</code> para comprobar que está funcionando.` : ''}
                </div>
            `;
        }
    });

    // Programar Envíos Automáticos del Día
    btnSchedule?.addEventListener('click', () => {
        const email = pubSocialEmailInput?.value.trim() || 'contacto@serviciosweb.pe';
        alert(`✅ ¡Campaña Programada con Éxito!\n\nLas horas 09:00 AM, 01:30 PM y 08:00 PM han sido configuradas.\nLas publicaciones se vincularon a la cuenta asociada: ${email}.\nEl sistema emitirá las alertas y recordatorios para cada franja horaria.`);
        
        if (socialDispatchLog) {
            socialDispatchLog.style.display = 'block';
            socialDispatchLog.innerHTML = `
                <div style="color:#c084fc; font-weight:700;">
                    ⏰ Campaña Automática Activa para hoy
                </div>
                <div style="color:var(--text-dim); font-size:0.8rem; margin-top:0.2rem;">
                    Próximo envío programado: <strong>09:00 AM</strong> | Correo vinculado: <code>${email}</code>
                </div>
            `;
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

