// auth.js - controla toggles y envíos AJAX para login/register
(function(){
  // Mostrar/ocultar paneles
  const loginPanel = document.getElementById('login');
  const registerPanel = document.getElementById('register');
  const toRegister = document.getElementById('toRegister');
  const toLogin = document.getElementById('toLogin');
  const messagesEl = document.getElementById('messages');

  function showMessage(text, ok = false){
    if(!messagesEl) return;
    messagesEl.innerText = text;
    messagesEl.style.color = ok ? 'green' : 'crimson';
  }
  function clearMessages(){ if(messagesEl) messagesEl.innerText = ''; }

  if(toRegister){
    toRegister.addEventListener('click', ()=>{
      loginPanel.style.display = 'none';
      registerPanel.style.display = 'block';
      clearMessages();
    });
  }
  if(toLogin){
    toLogin.addEventListener('click', ()=>{
      loginPanel.style.display = 'block';
      registerPanel.style.display = 'none';
      clearMessages();
    });
  }

  // Login AJAX
  const loginForm = document.getElementById('loginForm');
  if(loginForm){
    loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      clearMessages();
      const data = new FormData(loginForm);
      try{
          const res = await fetch('../controllers/login.php', { method: 'POST', body: data, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        const txt = await res.text();
        try{
          const json = JSON.parse(txt);
          if(json.success){ showMessage('Inicio de sesión correcto. Redirigiendo...', true); setTimeout(()=> window.location = 'index.html', 700); }
          else showMessage(json.message || 'Error al iniciar sesión.');
        }catch(err){ showMessage(txt || 'Respuesta inesperada del servidor.'); }
      }catch(err){ showMessage('Error de conexión.'); }
    });
  }

  // Register AJAX
  const registerForm = document.getElementById('registerForm');
  if(registerForm){
    registerForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      clearMessages();
      const data = new FormData(registerForm);
      try{
        const res = await fetch('../controllers/register.php', { method: 'POST', body: data, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        const txt = await res.text();
        try{
          const json = JSON.parse(txt);
          if(json.success){ showMessage('Registro correcto. Redirigiendo...', true); setTimeout(()=> window.location = 'index.html', 700); }
          else showMessage(json.message || 'Error al registrar.');
        }catch(err){ showMessage(txt || 'Respuesta inesperada del servidor.'); }
      }catch(err){ showMessage('Error de conexión.'); }
    });
  }

  // Export minimal helpers for other modules
  window.__auth = { showMessage, clearMessages };

})();

// Si la URL contiene #register, mostrar panel de registro al cargar
(function(){
  try{
    if(window.location && window.location.hash === '#register'){
      const loginPanel = document.getElementById('login');
      const registerPanel = document.getElementById('register');
      if(loginPanel && registerPanel){
        loginPanel.style.display = 'none';
        registerPanel.style.display = 'block';
      }
    }
  }catch(e){ /* ignore */ }
})();