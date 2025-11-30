// ESTADO GLOBAL
let estadoAdmin = {
    usuarioActual: null,
    habitaciones: [],
    reservas: [],
    modalActual: null
};

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    console.log('admin.js: DOMContentLoaded');
    
    // Verificar permisos de admin
    await verificarAdmin();
    
    // Cargar datos (cargar reservaciones PRIMERO)
    await cargarReservaciones();
    await cargarHabitaciones();
    await cargarDashboard();
    
    // Conectar navegación
    conectarNavegacion();
});

// VERIFICAR PERMISOS DE ADMIN
async function verificarAdmin() {
    try {
        const response = await fetch('/proyecto-hotel-AGODIC25/controllers/obtener_usuario.php');
        const data = await response.json();
        
        if (!data.ok || !data.usuario || data.usuario.rol !== 'administrador') {
            mostrarAccesoDenegado();
            return false;
        }
        
        estadoAdmin.usuarioActual = data.usuario;
        document.getElementById('admin-email').textContent = data.usuario.email;
        return true;
    } catch (err) {
        console.error('Error verificando admin:', err);
        mostrarAccesoDenegado();
        return false;
    }
}

function mostrarAccesoDenegado() {
    document.body.innerHTML = `
        <div class="acceso-denegado">
            <div class="acceso-denegado-card">
                <h1>🚫</h1>
                <p>No tienes permisos para acceder al panel de administración.</p>
                <a href="index.html">Volver al inicio</a>
            </div>
        </div>
    `;
}

// NAVEGACIÓN
function conectarNavegacion() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const seccion = item.getAttribute('data-section');
            mostrarSeccion(seccion);
            
            // Actualizar estado activo
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function mostrarSeccion(seccion) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => s.classList.remove('active'));
    
    document.getElementById(seccion).classList.add('active');
    
    // Actualizar título
    const titulos = {
        'dashboard': '📊 Dashboard',
        'habitaciones': '🛏️ Habitaciones',
        'reservaciones': '📅 Reservaciones',
        'usuarios': '👥 Usuarios',
        'settings': '⚙️ Configuración'
    };
    
    document.getElementById('section-title').textContent = titulos[seccion] || 'Admin Panel';
    
    // Cargar datos si es la sección de usuarios
    if (seccion === 'usuarios') {
        cargarUsuarios();
    }
}

// ============================================
// DASHBOARD
// ============================================

async function cargarDashboard() {
    try {
        const response = await fetch('/proyecto-hotel-AGODIC25/controllers/admin_reservaciones.php?action=stats');
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.message);
        }
        
        // Obtener estadísticas adicionales
        const estadisticasResp = await fetch('/proyecto-hotel-AGODIC25/controllers/admin_estadisticas.php');
        const estadisticas = await estadisticasResp.json();
        
        const stats = data.stats;
        
        const html = `
            <div class="dashboard-grid">
                <div class="card-stat">
                    <div class="card-stat-label">Total de Habitaciones</div>
                    <div class="card-stat-value">${stats.total_habitaciones}</div>
                </div>
                <div class="card-stat">
                    <div class="card-stat-label">Total de Reservas</div>
                    <div class="card-stat-value">${stats.total_reservas}</div>
                </div>
                <div class="card-stat">
                    <div class="card-stat-label">Reservas Pendientes</div>
                    <div class="card-stat-value">${stats.reservas_pendientes}</div>
                </div>
                <div class="card-stat">
                    <div class="card-stat-label">Ingresos Totales</div>
                    <div class="card-stat-value">$${parseFloat(stats.ingresos_totales).toLocaleString('es-MX')}</div>
                </div>
                ${estadisticas.ok ? `
                    <div class="card-stat">
                        <div class="card-stat-label">Usuarios Registrados</div>
                        <div class="card-stat-value">${estadisticas.total_usuarios}</div>
                    </div>
                    <div class="card-stat">
                        <div class="card-stat-label">Ocupación Actual</div>
                        <div class="card-stat-value">${estadisticas.tasa_ocupacion}%</div>
                    </div>
                    <div class="card-stat">
                        <div class="card-stat-label">Habitaciones Ocupadas</div>
                        <div class="card-stat-value">${estadisticas.ocupacion_actual}/${estadisticas.total_habitaciones}</div>
                    </div>
                    <div class="card-stat">
                        <div class="card-stat-label">Ingresos Promedio</div>
                        <div class="card-stat-value">$${parseFloat(estadisticas.revenue_promedio).toLocaleString('es-MX')}</div>
                    </div>
                ` : ''}
            </div>
            
            ${estadisticas.ok ? `
                <div class="stats-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
                    <!-- USUARIOS -->
                    <div class="table-container">
                        <div class="table-header">
                            <h2>Usuarios por Rol</h2>
                        </div>
                        <table style="width: 100%;">
                            <thead>
                                <tr>
                                    <th>Rol</th>
                                    <th>Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${estadisticas.usuarios_por_rol.map(u => `
                                    <tr>
                                        <td>${u.rol}</td>
                                        <td><strong>${u.cantidad}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- ÚLTIMAS TRANSACCIONES -->
                    <div class="table-container">
                        <div class="table-header">
                            <h2>Últimas Transacciones</h2>
                        </div>
                        <div style="max-height: 300px; overflow-y: auto;">
                            <table style="width: 100%;">
                                <thead>
                                    <tr>
                                        <th>Monto</th>
                                        <th>Huésped</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${estadisticas.ultimas_transacciones.slice(0, 5).map(t => `
                                        <tr>
                                            <td>$${parseFloat(t.monto).toLocaleString('es-MX')}</td>
                                            <td>${escapeHtml(t.nombre_completo)}</td>
                                            <td><span class="estado-badge estado-${t.estado}">${t.estado}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="table-container" style="margin-top: 2rem;">
                <div class="table-header">
                    <h2>Últimas Reservaciones</h2>
                </div>
                <div id="dashboard-recent-content">
                    Cargando...
                </div>
            </div>
        `;
        
        document.getElementById('dashboard-content').innerHTML = html;
        
        // Cargar últimas reservas
        mostrarUltimasReservas();
    } catch (err) {
        console.error('Error cargando dashboard:', err);
        document.getElementById('dashboard-content').innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
    }
}

function mostrarUltimasReservas() {
    const ultimas = estadoAdmin.reservas.slice(0, 5);
    
    if (ultimas.length === 0) {
        document.getElementById('dashboard-recent-content').innerHTML = '<p class="empty-message">No hay reservaciones.</p>';
        return;
    }
    
    let html = '<table>';
    html += `
        <thead>
            <tr>
                <th>Habitación</th>
                <th>Huésped</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Estado</th>
                <th>Plan</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    ultimas.forEach(res => {
        const estilo_estado = `estado-${res.estado}`;
        const estilo_plan = `plan-${res.plan.replace('_', '-')}`;
        
        html += `
            <tr>
                <td>${res.numero_habitacion}</td>
                <td>${escapeHtml(res.nombre_completo)}</td>
                <td>${formatDate(res.fecha_entrada)}</td>
                <td>${formatDate(res.fecha_salida)}</td>
                <td><span class="estado-badge ${estilo_estado}">${res.estado}</span></td>
                <td><span class="plan-badge ${estilo_plan}">${res.plan}</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('dashboard-recent-content').innerHTML = html;
}

// ============================================
// HABITACIONES
// ============================================

async function cargarHabitaciones() {
    try {
        const response = await fetch('/proyecto-hotel-AGODIC25/controllers/admin_habitaciones.php');
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.message);
        }
        
        estadoAdmin.habitaciones = data.data;
        renderizarTablaHabitaciones();
    } catch (err) {
        console.error('Error cargando habitaciones:', err);
        document.getElementById('habitaciones-table-content').innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
    }
}

function renderizarTablaHabitaciones() {
    const contenedor = document.getElementById('habitaciones-table-content');
    
    if (estadoAdmin.habitaciones.length === 0) {
        contenedor.innerHTML = '<p class="empty-message">No hay habitaciones registradas.</p>';
        return;
    }
    
    let html = '<table>';
    html += `
        <thead>
            <tr>
                <th>Número</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Capacidad</th>
                <th>Precio</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    estadoAdmin.habitaciones.forEach(hab => {
        html += `
            <tr>
                <td>${hab.numero_habitacion}</td>
                <td>${escapeHtml(hab.nombre_habitacion)}</td>
                <td>${escapeHtml(hab.tipo)}</td>
                <td>${escapeHtml(hab.capacidad)}</td>
                <td>$${parseFloat(hab.precio).toLocaleString('es-MX')}</td>
                <td>
                    <button class="btn-small btn-edit" onclick="editarHabitacion(${hab.id_habitacion})">Editar</button>
                    <button class="btn-small btn-delete" onclick="eliminarHabitacion(${hab.id_habitacion})">Eliminar</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    contenedor.innerHTML = html;
}

function abrirModalHabitacion(habitacionId = null) {
    const modal = document.getElementById('modal-habitacion');
    const form = document.getElementById('form-habitacion');
    
    form.reset();
    
    if (habitacionId) {
        // Modo edición
        const hab = estadoAdmin.habitaciones.find(h => h.id_habitacion === habitacionId);
        if (hab) {
            document.getElementById('modal-habitacion-title').textContent = 'Editar Habitación';
            document.getElementById('h_numero').value = hab.numero_habitacion;
            document.getElementById('h_tipo').value = hab.tipo;
            document.getElementById('h_nombre').value = hab.nombre_habitacion;
            document.getElementById('h_descripcion').value = hab.descripcion || '';
            document.getElementById('h_capacidad').value = hab.capacidad;
            document.getElementById('h_precio').value = hab.precio;
            document.getElementById('h_imagen').value = hab.imagen || '';
            
            form.dataset.modo = 'edit';
            form.dataset.id = habitacionId;
        }
    } else {
        // Modo creación
        document.getElementById('modal-habitacion-title').textContent = 'Nueva Habitación';
        form.dataset.modo = 'create';
        delete form.dataset.id;
    }
    
    modal.classList.add('show');
    estadoAdmin.modalActual = 'habitacion';
}

function cerrarModalHabitacion() {
    document.getElementById('modal-habitacion').classList.remove('show');
    estadoAdmin.modalActual = null;
}

async function guardarHabitacion(e) {
    e.preventDefault();
    
    const form = document.getElementById('form-habitacion');
    const modo = form.dataset.modo;
    
    const datos = {
        numero_habitacion: document.getElementById('h_numero').value,
        tipo: document.getElementById('h_tipo').value,
        nombre_habitacion: document.getElementById('h_nombre').value,
        descripcion: document.getElementById('h_descripcion').value,
        capacidad: document.getElementById('h_capacidad').value,
        precio: document.getElementById('h_precio').value,
        imagen: document.getElementById('h_imagen').value
    };
    
    try {
        let url = '/proyecto-hotel-AGODIC25/controllers/admin_habitaciones.php';
        let method = 'POST';
        let action = modo === 'edit' ? 'update' : 'create';
        
        if (modo === 'edit') {
            datos.id_habitacion = parseInt(form.dataset.id);
        }
        
        const response = await fetch(`${url}?action=${action}`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.message);
        }
        
        await cargarHabitaciones();
        cerrarModalHabitacion();
        mostrarAlerta(data.message, 'success');
    } catch (err) {
        mostrarAlerta(err.message, 'error');
    }
}

function editarHabitacion(habitacionId) {
    abrirModalHabitacion(habitacionId);
}

async function eliminarHabitacion(habitacionId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta habitación?')) {
        return;
    }
    
    try {
        const response = await fetch(`/proyecto-hotel-AGODIC25/controllers/admin_habitaciones.php?action=delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_habitacion: habitacionId })
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.message);
        }
        
        await cargarHabitaciones();
        mostrarAlerta(data.message, 'success');
    } catch (err) {
        mostrarAlerta(err.message, 'error');
    }
}

// ============================================
// RESERVACIONES
// ============================================

async function cargarReservaciones() {
    try {
        const response = await fetch('/proyecto-hotel-AGODIC25/controllers/admin_reservaciones.php');
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.message);
        }
        
        estadoAdmin.reservas = data.data;
        renderizarTablaReservaciones();
        
        // Actualizar select de habitaciones
        actualizarSelectHabitaciones();
    } catch (err) {
        console.error('Error cargando reservaciones:', err);
        document.getElementById('reservaciones-table-content').innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
    }
}

function renderizarTablaReservaciones() {
    const contenedor = document.getElementById('reservaciones-table-content');
    
    if (estadoAdmin.reservas.length === 0) {
        contenedor.innerHTML = '<p class="empty-message">No hay reservaciones registradas.</p>';
        return;
    }
    
    let html = '<table>';
    html += `
        <thead>
            <tr>
                <th>Habitación</th>
                <th>Huésped</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Estado</th>
                <th>Plan</th>
                <th>Servicios</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    estadoAdmin.reservas.forEach(res => {
        const estilo_estado = `estado-${res.estado}`;
        const estilo_plan = `plan-${res.plan ? res.plan.replace('_', '-') : 'estandar'}`;
        const servicios = res.servicios || '-';
        
        html += `
            <tr>
                <td>${res.numero_habitacion}</td>
                <td>${escapeHtml(res.nombre_completo)}</td>
                <td>${escapeHtml(res.correo_electronico)}</td>
                <td>${escapeHtml(res.telefono || '-')}</td>
                <td>${formatDate(res.fecha_entrada)}</td>
                <td>${formatDate(res.fecha_salida)}</td>
                <td><span class="estado-badge ${estilo_estado}">${res.estado}</span></td>
                <td><span class="plan-badge ${estilo_plan}">${res.plan || 'estandar'}</span></td>
                <td>${escapeHtml(servicios)}</td>
                <td>
                    <button class="btn-small btn-edit" onclick="editarReserva(${res.id_reserva})">Editar</button>
                    <button class="btn-small" style="background: #673ab7; color: white;" onclick="abrirServicios(${res.id_reserva})">Servicios</button>
                    ${res.estado !== 'cancelada' ? `<button class="btn-small btn-cancel" onclick="cancelarReserva(${res.id_reserva})">Cancelar</button>` : ''}
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    contenedor.innerHTML = html;
}

function actualizarSelectHabitaciones() {
    const select = document.getElementById('r_habitacion');
    let html = '<option value="">Selecciona una habitación</option>';
    
    estadoAdmin.habitaciones.forEach(hab => {
        html += `<option value="${hab.id_habitacion}">Hab. ${hab.numero_habitacion} - ${hab.nombre_habitacion} (${hab.capacidad})</option>`;
    });
    
    select.innerHTML = html;
}

function abrirModalReserva(reservaId = null) {
    const modal = document.getElementById('modal-reserva');
    const form = document.getElementById('form-reserva');
    
    // Asegurar que el select de habitaciones está poblado
    actualizarSelectHabitaciones();
    
    form.reset();
    
    // Resetear checkboxes de servicios
    document.getElementById('r_piscina').checked = false;
    document.getElementById('r_spa').checked = false;
    document.getElementById('r_barra_libre').checked = false;
    document.getElementById('r_comida').checked = false;
    document.getElementById('r_desayuno').checked = false;
    document.getElementById('r_cena').checked = false;
    
    if (reservaId) {
        // Modo edición
        const res = estadoAdmin.reservas.find(r => r.id_reserva === reservaId);
        if (res) {
            document.getElementById('modal-reserva-title').textContent = 'Editar Reservación';
            document.getElementById('r_habitacion').value = res.id_habitacion;
            document.getElementById('r_entrada').value = res.fecha_entrada;
            document.getElementById('r_salida').value = res.fecha_salida;
            document.getElementById('r_nombre').value = res.nombre_completo;
            document.getElementById('r_email').value = res.correo_electronico;
            document.getElementById('r_telefono').value = res.telefono;
            document.getElementById('r_plan').value = res.plan || 'estandar';
            document.getElementById('r_estado').value = res.estado;
            document.getElementById('r_comentarios').value = res.comentarios || '';
            
            // Cargar servicios si existen
            if (res.servicios) {
                // Parsear los servicios desde la cadena concatenada
                const serviciosArray = res.servicios.split(', ').map(s => s.trim().toLowerCase().replace(' ', '_'));
                document.getElementById('r_piscina').checked = serviciosArray.includes('piscina');
                document.getElementById('r_spa').checked = serviciosArray.includes('spa');
                document.getElementById('r_barra_libre').checked = serviciosArray.includes('barra_libre');
                document.getElementById('r_comida').checked = serviciosArray.includes('comida');
                document.getElementById('r_desayuno').checked = serviciosArray.includes('desayuno');
                document.getElementById('r_cena').checked = serviciosArray.includes('cena');
            }
            
            form.dataset.modo = 'edit';
            form.dataset.id = reservaId;
        }
    } else {
        // Modo creación
        document.getElementById('modal-reserva-title').textContent = 'Nueva Reservación';
        form.dataset.modo = 'create';
        delete form.dataset.id;
    }
    
    // Mostrar/ocultar servicios según el plan
    mostrarServiciosCondicional();
    
    modal.classList.add('show');
    estadoAdmin.modalActual = 'reserva';
}

function cerrarModalReserva() {
    document.getElementById('modal-reserva').classList.remove('show');
    estadoAdmin.modalActual = null;
}

async function guardarReserva(e) {
    e.preventDefault();
    
    const form = document.getElementById('form-reserva');
    const modo = form.dataset.modo;
    const plan = document.getElementById('r_plan').value;
    
    
    const servicios = {
        piscina: (plan === 'all_inclusive' && document.getElementById('r_piscina').checked) ? 1 : 0,
        spa: (plan === 'all_inclusive' && document.getElementById('r_spa').checked) ? 1 : 0,
        barra_libre: (plan === 'all_inclusive' && document.getElementById('r_barra_libre').checked) ? 1 : 0,
        comida: (plan === 'all_inclusive' && document.getElementById('r_comida').checked) ? 1 : 0,
        desayuno: (plan === 'all_inclusive' && document.getElementById('r_desayuno').checked) ? 1 : 0,
        cena: (plan === 'all_inclusive' && document.getElementById('r_cena').checked) ? 1 : 0
    };
    
    const datos = {
        id_habitacion: document.getElementById('r_habitacion').value,
        nombre_completo: document.getElementById('r_nombre').value,
        correo_electronico: document.getElementById('r_email').value,
        telefono: document.getElementById('r_telefono').value,
        fecha_entrada: document.getElementById('r_entrada').value,
        fecha_salida: document.getElementById('r_salida').value,
        plan: plan,
        estado: document.getElementById('r_estado').value,
        comentarios: document.getElementById('r_comentarios').value,
        servicios: servicios
    };
    
    try {
        const response = await fetch(`/proyecto-hotel-AGODIC25/controllers/admin_reservaciones.php?action=${modo === 'edit' ? 'update' : 'create'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...datos,
                id_reserva: modo === 'edit' ? parseInt(form.dataset.id) : undefined
            })
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.message);
        }
        
        await cargarReservaciones();
        await cargarDashboard();
        cerrarModalReserva();
        mostrarAlerta(data.message, 'success');
    } catch (err) {
        mostrarAlerta(err.message, 'error');
    }
}

function mostrarServiciosCondicional() {
    const plan = document.getElementById('r_plan').value;
    const serviciosDiv = document.getElementById('servicios-form-group');
    
    if (plan === 'all_inclusive') {
        serviciosDiv.style.display = 'none';
    } else {
        serviciosDiv.style.display = 'block';
        // Deseleccionar todos los checkboxes si se cambia a estandar
        document.getElementById('r_piscina').checked = false;
        document.getElementById('r_spa').checked = false;
        document.getElementById('r_barra_libre').checked = false;
        document.getElementById('r_comida').checked = false;
        document.getElementById('r_desayuno').checked = false;
        document.getElementById('r_cena').checked = false;
    }
}

function editarReserva(reservaId) {
    abrirModalReserva(reservaId);
}

async function cancelarReserva(reservaId) {
    if (!confirm('¿Estás seguro de que deseas cancelar esta reservación?')) {
        return;
    }
    
    try {
        const response = await fetch(`/proyecto-hotel-AGODIC25/controllers/admin_reservaciones.php?action=cancel`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_reserva: reservaId })
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.message);
        }
        
        await cargarReservaciones();
        await cargarDashboard();
        mostrarAlerta(data.message, 'success');
    } catch (err) {
        mostrarAlerta(err.message, 'error');
    }
}

function abrirServicios(reservaId) {
    const modal = document.getElementById('modal-editar-servicios');
    const form = document.getElementById('form-servicios');
    
    form.reset();
    document.getElementById('s_reserva_id').value = reservaId;
    
    // Cargar datos de la reserva
    const res = estadoAdmin.reservas.find(r => r.id_reserva === reservaId);
    if (res) {
        document.getElementById('s_plan').value = res.plan || 'estandar';
        actualizarServiciosDisponibles();
    }
    
    modal.classList.add('show');
    estadoAdmin.modalActual = 'servicios';
}

function cerrarModalServicios() {
    document.getElementById('modal-editar-servicios').classList.remove('show');
    estadoAdmin.modalActual = null;
}

function actualizarServiciosDisponibles() {
    const plan = document.getElementById('s_plan').value;
    const serviciosDiv = document.getElementById('servicios-checkboxes');
    const checkboxes = document.querySelectorAll('input[name="servicios"]');
    
    if (plan === 'estandar') {
        serviciosDiv.style.display = 'block';
        checkboxes.forEach(cb => cb.disabled = false);
    } else {
        serviciosDiv.style.display = 'none';
        checkboxes.forEach(cb => {
            cb.checked = false;
            cb.disabled = true;
        });
    }
}

async function guardarServicios(e) {
    e.preventDefault();
    
    const reservaId = parseInt(document.getElementById('s_reserva_id').value);
    const plan = document.getElementById('s_plan').value;
    const serviciosCheckboxes = document.querySelectorAll('input[name="servicios"]:checked');
    const servicios = Array.from(serviciosCheckboxes).map(cb => ({
        nombre: cb.value,
        costo: parseInt(cb.dataset.costo)
    }));
    
    try {
        const response = await fetch(`/proyecto-hotel-AGODIC25/controllers/admin_reservaciones.php?action=update_servicios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_reserva: reservaId,
                plan: plan,
                servicios: servicios
            })
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.message);
        }
        
        await cargarReservaciones();
        cerrarModalServicios();
        mostrarAlerta(data.message, 'success');
    } catch (err) {
        mostrarAlerta(err.message, 'error');
    }
}

// ============================================
// UTILIDADES
// ============================================

function cerrarSesionAdmin() {
    window.location.href = '/proyecto-hotel-AGODIC25/controllers/logout.php';
}

function mostrarAlerta(mensaje, tipo = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${tipo}`;
    alert.textContent = mensaje;
    
    const main = document.querySelector('.admin-main');
    main.insertBefore(alert, main.firstChild);
    
    setTimeout(() => {
        alert.remove();
    }, 4000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

// CARGAR Y RENDERIZAR USUARIOS
async function cargarUsuarios() {
    try {
        const response = await fetch('/proyecto-hotel-AGODIC25/controllers/admin_estadisticas.php');
        if (!response.ok) throw new Error('Error fetching users');
        
        const data = await response.json();
        renderizarTablaUsuarios(data.usuarios);
    } catch (err) {
        console.error('Error cargando usuarios:', err);
        document.getElementById('usuarios-table-content').innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
    }
}

function renderizarTablaUsuarios(usuarios) {
    if (!usuarios || !Array.isArray(usuarios) || usuarios.length === 0) {
        document.getElementById('usuarios-table-content').innerHTML = '<p class="empty-message">No hay usuarios.</p>';
        return;
    }
    
    let html = '<table>';
    html += `
        <thead>
            <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Reservaciones</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    usuarios.forEach(usuario => {
        const badgeClass = usuario.rol === 'administrador' ? 'badge-admin' : usuario.rol === 'recepcionista' ? 'badge-recepcionista' : 'badge-cliente';
        
        html += `
            <tr>
                <td>#${usuario.id_usuario}</td>
                <td>${usuario.email}</td>
                <td><span class="${badgeClass}">${usuario.rol}</span></td>
                <td>${usuario.total_reservaciones}</td>
            </tr>
        `;
    });
    
    html += `
        </tbody>
        </table>
    `;
    
    document.getElementById('usuarios-table-content').innerHTML = html;
}

// Cerrar modales al hacer clic fuera
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
        estadoAdmin.modalActual = null;
    }
});
