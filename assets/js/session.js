// session.js - comprueba sesión activa y maneja logout
(async function(){
  const authBtn = document.getElementById('auth-btn');
  if(!authBtn) return;

  async function checkSession(){
    try{
      const r = await fetch('../controllers/session.php', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const j = await r.json();
      // Asegurar que el botón de promo lleve al registro
      try{
        const promoBtn = document.querySelector('.promo-btn');
        if(promoBtn) promoBtn.href = 'login.html#register';
      }catch(e){}
      if(j.active){
        authBtn.innerText = 'Cerrar sesión';
        authBtn.href = '#';
        // Añadir icono de perfil si no existe
        const parent = authBtn.parentElement;
        if (parent && !document.getElementById('profile-icon')) {
          const icon = document.createElement('a');
          icon.id = 'profile-icon';
          icon.className = 'profile-icon';
          icon.href = 'profile.html'; // página futura de perfil
          icon.setAttribute('aria-label', 'Perfil');
          icon.innerText = '👤';
          parent.insertBefore(icon, authBtn);
        }
        authBtn.onclick = async (ev)=>{
          ev.preventDefault();
          try{
            const res = await fetch('../controllers/logout.php', { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            const txt = await res.text();
            try{ const json = JSON.parse(txt); if(json.success) window.location.reload(); else window.__auth?.showMessage(json.message || 'Error al cerrar sesión.'); }
            catch{ window.location.reload(); }
          }catch(err){ window.__auth?.showMessage('Error al cerrar sesión.'); }
        };
        // Ocultar box de promoción si la sesión está activa
        try{
          const promoBox = document.querySelector('.promo-box');
          if(promoBox) promoBox.style.display = 'none';
        }catch(e){}
      }else{
        authBtn.innerText = 'Iniciar sesión';
        authBtn.href = 'login.html';
        authBtn.onclick = null;
        const iconEl = document.getElementById('profile-icon');
        if(iconEl && iconEl.parentElement) iconEl.parentElement.removeChild(iconEl);
        // Asegurar que la promo se muestre cuando no hay sesión
        try{
          const promoBox = document.querySelector('.promo-box');
          if(promoBox) promoBox.style.display = '';
        }catch(e){}
      }
    }catch(err){ /* ignore */ }
  }

  // Inicializa
  checkSession();

})();