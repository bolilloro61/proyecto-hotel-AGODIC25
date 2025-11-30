// Cargar perfil del usuario
async function cargarPerfil() {
    try {
        const response = await fetch('/proyecto-hotel-AGODIC25/controllers/obtener_usuario.php');
        const data = await response.json();

        if (!data.ok || !data.usuario) {
            document.getElementById('perfil-content').innerHTML = `
                <div class="empty-message">
                    <p>Por favor <a href="login.html">inicia sesión</a> para ver tu perfil.</p>
                </div>
            `;
            return;
        }

        const usuario = data.usuario;
            // Guardar usuarioId globalmente para reuso
            window.usuarioId = usuario.id_usuario;
            mostrarPerfil(usuario);
            cargarReservas(usuario.id_usuario);

    } catch (err) {
        console.error('Error al cargar perfil:', err);
        document.getElementById('perfil-content').innerHTML = `
            <div class="empty-message">
                <p>Error al cargar el perfil. Por favor intenta de nuevo.</p>
            </div>
        `;
    }
}

// Mostrar información del perfil
function mostrarPerfil(usuario) {
    const contenedor = document.getElementById('perfil-content');
    
    const html = `
        <div class="perfil-header">
            <div class="perfil-info">
                <h2>Mi Perfil</h2>
                <div class="info-fila">
                    <span>Email:</span>
                    <span>${escapeHtml(usuario.email)}</span>
                </div>
                <div class="info-fila">
                    <span>Rol:</span>
                    <span>${escapeHtml(usuario.rol)}</span>
                </div>
            </div>
            <div class="btn-group">
                <button class="btn btn-primary" onclick="editarPerfil()">Editar Perfil</button>
                <button class="btn btn-secondary" onclick="cerrarSesion()">Cerrar Sesión</button>
            </div>
        </div>
        <div class="reservas-section">
            <h3>Mis Reservas</h3>
            <div id="reservas-list">
                <p style="text-align: center; color: #999;">Cargando reservas...</p>
            </div>
        </div>
    `;
    
    contenedor.innerHTML = html;
}

// Cargar reservas del usuario
async function cargarReservas(usuarioId) {
    try {
        const response = await fetch(`/proyecto-hotel-AGODIC25/controllers/mis_reservaciones.php?usuario_id=${usuarioId}`);
        const data = await response.json();

        const contenedor = document.getElementById('reservas-list');

        if (!data.ok || !data.reservaciones || data.reservaciones.length === 0) {
            contenedor.innerHTML = `
                <div class="empty-message">
                    <p>No tienes reservas aún. <a href="index.html">¡Reserva ahora!</a></p>
                </div>
            `;
            return;
        }

        // Guardar para uso en verDetalles
        window.perfilReservas = data.reservaciones || [];

        let html = '';
        data.reservaciones.forEach(reserva => {
            const classEstado = `estado ${reserva.estado.toLowerCase()}`;
            
            // Calcular si se puede cancelar (permitir cancelar 'pendiente' o 'confirmada' si faltan >48h)
            let puedeCancel = false;
            let mensajeCancelacion = '';

            const estadoLower = (reserva.estado || '').toLowerCase();
            if (estadoLower === 'confirmada' || estadoLower === 'pendiente') {
                const horaCheckIn = new Date(reserva.fecha_entrada);
                horaCheckIn.setHours(12, 0, 0); // Check-in a las 12:00
                const ahora = new Date();
                const diferencia = horaCheckIn - ahora;
                const horas = diferencia / (1000 * 60 * 60);

                if (horas > 48) {
                    puedeCancel = true;
                    const diasRestantes = Math.floor(horas / 24);
                    mensajeCancelacion = `(${diasRestantes} días restantes)`;
                } else if (horas > 0) {
                    mensajeCancelacion = `(Menos de 48 horas - no se puede cancelar)`;
                } else {
                    mensajeCancelacion = `(Ya pasó el check-in)`;
                }
            }
            
            html += `
                <div class="reserva-card">
                    <div class="reserva-info">
                        <strong>Habitación ${reserva.numero_habitacion}</strong>
                        <span>Entrada: ${formatDate(reserva.fecha_entrada)}</span>
                        <span>Salida: ${formatDate(reserva.fecha_salida)}</span>
                    </div>
                    <div class="reserva-info">
                        <span class="${classEstado}">${reserva.estado}</span>
                        <span>ID Reserva: #${reserva.id_reserva}</span>
                        ${reserva.estado.toLowerCase() === 'confirmada' ? `<span style="font-size: 0.85rem; color: #999;">${mensajeCancelacion}</span>` : ''}
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <button class="btn btn-secondary" onclick="verDetalles(${reserva.id_reserva})">Ver Detalles</button>
                            ${puedeCancel ? `<button class="btn btn-secondary" style="background: #f8d7da; color: #721c24;" onclick="cancelarReserva(${reserva.id_reserva})">Cancelar</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        contenedor.innerHTML = html;

    } catch (err) {
        console.error('Error al cargar reservas:', err);
        document.getElementById('reservas-list').innerHTML = `
            <div class="empty-message">
                <p>Error al cargar las reservas.</p>
            </div>
        `;
    }
}

// Editar perfil
function editarPerfil() {
    alert('La función de editar perfil estará disponible pronto.');
}

// Ver detalles de reserva
function verDetalles(reservaId) {
    const reservas = window.perfilReservas || [];
    const res = reservas.find(r => r.id_reserva === reservaId);
    if (!res) {
        alert('No se encontró la reservación');
        return;
    }

    // Crear modal simple
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.position = 'fixed';
    modal.style.left = 0;
    modal.style.top = 0;
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.id = 'modal-detalles-reserva';

    const content = document.createElement('div');
    content.style.background = 'white';
    content.style.padding = '1.5rem';
    content.style.borderRadius = '8px';
    content.style.maxWidth = '720px';
    content.style.width = '90%';

    const serviciosText = res.servicios || 'Ninguno';

    content.innerHTML = `
        <h3>Detalle Reserva #${res.id_reserva}</h3>
        <p><strong>Habitación:</strong> ${res.numero_habitacion || '-'} </p>
        <p><strong>Entrada:</strong> ${formatDate(res.fecha_entrada)}</p>
        <p><strong>Salida:</strong> ${formatDate(res.fecha_salida)}</p>
        <p><strong>Estado:</strong> ${res.estado}</p>
        <p><strong>Servicios:</strong> ${serviciosText}</p>
        <div style="display:flex;gap:.5rem;margin-top:1rem; justify-content:flex-end;">
            <button id="cerrar-detalle" class="btn btn-secondary">Cerrar</button>
            <button id="cancelar-desde-detalle" class="btn btn-secondary" style="background:#f8d7da;color:#721c24;">Cancelar Reserva</button>
        </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('cerrar-detalle').addEventListener('click', () => modal.remove());

    // Determinar si el usuario puede cancelar (48 horas) — permitir en 'pendiente' y 'confirmada'
    const horaCheckIn = new Date(res.fecha_entrada);
    horaCheckIn.setHours(12, 0, 0);
    const ahora = new Date();
    const segundosRestantes = (horaCheckIn.getTime() - ahora.getTime()) / 1000;
    const estadoLower = (res.estado || '').toLowerCase();
    const puedeCancelar = (estadoLower === 'confirmada' || estadoLower === 'pendiente') && (segundosRestantes > (48 * 3600));

    const btnCancelar = document.getElementById('cancelar-desde-detalle');
    if (!puedeCancelar) {
        btnCancelar.style.display = 'none';
    } else {
        btnCancelar.addEventListener('click', async () => {
            if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) return;
            try {
                const resp = await fetch('/proyecto-hotel-AGODIC25/controllers/cancelar_reservacion.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_reserva: reservaId })
                });

                const raw = await resp.text();
                let data;
                try { data = JSON.parse(raw); } catch (err) { console.error('Respuesta inválida:', raw); alert('Error del servidor'); return; }

                if (data.ok) {
                    alert('Reserva cancelada correctamente');
                    modal.remove();
                    cargarReservas(window.usuarioId || null);
                    cargarPerfil();
                } else {
                    alert('Error al cancelar: ' + data.message);
                }
            } catch (err) {
                console.error('Error:', err);
                alert('Error al cancelar la reserva');
            }
        });
    }
}

// Cancelar reserva
async function cancelarReserva(reservaId) {
    if (!confirm('¿Estás seguro de que deseas cancelar esta reserva? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const response = await fetch('/proyecto-hotel-AGODIC25/controllers/cancelar_reservacion.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_reserva: reservaId })
        });

        const raw = await response.text();
        let data;
        try {
            data = JSON.parse(raw);
        } catch (err) {
            console.error('Respuesta inválida al cancelar reserva:', raw);
            throw new Error('Respuesta inválida del servidor');
        }

        if (data.ok) {
            alert('Reserva cancelada exitosamente.');
            cargarReservas(data.usuario_id);
            cargarPerfil();
        } else {
            alert('Error al cancelar la reserva: ' + data.message);
        }
    } catch (err) {
        console.error('Error al cancelar reserva:', err);
        alert('Error al cancelar la reserva. Por favor intenta de nuevo.');
    }
}

// Cerrar sesión
function cerrarSesion() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        window.location.href = '/proyecto-hotel-AGODIC25/controllers/logout.php';
    }
}

// Utilidades
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
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

// Inicializar cuando DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('perfil.js: DOMContentLoaded');
    cargarPerfil();
});
