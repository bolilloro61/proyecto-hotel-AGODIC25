// Estado de la aplicación
let estadoReserva = {
    habitacion: null,
    usuarioEmail: ''
};

// Obtener ID de habitación desde URL
function obtenerIdHabitacion() {
    const params = new URLSearchParams(window.location.search);
    return params.get('habitacion');
}

// Cargar datos de la habitación
async function cargarHabitacion() {
    const id = obtenerIdHabitacion();
    console.log('cargarHabitacion: habitacion ID =', id);
    
    if (!id) {
        mostrarError('No se especificó una habitación');
        return;
    }

    try {
        // Cargar todas las habitaciones (necesitamos este controlador)
        const url = `../controllers/habitaciones.php`;
        console.log('Fetch a:', url);
        const response = await fetch(url);
        const data = await response.json();

        console.log('Respuesta habitaciones:', data);

        if (!data.ok || !data.data) {
            mostrarError('Error al cargar las habitaciones');
            return;
        }

        // Buscar la habitación específica
        const habitacion = data.data.find(h => h.id_habitacion == id);
        console.log('Habitación encontrada:', habitacion);
        
        if (!habitacion) {
            mostrarError('Habitación no encontrada. ID: ' + id);
            return;
        }

        estadoReserva.habitacion = habitacion;
        renderizarDetalles();
    } catch (err) {
        console.error('Error en cargarHabitacion:', err);
        mostrarError('Error al cargar la habitación: ' + err.message);
    }
}

// Obtener fechas del sessionStorage (vienen desde index.html)
function obtenerFechasDelFiltro() {
    const fechaEntrada = sessionStorage.getItem('filtro_fecha_entrada') || '';
    const fechaSalida = sessionStorage.getItem('filtro_fecha_salida') || '';
    const capacidad = sessionStorage.getItem('filtro_capacidad') || '';
    return { fechaEntrada, fechaSalida, capacidad };
}

// Renderizar detalles de la habitación
function renderizarDetalles() {
    console.log('renderizarDetalles: iniciando');
    const h = estadoReserva.habitacion;
    const contenedor = document.getElementById('habitacion__detalles');
    // Usar imagen de la BD, si no existe usar placeholder
    const imgFile = h.imagen && h.imagen.trim() !== '' ? h.imagen : 'placeholder.jpg';
    const imgSrc = `../assets/img/${imgFile}`;
    const { fechaEntrada, fechaSalida } = obtenerFechasDelFiltro();

    console.log('Habitación:', h);
    console.log('Fechas del filtro:', { fechaEntrada, fechaSalida });

    const precioFormato = formatPrice(h.precio);

    contenedor.innerHTML = `
        <div class="habitacion__detalle">
            <!-- LADO IZQUIERDO: Imagen, Nombre, Servicios -->
            <div class="habitacion__izquierda">
                <div class="habitacion__imagen">
                    <img src="${imgSrc}" alt="${escapeHtml(h.nombre_habitacion)}" onerror="this.src='../assets/img/placeholder.jpg';" />
                </div>

                <h2 style="margin-top: 1.5rem; margin-bottom: 0.5rem; color: #1a1a1a;">${escapeHtml(h.nombre_habitacion || ('Habitación ' + h.numero_habitacion))}</h2>

                <div id="servicios__lista" style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin-top: 1rem;">
                    <h4 style="margin-bottom: 1rem; color: #1a1a1a;">Servicios disponibles:</h4>
                    <div id="servicios__contenedor" style="display: grid; grid-template-columns: 1fr; gap: 0.75rem;">
                        <!-- Se llenará dinámicamente -->
                    </div>
                </div>
            </div>

            <!-- LADO DERECHO: Información, Descripción, Precio y Formulario -->
            <div class="habitacion__derecha">
                <div style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 1rem; color: #1a1a1a;">Información de la habitación</h4>
                    <p style="color: #666; margin-bottom: 1rem; line-height: 1.5;">${escapeHtml(h.descripcion || '')}</p>
                    
                    <div class="resumen__fila">
                        <span><strong>Capacidad:</strong></span>
                        <span>${escapeHtml(h.capacidad)}</span>
                    </div>
                    <div class="resumen__fila">
                        <span><strong>Precio por noche:</strong></span>
                        <span style="font-size: 1.2rem; color: #c41e3a; font-weight: 600;">${precioFormato}</span>
                    </div>
                </div>

                <div id="formulario__contenedor" class="formulario__contenedor">
                    <!-- Se llenará dinámicamente -->
                </div>
            </div>
        </div>
    `;

    // Mostrar formulario de reserva
    mostrarFormularioReserva();
}

// Obtener fecha mínima permitida (hoy)
function obtenerFechaMinima() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    const resultado = `${year}-${month}-${day}`;
    console.log('Fecha mínima:', resultado);
    return resultado;
}

// Mostrar formulario de reserva
function mostrarFormularioReserva() {
    console.log('mostrarFormularioReserva: generando formulario');
    const h = estadoReserva.habitacion;
    const { fechaEntrada, fechaSalida } = obtenerFechasDelFiltro();
    const fechaMinima = obtenerFechaMinima();
    const contenedor = document.getElementById('formulario__contenedor');
    const serviciosListaContenedor = document.getElementById('servicios__contenedor');

    // Construir campos de fecha solo si vienen del filtro
    let camposFechas = '';
    if (fechaEntrada && fechaSalida) {
        camposFechas = `
            <div class="formulario__grupo">
                <label for="fecha_entrada">Fecha de entrada *</label>
                <input type="date" id="fecha_entrada" name="fecha_entrada" value="${fechaEntrada}" min="${fechaMinima}" required />
            </div>
            <div class="formulario__grupo">
                <label for="fecha_salida">Fecha de salida *</label>
                <input type="date" id="fecha_salida" name="fecha_salida" value="${fechaSalida}" min="${fechaMinima}" required />
            </div>
        `;
    } else {
        camposFechas = `
            <div class="formulario__grupo">
                <label for="fecha_entrada">Fecha de entrada *</label>
                <input type="date" id="fecha_entrada" name="fecha_entrada" min="${fechaMinima}" required />
            </div>
            <div class="formulario__grupo">
                <label for="fecha_salida">Fecha de salida *</label>
                <input type="date" id="fecha_salida" name="fecha_salida" min="${fechaMinima}" required />
            </div>
        `;
    }

    // Formulario de reserva
    contenedor.innerHTML = `
        <form class="formulario__reserva" id="form__reserva">
            ${camposFechas}
            
            <div class="formulario__grupo full">
                <label for="plan">Plan de hospedaje * (ENUM: estandar, all_inclusive)</label>
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="radio" name="plan" value="estandar" checked />
                        <span>Estándar (Base)</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="radio" name="plan" value="all_inclusive" />
                        <span>All-Inclusive (x2 precio)</span>
                    </label>
                </div>
            </div>

            <div class="formulario__grupo">
                <label for="nombre">Nombre Completo *</label>
                <input type="text" id="nombre" name="nombre" required />
            </div>
            <div class="formulario__grupo">
                <label for="email">Email *</label>
                <input type="email" id="email" name="email" value="${estadoReserva.usuarioEmail}" required />
            </div>
            <div class="formulario__grupo">
                <label for="telefono">Teléfono *</label>
                <input type="tel" id="telefono" name="telefono" required />
            </div>
            <div class="formulario__grupo full">
                <label for="comentarios">Comentarios especiales</label>
                <textarea id="comentarios" name="comentarios"></textarea>
            </div>
            <!-- ===== Sección de Pago dentro del mismo formulario (permitir llenar todo al reservar) ===== -->
            <div class="formulario__grupo full" id="pago__contenedor">
                <h3>Información de Pago</h3>
                <div style="display: grid; gap: .75rem;">
                    <label style="display:flex; align-items:center; gap:.5rem;">
                        <input type="radio" name="pago_metodo" value="tarjeta" checked />
                        <span>Tarjeta (pagos en línea)</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:.5rem;">
                        <input type="radio" name="pago_metodo" value="paypal" />
                        <span>PayPal</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:.5rem;">
                        <input type="radio" name="pago_metodo" value="efectivo" />
                        <span>Pagar en Recepción (efectivo)</span>
                    </label>

                    <div id="pago_tarjeta_campos" style="margin-top:.5rem;">
                        <input type="text" id="pago_nombre_tarjeta" name="pago_nombre_tarjeta" placeholder="Nombre en la tarjeta" />
                        <input type="text" id="pago_numero_tarjeta" name="pago_numero_tarjeta" placeholder="Número de tarjeta (solo para simulación)" />
                        <div style="display:flex; gap: .5rem;">
                            <input type="text" id="pago_fecha_expiracion" name="pago_fecha_expiracion" placeholder="MM/AA" />
                            <input type="text" id="pago_cvv" name="pago_cvv" placeholder="CVV" />
                        </div>
                    </div>

                    <div id="pago_paypal_campos" style="display:none; margin-top:.5rem;">
                        <input type="email" id="pago_email_paypal" name="pago_email_paypal" placeholder="Email PayPal" />
                    </div>

                    <div id="pago_efectivo_campos" style="display:none; margin-top:.5rem; color:#666;">
                        <p>Seleccionaste pagar en recepción. La reserva se guardará y el pago quedará pendiente hasta tu llegada.</p>
                        <label style="display:flex; align-items:center; gap:.5rem;">
                            <input type="checkbox" id="pago_confirmar_efectivo" name="pago_confirmar_efectivo" />
                            <span>Confirmo que pagaré en recepción</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Resumen de precio -->
            <div class="formulario__grupo full" id="resumen_precio" style="background:#fff8f9;border:1px solid #f2d7da;padding:1rem;border-radius:6px;margin-bottom:1rem;">
                <div style="display:flex;justify-content:space-between;margin-bottom:.5rem;">
                    <strong>Precio por noche:</strong>
                    <span id="precio_por_noche">-</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:.5rem;">
                    <strong>Noches:</strong>
                    <span id="noches_total">-</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:.5rem;">
                    <strong>Costo servicios:</strong>
                    <span id="costo_servicios_resumen">$0</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:.5rem;font-size:1.1rem;font-weight:700;color:#c41e3a;">
                    <span>Total a pagar:</span>
                    <span id="precio_total">$0.00</span>
                </div>
                <div id="tarifa_ajuste" style="font-size:.85rem;color:#666;margin-top:.25rem;"></div>
            </div>

            <button type="submit" class="btn__reservar">Confirmar Reserva y Pago</button>
        </form>
    `;

    // Mostrar servicios en el lado izquierdo
    serviciosListaContenedor.innerHTML = `
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.5rem;">
            <input type="checkbox" name="servicios" value="piscina" data-costo="150" />
            <span>Acceso a Piscina (+$150)</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.5rem;">
            <input type="checkbox" name="servicios" value="spa" data-costo="300" />
            <span>Acceso a Spa (+$300)</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.5rem;">
            <input type="checkbox" name="servicios" value="barra_libre" data-costo="200" />
            <span>Barra Libre (+$200)</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.5rem;">
            <input type="checkbox" name="servicios" value="comida" data-costo="250" />
            <span>Comida (+$250)</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.5rem;">
            <input type="checkbox" name="servicios" value="desayuno" data-costo="120" />
            <span>Desayuno (+$120)</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.5rem;">
            <input type="checkbox" name="servicios" value="cena" data-costo="200" />
            <span>Cena (+$200)</span>
        </label>
        <p style="margin-top: 1rem; color: #1a2b49; font-weight: 600;">Costo servicios: $0</p>
    `;

    document.getElementById('formulario__contenedor').style.display = 'block';

    // Agregar event listeners
    const planInputs = document.querySelectorAll('input[name="plan"]');
    const serviciosCheckboxes = document.querySelectorAll('input[name="servicios"]');
    const costoServiciosEl = serviciosListaContenedor.querySelector('p');

    planInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (input.value === 'estandar') {
                document.getElementById('servicios__lista').style.display = 'block';
            } else {
                document.getElementById('servicios__lista').style.display = 'none';

    // Fallback: si por alguna razón la sección de pago no aparece, crear una caja visible y fija
    function ensurePagoVisibleFallback() {
        try {
            const pagoCont = document.getElementById('pago__contenedor');
            if (pagoCont && pagoCont.offsetParent !== null) {
                // Ya es visible
                return;
            }

            // Si no existe o está oculto, crear un fallback en la parte inferior derecha
            const existingFallback = document.getElementById('pago__inmediato');
            if (existingFallback) return;

            const fallback = document.createElement('div');
            fallback.id = 'pago__inmediato';
            fallback.style.position = 'fixed';
            fallback.style.right = '20px';
            fallback.style.bottom = '20px';
            fallback.style.width = '360px';
            fallback.style.maxWidth = 'calc(100% - 40px)';
            fallback.style.background = 'white';
            fallback.style.border = '2px solid #f0f0f0';
            fallback.style.borderRadius = '8px';
            fallback.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
            fallback.style.padding = '1rem';
            fallback.style.zIndex = 9999;

            fallback.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:.5rem;">
                    <strong>Pago</strong>
                    <button id="cerrar_pago_fallback" style="background:transparent;border:none;cursor:pointer;font-size:16px;">✕</button>
                </div>
                <div style="font-size:14px;color:#333;margin-bottom:.5rem;">Completa tu pago aquí</div>
                <div style="display:grid;gap:.5rem;">
                    <select id="fallback_metodo_pago">
                        <option value="tarjeta">Tarjeta</option>
                        <option value="paypal">PayPal</option>
                        <option value="efectivo">Efectivo</option>
                    </select>
                    <input id="fallback_nombre_tarjeta" placeholder="Nombre en tarjeta" />
                    <input id="fallback_numero_tarjeta" placeholder="Número tarjeta" />
                    <div style="display:flex;gap:.5rem;">
                        <input id="fallback_fecha_exp" placeholder="MM/AA" />
                        <input id="fallback_cvv" placeholder="CVV" />
                    </div>
                    <button id="fallback_confirmar" style="background:#c41e3a;color:#fff;border:none;padding:.6rem;border-radius:4px;cursor:pointer;">Confirmar</button>
                </div>
            `;

            document.body.appendChild(fallback);

            document.getElementById('cerrar_pago_fallback').addEventListener('click', () => {
                fallback.remove();
            });

            document.getElementById('fallback_confirmar').addEventListener('click', async () => {
                // Copiar valores al formulario real si existe, luego enviar
                const metodo = document.getElementById('fallback_metodo_pago').value;
                const nombre = document.getElementById('fallback_nombre_tarjeta').value;
                const numero = document.getElementById('fallback_numero_tarjeta').value;
                const fecha = document.getElementById('fallback_fecha_exp').value;

                // Intentar rellenar el formulario principal si existe
                const pagoRadio = document.querySelector(`input[name="pago_metodo"][value="${metodo}"]`);
                if (pagoRadio) pagoRadio.click();
                const elNombre = document.getElementById('pago_nombre_tarjeta');
                const elNumero = document.getElementById('pago_numero_tarjeta');
                const elFecha = document.getElementById('pago_fecha_expiracion');
                if (elNombre) elNombre.value = nombre;
                if (elNumero) elNumero.value = numero;
                if (elFecha) elFecha.value = fecha;

                // Si el formulario principal existe, submitearlo
                const form = document.getElementById('form__reserva');
                if (form) {
                    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });

        } catch (err) {
            console.warn('ensurePagoVisibleFallback error:', err);
        }
    }
                // Desmarcar todos los servicios
                serviciosCheckboxes.forEach(cb => cb.checked = false);
                actualizarCostoServicios();
            }
            calcularPrecioDinamico();
        });
    });

    serviciosCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            actualizarCostoServicios();
            calcularPrecioDinamico();
        });
    });

    // Event listeners para campos de pago (dentro del mismo formulario)
    const pagoMetodos = document.querySelectorAll('input[name="pago_metodo"]');
    pagoMetodos.forEach(pm => pm.addEventListener('change', function() {
        const val = this.value;
        document.getElementById('pago_tarjeta_campos').style.display = val === 'tarjeta' ? 'block' : 'none';
        document.getElementById('pago_paypal_campos').style.display = val === 'paypal' ? 'block' : 'none';
        document.getElementById('pago_efectivo_campos').style.display = val === 'efectivo' ? 'block' : 'none';
    }));

    // Agregar event listeners para fechas
    const fechaEntradaEl = document.getElementById('fecha_entrada');
    const fechaSalidaEl = document.getElementById('fecha_salida');

    if (fechaEntradaEl) {
        fechaEntradaEl.addEventListener('change', calcularPrecioDinamico);
    }
    if (fechaSalidaEl) {
        fechaSalidaEl.addEventListener('change', calcularPrecioDinamico);
    }

    function actualizarCostoServicios() {
        let costo = 0;
        serviciosCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                costo += parseInt(checkbox.dataset.costo);
            }
        });
        costoServiciosEl.textContent = `Costo servicios: $${costo}`;
    }

    async function calcularPrecioDinamico() {
        const fechaEntrada = document.getElementById('fecha_entrada').value;
        const fechaSalida = document.getElementById('fecha_salida').value;
        const plan = document.querySelector('input[name="plan"]:checked')?.value || 'estandar';
        
        // Validar que las fechas no sean vacías
        if (!fechaEntrada || !fechaSalida) {
            return;
        }

        // Validar que la fecha de salida sea posterior a la de entrada
        if (new Date(fechaEntrada) >= new Date(fechaSalida)) {
            return;
        }

        try {
            // calcular_precio.php espera parámetros GET: id_habitacion, fecha_entrada, fecha_salida, plan
            const idHab = estadoReserva.habitacion && estadoReserva.habitacion.id_habitacion ? estadoReserva.habitacion.id_habitacion : estadoReserva.habitacion;
            const qs = new URLSearchParams({
                id_habitacion: String(idHab),
                fecha_entrada: fechaEntrada,
                fecha_salida: fechaSalida,
                plan: plan
            });
            const url = `../controllers/calcular_precio.php?${qs.toString()}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.ok) {
                // Calcular costo de servicios seleccionado en el formulario
                let serviciosCosto = 0;
                try {
                    serviciosCheckboxes.forEach(cb => {
                        if (cb.checked) serviciosCosto += parseFloat(cb.dataset.costo || 0);
                    });
                } catch (err) {
                    serviciosCosto = 0;
                }

                // Actualizar el display de precio
                const precioTotalEl = document.getElementById('precio_total');
                const precioPorNocheEl = document.getElementById('precio_por_noche');
                const tarjetaHabitacionEl = document.querySelector('.tarjeta__habitacion__precio');
                const nochesEl = document.getElementById('noches_total');
                const costoServiciosResumen = document.getElementById('costo_servicios_resumen');

                // Compute total including services
                const precioBaseTotal = Number(data.precio_total) || 0;
                const totalConServicios = precioBaseTotal + (Number(serviciosCosto) || 0);

                if (precioTotalEl) {
                    precioTotalEl.textContent = `$${totalConServicios.toFixed(2)}`;
                }
                if (precioPorNocheEl) {
                    precioPorNocheEl.textContent = `$${(Number(data.precio_por_noche) || 0)}/noche`;
                }
                if (tarjetaHabitacionEl) {
                    tarjetaHabitacionEl.textContent = `$${(Number(data.precio_por_noche) || 0)}/noche`;
                }
                if (costoServiciosResumen) {
                    costoServiciosResumen.textContent = `$${(serviciosCosto || 0).toFixed(2)}`;
                }

                // Calcular número de noches
                try {
                    const d1 = new Date(fechaEntrada);
                    const d2 = new Date(fechaSalida);
                    let noches = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
                    if (nochesEl) nochesEl.textContent = noches;
                } catch (err) {
                    if (nochesEl) nochesEl.textContent = '-';
                }

                // Guardar monto en el estado para usos posteriores
                estadoReserva.monto = totalConServicios;

                // Mostrar ajuste de tarifa si existe
                if (data.porcentaje_tarifa && data.porcentaje_tarifa !== 1) {
                    const tarifaAjuste = document.getElementById('tarifa_ajuste');
                    if (tarifaAjuste) {
                        const porcentajeDisplay = Math.round((data.porcentaje_tarifa - 1) * 100);
                        if (porcentajeDisplay > 0) {
                            tarifaAjuste.textContent = `(+${porcentajeDisplay}% temporada alta)`;
                        } else if (porcentajeDisplay < 0) {
                            tarifaAjuste.textContent = `(${porcentajeDisplay}% temporada baja)`;
                        } else {
                            tarifaAjuste.textContent = '';
                        }
                    }
                }
            } else {
                console.error('Error al calcular precio:', data.message);
            }
        } catch (error) {
            console.error('Error en calcularPrecioDinamico:', error);
        }
    }

    // Configurar envío del formulario
    const formulario = document.getElementById('form__reserva');
    if (!formulario) {
        console.error('mostrarFormularioReserva: no se encontró #form__reserva');
        return;
    }

    formulario.addEventListener('submit', function(e) {
        console.log('Formulario submit evento disparado');
        e.preventDefault();
        enviarReserva(e);
    });
}

// Enviar reserva
async function enviarReserva(e) {
    const nombre = (document.getElementById('nombre').value || '').trim();
    const email = (document.getElementById('email').value || '').trim();
    const telefono = (document.getElementById('telefono').value || '').trim();
    const fechaEntrada = (document.getElementById('fecha_entrada').value || '').trim();
    const fechaSalida = (document.getElementById('fecha_salida').value || '').trim();
    const comentarios = (document.getElementById('comentarios').value || '').trim();
    
    // Obtener plan y servicios (enviar flags 1/0 para cada servicio)
    const plan = document.querySelector('input[name="plan"]:checked').value;
    const allServiciosCheckboxes = document.querySelectorAll('input[name="servicios"]');
    const servicios = Array.from(allServiciosCheckboxes).map(cb => {
        const nombreServicio = cb.value;
        const costoServicio = parseInt(cb.dataset.costo) || 0;
        // Si es all_inclusive, marcar incluido = 1 para todas las casillas
        const incluido = plan === 'all_inclusive' ? 1 : (cb.checked ? 1 : 0);
        return {
            nombre: nombreServicio,
            costo: costoServicio,
            incluido: incluido
        };
    });

    console.log('enviarReserva: iniciando con datos:', { nombre, email, telefono, fechaEntrada, fechaSalida, plan, servicios });

    if (!nombre || !email || !telefono || !fechaEntrada || !fechaSalida) {
        alert('Por favor completa todos los campos requeridos');
        return;
    }

    if (new Date(fechaEntrada) >= new Date(fechaSalida)) {
        alert('La fecha de salida debe ser posterior a la fecha de entrada');
        return;
    }

    // Preparar datos de reserva
    const datosReserva = {
        habitacion: estadoReserva.habitacion,
        nombre,
        email,
        telefono,
        fechaEntrada,
        fechaSalida,
        comentarios,
        plan,
        servicios
    };

    // Recoger datos de pago (si el usuario los llenó en el formulario)
    try {
        const metodoPago = document.querySelector('input[name="pago_metodo"]:checked')?.value || null;
        const pago = { metodo: metodoPago };

        if (metodoPago === 'tarjeta') {
            const numeroTarjeta = (document.getElementById('pago_numero_tarjeta')?.value || '').replace(/\s/g, '');
            pago.tarjeta_last4 = numeroTarjeta.length >= 4 ? numeroTarjeta.slice(-4) : '';
            pago.nombre_tarjeta = document.getElementById('pago_nombre_tarjeta')?.value || '';
            pago.fecha_expiracion = document.getElementById('pago_fecha_expiracion')?.value || '';
            // No enviamos CVV completo al servidor por seguridad
        } else if (metodoPago === 'paypal') {
            pago.email_paypal = document.getElementById('pago_email_paypal')?.value || '';
        } else if (metodoPago === 'efectivo') {
            pago.confirmar = document.getElementById('pago_confirmar_efectivo')?.checked ? 1 : 0;
        }

        datosReserva.pago = pago;
    } catch (err) {
        console.warn('No se pudieron leer campos de pago:', err);
    }

    console.log('datosReserva preparado:', datosReserva);

    try {
        // Crear la reserva en la base de datos
        console.log('POST a crear_reserva.php...');
        const crearReservaResponse = await fetch('../controllers/crear_reserva.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosReserva)
        });

        console.log('Respuesta recibida, status:', crearReservaResponse.status);
        const rawText = await crearReservaResponse.text();
        let crearReservaResult = null;
        try {
            // El servidor debe retornar JSON limpio; intentar parsear
            crearReservaResult = JSON.parse(rawText);
        } catch (err) {
            console.error('Error parseando JSON de crear_reserva.php:', err);
            console.error('Respuesta cruda del servidor:', rawText);
            alert('Error en la respuesta del servidor al crear la reserva. Revisa consola para más detalles.');
            return;
        }

        console.log('Resultado JSON:', crearReservaResult);

        if (!crearReservaResult.ok) {
            alert('Error al crear la reserva: ' + crearReservaResult.message);
            return;
        }

        console.log('Reserva creada exitosamente, ID:', crearReservaResult.reserva_id);
        
        // Guardar datos de la reserva en el estado
        estadoReserva.reserva_id = crearReservaResult.reserva_id;
        // Normalizar monto recibido del servidor a número (evitar strings/objetos)
        if (crearReservaResult.monto !== undefined && crearReservaResult.monto !== null) {
            const mNum = Number(crearReservaResult.monto);
            estadoReserva.monto = !isNaN(mNum) ? mNum : (estadoReserva.monto || 0);
        } else {
            estadoReserva.monto = estadoReserva.monto || 0;
        }
        estadoReserva.plan = crearReservaResult.plan;
        estadoReserva.servicios = crearReservaResult.servicios;
        
        // Mostrar confirmación o mensaje final
        if (crearReservaResult.pago && crearReservaResult.pago.estado === 'pagado') {
            mostrarConfirmacionPago();
        } else {
            // Si el pago quedó pendiente (efectivo o fallo), mostrar mensaje de reserva creada
            mostrarConfirmacionPago();
        }

    } catch (err) {
        console.error('Error catch:', err);
        alert('Error al procesar la reserva: ' + err.message);
    }
}

// Mostrar error
function mostrarError(mensaje) {
    const contenedor = document.getElementById('habitacion__detalles');
    contenedor.innerHTML = `<div class="error">${escapeHtml(mensaje)}</div>`;
}

// Mostrar formulario de pago
function mostrarFormularioPago() {
    console.log('mostrarFormularioPago: generando formulario de pago');
    
    // Ocultar el botón de envío del formulario de reserva y mostrar pago
    const formReserva = document.getElementById('form__reserva');
    const btnReservar = formReserva ? formReserva.querySelector('button[type="submit"]') : null;
    if (btnReservar) {
        btnReservar.style.display = 'none';
    }
    
    // Crear elemento para la sección de pago
    const pagoSeccion = document.createElement('div');
    pagoSeccion.className = 'pago-seccion';
    pagoSeccion.id = 'seccion-pago';
    pagoSeccion.innerHTML = `
        <div class="pago-header">
            <h2>Completar Pago</h2>
            <p>Reserva #${estadoReserva.reserva_id}</p>
        </div>

        <div class="resumen-pago">
            <h3>Resumen de tu Reserva</h3>
            <div class="resumen-fila">
                <strong>Plan:</strong>
                <span>${estadoReserva.plan === 'estandar' ? 'Estándar' : 'All-Inclusive'}</span>
            </div>
            <div class="resumen-fila">
                <strong>Servicios:</strong>
                <span id="resumen-servicios-texto">Ninguno</span>
            </div>
            <div class="resumen-total">
                <span>Total a Pagar:</span>
                <span id="monto-total">$0.00</span>
            </div>
        </div>

        <form id="form-pago-completo" class="formulario-pago">
            <h3>Selecciona un método de pago</h3>

            <div class="pago-metodos">
                <label class="metodo-opcion">
                    <input type="radio" name="metodo_pago" value="tarjeta" checked />
                    <div class="metodo-info">
                        <strong>💳 Tarjeta de Crédito/Débito</strong>
                        <span>Visa, Mastercard, American Express</span>
                    </div>
                </label>

                <label class="metodo-opcion">
                    <input type="radio" name="metodo_pago" value="paypal" />
                    <div class="metodo-info">
                        <strong>🅿️ PayPal</strong>
                        <span>Pago seguro con tu cuenta de PayPal</span>
                    </div>
                </label>

                <label class="metodo-opcion">
                    <input type="radio" name="metodo_pago" value="efectivo" />
                    <div class="metodo-info">
                        <strong>💰 Pagar en Recepción</strong>
                        <span>Efectivo al momento del check-in</span>
                    </div>
                </label>
            </div>

            <div id="formulario-tarjeta" class="formulario-metodo activo">
                <h4>Datos de la Tarjeta</h4>
                <div class="formulario-grupo">
                    <label for="nombre-tarjeta">Nombre en la Tarjeta *</label>
                    <input type="text" id="nombre-tarjeta" name="nombre_tarjeta" placeholder="Ej: JUAN PEREZ" required />
                </div>
                <div class="formulario-grupo">
                    <label for="numero-tarjeta">Número de Tarjeta *</label>
                    <input type="text" id="numero-tarjeta" name="numero_tarjeta" placeholder="1234 5678 9012 3456" maxlength="19" required />
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="formulario-grupo">
                        <label for="fecha-expiracion">Vencimiento (MM/YY) *</label>
                        <input type="text" id="fecha-expiracion" name="fecha_expiracion" placeholder="12/25" maxlength="5" required />
                    </div>
                    <div class="formulario-grupo">
                        <label for="cvv">CVV *</label>
                        <input type="text" id="cvv" name="cvv" placeholder="123" maxlength="4" required />
                    </div>
                </div>
            </div>

            <div id="formulario-paypal" class="formulario-metodo" style="display: none;">
                <h4>Datos de PayPal</h4>
                <div class="formulario-grupo">
                    <label for="email-paypal">Email de PayPal *</label>
                    <input type="email" id="email-paypal" name="email_paypal" placeholder="tu@email.com" required />
                </div>
            </div>

            <div id="formulario-efectivo" class="formulario-metodo" style="display: none;">
                <h4>Pago en Recepción</h4>
                <p style="color: #666; margin-bottom: 1rem;">
                    Se ha guardado tu reserva. Deberás pagar el total de 
                    <strong id="monto-efectivo">$0.00</strong> 
                    en la recepción del hotel al momento del check-in.
                </p>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" name="confirmar_efectivo" required />
                    Confirmo que pagaré en la recepción
                </label>
            </div>

            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button type="submit" class="btn-pagar">Procesar Pago</button>
                <button type="button" class="btn-cancelar-pago" onclick="volverAReserva()">Editar Reserva</button>
            </div>
        </form>

        <div id="cargando-pago" class="cargando-pago" style="display: none;">
            <div class="spinner"></div>
            <p>Procesando tu pago...</p>
        </div>
    `;
    
    // Evitar duplicados: eliminar si ya existe
    const existente = document.getElementById('seccion-pago');
    if (existente && existente.parentNode) {
        existente.parentNode.removeChild(existente);
    }

    // Insertar la sección de pago después del formulario de reserva
    const formReservaInsert = document.getElementById('form__reserva');
    if (formReservaInsert && formReservaInsert.parentNode) {
        formReservaInsert.parentNode.insertBefore(pagoSeccion, formReservaInsert.nextSibling);
    } else {
        // Como fallback, agregar al contenedor principal
        const contenedor = document.getElementById('formulario__contenedor') || document.getElementById('habitacion__detalles');
        if (contenedor) contenedor.appendChild(pagoSeccion);
    }

    // Obtener el monto de la BD (debe estar en crearReservaResult.monto)
    calcularMontoTotal();
    
    // Event listeners para cambiar método de pago
    const metodoInputs = document.querySelectorAll('input[name="metodo_pago"]');
    metodoInputs.forEach(input => {
        input.addEventListener('change', cambiarMetodoPago);
    });

    // Forzar el estado inicial del formulario de método (mostrar 'tarjeta' por defecto)
    const metodoSeleccionado = document.querySelector('input[name="metodo_pago"]:checked');
    if (metodoSeleccionado) {
        try {
            cambiarMetodoPago({ target: metodoSeleccionado });
        } catch (err) {
            console.warn('Error aplicando método de pago inicial:', err);
        }
    }

    // Event listener para envío del formulario de pago
    const formPago = document.getElementById('form-pago-completo');
    if (formPago) {
        formPago.addEventListener('submit', procesarPago);
    } else {
        console.error('mostrarFormularioPago: no se encontró #form-pago-completo');
    }
}

// Calcular monto total
function calcularMontoTotal() {
    // Asegurar que monto sea un número válido
    const montoNum = (function() {
        const m = estadoReserva.monto;
        const n = Number(m);
        return (n !== null && !isNaN(n) && isFinite(n)) ? n : 0;
    })();

    const montoText = `$${montoNum.toFixed(2)}`;
    const elementoMonto = document.getElementById('monto-total');
    if (elementoMonto) {
        elementoMonto.textContent = montoText;
    }
    const elementoMontEfectivo = document.getElementById('monto-efectivo');
    if (elementoMontEfectivo) {
        elementoMontEfectivo.textContent = montoText;
    }

    // Mostrar servicios
    if (Array.isArray(estadoReserva.servicios) && estadoReserva.servicios.length > 0) {
        const serviciosTexto = estadoReserva.servicios.map(s => s.nombre).join(', ');
        const elementoServicios = document.getElementById('resumen-servicios-texto');
        if (elementoServicios) {
            elementoServicios.textContent = serviciosTexto;
        }
    }
}

// Cambiar método de pago
function cambiarMetodoPago(e) {
    const metodo = e.target.value;
    
    document.getElementById('formulario-tarjeta').style.display = metodo === 'tarjeta' ? 'block' : 'none';
    document.getElementById('formulario-paypal').style.display = metodo === 'paypal' ? 'block' : 'none';
    document.getElementById('formulario-efectivo').style.display = metodo === 'efectivo' ? 'block' : 'none';
}

// Procesar pago
async function procesarPago(e) {
    e.preventDefault();

    const metodoPago = document.querySelector('input[name="metodo_pago"]:checked').value;
    const formPago = document.getElementById('form-pago-completo');
    const cargandoDiv = document.getElementById('cargando-pago');

    console.log('procesarPago: Método seleccionado:', metodoPago);

    // Validar datos según el método
    if (metodoPago === 'tarjeta') {
        const nombreTarjeta = document.getElementById('nombre-tarjeta').value;
        const numeroTarjeta = document.getElementById('numero-tarjeta').value;
        const fechaExpiracion = document.getElementById('fecha-expiracion').value;
        const cvv = document.getElementById('cvv').value;

        if (!nombreTarjeta || !numeroTarjeta || !fechaExpiracion || !cvv) {
            alert('Por favor completa todos los datos de la tarjeta');
            return;
        }

        // Validaciones simples
        if (numeroTarjeta.replace(/\s/g, '').length < 13) {
            alert('Número de tarjeta inválido');
            return;
        }
    } else if (metodoPago === 'paypal') {
        const emailPaypal = document.getElementById('email-paypal').value;
        if (!emailPaypal) {
            alert('Por favor ingresa tu email de PayPal');
            return;
        }
    } else if (metodoPago === 'efectivo') {
        const confirmarEfectivo = document.querySelector('input[name="confirmar_efectivo"]').checked;
        if (!confirmarEfectivo) {
            alert('Por favor confirma que pagarás en la recepción');
            return;
        }
    }

    // Mostrar loading
    formPago.style.display = 'none';
    cargandoDiv.style.display = 'block';

    try {
        // Enviar datos de pago al controller
        const datoPago = {
            id_reserva: estadoReserva.reserva_id,
            metodo: metodoPago,
            monto: estadoReserva.monto
        };

        console.log('Enviando datos de pago:', datoPago);

        const response = await fetch('../controllers/procesar_pago.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datoPago)
        });

        const resultado = await response.json();

        console.log('Respuesta pago:', resultado);

        if (!resultado.ok) {
            throw new Error(resultado.message || 'Error al procesar el pago');
        }

        // Pago exitoso
        cargandoDiv.style.display = 'none';
        mostrarConfirmacionPago();

    } catch (err) {
        console.error('Error procesando pago:', err);
        cargandoDiv.style.display = 'none';
        formPago.style.display = 'block';
        alert('Error al procesar el pago: ' + err.message);
    }
}

// Mostrar confirmación de pago
function mostrarConfirmacionPago() {
    const contenedorDetalles = document.getElementById('habitacion__detalles');
    
    contenedorDetalles.innerHTML = `
        <div class="confirmacion-pago">
            <div class="confirmacion-icono">✅</div>
            <h2>¡Pago Completado!</h2>
            <p class="confirmacion-numero">Reserva #${estadoReserva.reserva_id}</p>
            
            <div class="confirmacion-detalles">
                <div class="confirmacion-fila">
                    <span>Plan:</span>
                    <strong>${estadoReserva.plan === 'estandar' ? 'Estándar' : 'All-Inclusive'}</strong>
                </div>
                <div class="confirmacion-fila">
                    <span>Estado:</span>
                    <strong style="color: #2d7d2d;">Confirmada</strong>
                </div>
                <div class="confirmacion-fila">
                    <span>Monto Pagado:</span>
                    <strong>$${(estadoReserva.monto || 0).toFixed(2)}</strong>
                </div>
            </div>

            <p class="confirmacion-mensaje">
                Te hemos enviado un correo de confirmación con todos los detalles de tu reserva.
            </p>

            <button class="btn-ir-home" onclick="irAlInicio()">Volver al Inicio</button>
        </div>
    `;
}

// Volver al inicio
function irAlInicio() {
    window.location.href = 'index.html';
}

// Volver a la reserva
function volverAReserva() {
    location.reload();
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

function formatPrice(value) {
    try {
        return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    } catch (e) {
        return '$ ' + value;
    }
}

// Inicializar cuando DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('reserva.js: DOMContentLoaded');
    
    // Validar que hay sesión activa
    verificarSesionYCargar();
});

// Verificar sesión y cargar habitación
async function verificarSesionYCargar() {
    try {
        const sesionResponse = await fetch('../controllers/session.php', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const sesionData = await sesionResponse.json();
        
        if (!sesionData.active) {
            mostrarError('Debes iniciar sesión para ver esta página');
            return;
        }
        
        console.log('Sesión válida');
        
        // Obtener datos del usuario para pre-llenar email
        try {
            const usuarioResponse = await fetch('../controllers/obtener_usuario.php');
            const usuarioData = await usuarioResponse.json();
            
            if (usuarioData.ok && usuarioData.usuario) {
                estadoReserva.usuarioEmail = usuarioData.usuario.email;
                console.log('Email del usuario:', estadoReserva.usuarioEmail);
            }
        } catch (err) {
            console.warn('No se pudo obtener datos del usuario:', err);
        }
        
        // Cargar datos de la habitación
        cargarHabitacion();
    } catch (err) {
        console.error('Error verificando sesión:', err);
        mostrarError('Error al verificar tu sesión. Por favor intenta de nuevo.');
    }
}
