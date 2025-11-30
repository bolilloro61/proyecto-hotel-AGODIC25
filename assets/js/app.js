const carousel = document.getElementById('carousel');
let scrollAmount = 0;

// Variable global para almacenar todas las habitaciones
let todasLasHabitaciones = [];

function autoScroll() {
  if (scrollAmount <= carousel.scrollWidth - carousel.clientWidth) {
    carousel.scrollBy({ left: 1, behavior: 'smooth' });
    scrollAmount++;
  } else {
    carousel.scrollTo({ left: 0, behavior: 'smooth' });
    scrollAmount = 0;
  }
}

setInterval(autoScroll, 20);

// Establecer fecha mínima permitida en los inputs de filtro
// Si es después de las 12 PM, la fecha mínima es mañana
function establecerFechaMinimaIndex() {
  const ahora = new Date();
  const horaActual = ahora.getHours();
  
  // Si ya pasaron las 12 PM, usar mañana como fecha mínima
  if (horaActual >= 12) {
    ahora.setDate(ahora.getDate() + 1);
  }
  
  ahora.setHours(0, 0, 0, 0);
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, '0');
  const day = String(ahora.getDate()).padStart(2, '0');
  const fechaMinima = `${year}-${month}-${day}`;
  
  // Aplicar a los inputs de fecha
  const inputEntrada = document.getElementById('fecha_entrada');
  const inputSalida = document.getElementById('fecha_salida');
  
  if (inputEntrada) inputEntrada.setAttribute('min', fechaMinima);
  if (inputSalida) inputSalida.setAttribute('min', fechaMinima);
}

// Cargar habitaciones desde la BD
async function cargarHabitaciones() {
  try {
    console.log('Iniciando carga de habitaciones...');
    const response = await fetch('/proyecto-hotel-AGODIC25/controllers/habitaciones.php');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Datos recibidos de la BD:', data);

    if (!data.ok) {
      console.error('API returned ok: false', data);
      document.getElementById('rooms').innerHTML = '<p style="color: red; grid-column: 1 / -1;">Error: ' + data.message + '</p>';
      return;
    }

    if (!Array.isArray(data.data) || data.data.length === 0) {
      console.warn('No hay habitaciones en la BD');
      document.getElementById('rooms').innerHTML = '<p style="color: orange; grid-column: 1 / -1;">No hay habitaciones disponibles</p>';
      return;
    }

    // Guardar todas las habitaciones
    todasLasHabitaciones = data.data;
    console.log(`✓ ${todasLasHabitaciones.length} habitaciones cargadas`);
    
    // Renderizar todas las habitaciones inicialmente
    renderizarHabitaciones(todasLasHabitaciones);

  } catch (err) {
    console.error('Error crítico al cargar habitaciones:', err);
    document.getElementById('rooms').innerHTML = '<p style="color: red; grid-column: 1 / -1;">Error al cargar las habitaciones: ' + err.message + '</p>';
  }
}

// Renderizar habitaciones en el grid
function renderizarHabitaciones(habitaciones) {
  const roomGrid = document.getElementById('rooms');
  
  if (habitaciones.length === 0) {
    roomGrid.innerHTML = '<p style="color: orange; grid-column: 1 / -1;">No hay habitaciones que coincidan con tu búsqueda</p>';
    return;
  }

  let html = '';

  habitaciones.forEach((habitacion, index) => {
    console.log(`  [${index + 1}] ID: ${habitacion.id_habitacion}, Nombre: ${habitacion.nombre_habitacion}, Precio: ${habitacion.precio}`);
    
    // Usar la imagen de la BD, si no existe usar placeholder
    const imgFile = habitacion.imagen && habitacion.imagen.trim() !== '' 
      ? habitacion.imagen 
      : 'placeholder.jpg';
    
    const precioFormato = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(habitacion.precio);

    html += `
      <div class="room__card">
        <div class="room__card__image">
          <img src="../assets/img/${imgFile}" alt="${habitacion.nombre_habitacion}" onerror="this.src='../assets/img/placeholder.jpg';" />
        </div>
        <div class="room__card__details">
          <h4>${habitacion.nombre_habitacion || 'Habitación ' + habitacion.numero_habitacion}</h4>
          <p>${habitacion.descripcion || ''}</p>
          <p class="room__capacity"><strong>Capacidad:</strong> ${habitacion.capacidad}</p>
          <h5>Desde <span>${precioFormato}</span> por noche</h5>
          <button class="btn" onclick="reservarHabitacion(${habitacion.id_habitacion})">Reservar Ahora</button>
        </div>
      </div>
    `;
  });

  roomGrid.innerHTML = html;
  console.log(`✓ ${habitaciones.length} habitaciones renderizadas`);
}

// Aplicar filtro
async function aplicarFiltro() {
  const capacidad = parseInt(document.getElementById('capacidad')?.value || 0);
  const fechaEntrada = document.getElementById('fecha_entrada')?.value || '';
  const fechaSalida = document.getElementById('fecha_salida')?.value || '';

  console.log('Aplicando filtro:', { capacidad, fechaEntrada, fechaSalida });

  // Validar que fecha de salida no sea antes de entrada
  if (fechaEntrada && fechaSalida) {
    const entrada = new Date(fechaEntrada);
    const salida = new Date(fechaSalida);
    
    if (salida <= entrada) {
      alert('La fecha de salida debe ser posterior a la fecha de entrada');
      return;
    }
  }

  // Guardar fechas en sessionStorage (incluso si están vacías)
  if (fechaEntrada) sessionStorage.setItem('filtro_fecha_entrada', fechaEntrada);
  if (fechaSalida) sessionStorage.setItem('filtro_fecha_salida', fechaSalida);
  if (capacidad) sessionStorage.setItem('filtro_capacidad', capacidad);

  // Filtrar por capacidad (exacta)
  let habitacionesFiltradas = todasLasHabitaciones;

  if (capacidad > 0) {
    habitacionesFiltradas = habitacionesFiltradas.filter(h => {
      // Parsear la capacidad: "1 persona", "2 personas", "4 personas"
      const match = h.capacidad.match(/(\d+)/);
      const cap = match ? parseInt(match[1]) : 0;
      return cap === capacidad;
    });
    console.log(`Filtradas por capacidad exacta (${capacidad}): ${habitacionesFiltradas.length} habitaciones`);
  }

  // Filtrar por disponibilidad si hay fechas
  if (fechaEntrada && fechaSalida) {
    console.log('Verificando disponibilidad...');
    const habitacionesDisponibles = [];

    for (const habitacion of habitacionesFiltradas) {
      try {
        const availResponse = await fetch(
          `/proyecto-hotel-AGODIC25/controllers/verificar_disponibilidad.php?` +
          `fecha_entrada=${fechaEntrada}&fecha_salida=${fechaSalida}&id_habitacion=${habitacion.id_habitacion}`
        );
        const availData = await availResponse.json();

        if (availData.ok && availData.disponible) {
          habitacionesDisponibles.push(habitacion);
        }
      } catch (err) {
        console.error(`Error verificando disponibilidad de habitación ${habitacion.id_habitacion}:`, err);
      }
    }

    habitacionesFiltradas = habitacionesDisponibles;
    console.log(`Disponibles en las fechas: ${habitacionesFiltradas.length} habitaciones`);
  }

  // Renderizar resultados
  renderizarHabitaciones(habitacionesFiltradas);
}

// Reservar una habitación
async function reservarHabitacion(habitacionId) {
  console.log('Intentando reservar habitación:', habitacionId);
  
  // Validar que hay sesión activa
  try {
    const sesionResponse = await fetch('/proyecto-hotel-AGODIC25/controllers/session.php', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    const sesionData = await sesionResponse.json();
    
    if (!sesionData.active) {
      alert('Debes iniciar sesión para realizar una reserva');
      window.location.href = './login.html';
      return;
    }
    
    console.log('Sesión válida');
  } catch (err) {
    console.error('Error verificando sesión:', err);
    alert('Error al verificar tu sesión. Por favor intenta de nuevo.');
    return;
  }
  
  // NO es necesario validar fechas aquí - se pueden rellenar en el formulario de reserva.html
  // Solo guardamos las fechas que ya estén en sessionStorage (del filtro) si existen
  const fechaEntrada = sessionStorage.getItem('filtro_fecha_entrada');
  const fechaSalida = sessionStorage.getItem('filtro_fecha_salida');
  
  console.log('Fechas guardadas:', { fechaEntrada, fechaSalida });
  
  // Redirigir a la página de reserva con la habitación
  window.location.href = `./reserva.html?habitacion=${habitacionId}`;
}

// Agregar event listeners cuando DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Cargar habitaciones
  cargarHabitaciones();
  
  // Establecer fecha mínima en los inputs
  establecerFechaMinimaIndex();
  
  // Conectar botón de filtro
  const btnFiltrar = document.getElementById('btn-filtrar');
  if (btnFiltrar) {
    btnFiltrar.addEventListener('click', aplicarFiltro);
    console.log('Botón filtrar conectado');
  }
  
  // Permitir Enter en los inputs para aplicar filtro
  const capacidadInput = document.getElementById('capacidad');
  const fechaEntradaInput = document.getElementById('fecha_entrada');
  const fechaSalidaInput = document.getElementById('fecha_salida');
  
  const aplicarFiltroOnEnter = (e) => {
    if (e.key === 'Enter') {
      aplicarFiltro();
    }
  };
  
  if (capacidadInput) capacidadInput.addEventListener('keypress', aplicarFiltroOnEnter);
  if (fechaEntradaInput) fechaEntradaInput.addEventListener('keypress', aplicarFiltroOnEnter);
  if (fechaSalidaInput) fechaSalidaInput.addEventListener('keypress', aplicarFiltroOnEnter);
  
  // Agregar link al perfil en la barra superior
  const authBtn = document.getElementById('auth-btn');
  
  // Verificar si hay sesión activa
  fetch('/proyecto-hotel-AGODIC25/controllers/obtener_usuario.php')
    .then(r => r.json())
    .then(data => {
      if (data.ok && data.usuario) {
        authBtn.textContent = 'Cerrar sesión';
        authBtn.href = 'index.html';
      } else {
        authBtn.textContent = 'Iniciar sesión';
        authBtn.href = 'login.html';
      }
    })
    .catch(err => {
      console.log('No hay sesión activa');
    });
});

// FUNCIONES PARA MODAL DE BENEFICIOS
const contenidosBeneficios = {
  recompensas: {
    titulo: '💎 Programa de Recompensas',
    contenido: `
      <h3 style="color: #c41e3a; margin-top: 0;">Acumula Noches y Gana Premios</h3>
      <p>Nuestro programa de fidelización te recompensa por cada estancia:</p>
      <ul style="margin: 1rem 0; padding-left: 1.5rem;">
        <li><strong>Acumula puntos</strong> por cada noche hospedada</li>
        <li><strong>10 noches = 1 noche gratis</strong> en cualquier habitación</li>
        <li><strong>Acceso VIP</strong> a ofertas exclusivas</li>
        <li><strong>Descuentos especiales</strong> en servicios adicionales</li>
        <li><strong>Cumpleaños</strong>: 20% descuento en tu mes especial</li>
      </ul>
      <p style="background: #f0f0f0; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
        <strong>¿Cómo inscribirse?</strong> Al hacer tu primera reserva, serás automáticamente registrado en nuestro programa. Comienza a acumular noches hoy mismo.
      </p>
    `
  },
  allInclusive: {
    titulo: '🌴 Hospedaje All Inclusive',
    contenido: `
      <h3 style="color: #c41e3a; margin-top: 0;">Vacaciones Sin Preocupaciones</h3>
      <p>Todo incluido para que disfrutes al máximo:</p>
      <ul style="margin: 1rem 0; padding-left: 1.5rem;">
        <li><strong>Hospedaje</strong> en habitación premium</li>
        <li><strong>Desayuno, comida y cena</strong> a la carta</li>
        <li><strong>Acceso a piscina y playa privada</strong></li>
        <li><strong>Bar abierto</strong> con bebidas ilimitadas</li>
        <li><strong>Actividades recreativas</strong> durante el día</li>
        <li><strong>Entretenimiento nocturno</strong> en vivo</li>
        <li><strong>Acceso a gimnasio</strong> y spa</li>
        <li><strong>Wi-Fi</strong> de alta velocidad</li>
      </ul>
      <p style="background: #f0f0f0; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
        <strong>Precio:</strong> El plan all-inclusive duplica el costo de la habitación, pero incluye todo para una experiencia completa.
      </p>
    `
  },
  cancelacion: {
    titulo: '✅ Política de Cancelación Flexible',
    contenido: `
      <h3 style="color: #c41e3a; margin-top: 0;">Sabemos que los Planes Cambian</h3>
      <p>Disfruta de la máxima flexibilidad en tus reservas:</p>
      <ul style="margin: 1rem 0; padding-left: 1.5rem;">
        <li><strong>Cancelación gratuita</strong> hasta 48 horas antes del check-in</li>
        <li><strong>Sin penalidades ocultas</strong> - transparencia total</li>
        <li><strong>Reembolso completo</strong> si cancelas a tiempo</li>
        <li><strong>Opción de cambio de fechas</strong> sin costo adicional</li>
        <li><strong>Atención personalizada</strong> para resolver dudas</li>
      </ul>
      <p style="background: #fffbf0; padding: 1rem; border-radius: 4px; margin: 1rem 0; border-left: 4px solid #c41e3a;">
        <strong>⚠️ Importante:</strong> Las cancelaciones realizadas menos de 48 horas antes del check-in (12:00 PM) serán sujetas a una tarifa del 50% del total.
      </p>
      <p>
        <strong>Ejemplo:</strong> Si reservas para el 30 de noviembre, puedes cancelar gratis hasta el 28 de noviembre a las 12:00 PM.
      </p>
    `
  }
};

function abrirModalBeneficio(tipo) {
  const modal = document.getElementById('modal-beneficio');
  const titulo = document.getElementById('modal-titulo');
  const contenido = document.getElementById('modal-contenido');
  
  const datos = contenidosBeneficios[tipo];
  if (datos) {
    titulo.textContent = datos.titulo;
    contenido.innerHTML = datos.contenido;
    modal.style.display = 'flex';
  }
}

function cerrarModalBeneficio() {
  const modal = document.getElementById('modal-beneficio');
  modal.style.display = 'none';
}

function irAReserva() {
  cerrarModalBeneficio();
  // Scroll suave al filtro de búsqueda
  const filtro = document.querySelector('.search-form');
  if (filtro) {
    filtro.scrollIntoView({ behavior: 'smooth' });
  }
}

// Cerrar modal al hacer click fuera
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-beneficio');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cerrarModalBeneficio();
      }
    });
  }
});
