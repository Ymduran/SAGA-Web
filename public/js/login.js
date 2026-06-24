document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const contrasenaInput = document.getElementById("contrasena");
  const togglePassword = document.getElementById("togglePassword");
  const iconoOjoCerrado = togglePassword?.querySelector(".icon-eye-off");
  const iconoOjoAbierto = togglePassword?.querySelector(".icon-eye-on");
  if (!form) return;

  //Actualizar icono de contraseña según el estado de visibilidad 
  function actualizarIconoContrasena(visible) {
    if (!iconoOjoCerrado || !iconoOjoAbierto || !togglePassword) return;

    if (visible) {
      iconoOjoCerrado.hidden = true;
      iconoOjoAbierto.hidden = false;
      togglePassword.setAttribute("aria-label", "Ocultar contraseña");
      togglePassword.setAttribute("title", "Ocultar contraseña");
    } else {
      iconoOjoCerrado.hidden = false;
      iconoOjoAbierto.hidden = true;
      togglePassword.setAttribute("aria-label", "Mostrar contraseña");
      togglePassword.setAttribute("title", "Mostrar contraseña");
    }
  }

  fetch("/api/auth/me", { credentials: "include" })
    .then((response) => {
      if (response.ok) {
        window.location.href = "/inicio";
      }
    })
    .catch(() => {});

  togglePassword?.addEventListener("click", () => {
    const mostrar = contrasenaInput.type === "password";
    contrasenaInput.type = mostrar ? "text" : "password";
    actualizarIconoContrasena(mostrar);
    contrasenaInput.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (loginError) loginError.textContent = "";

    const nombre_usuario = document.getElementById("usuario").value.trim();
    const contrasena = contrasenaInput.value.trim();

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nombre_usuario, contrasena })
      });
      const data = await response.json();
      if (!response.ok) {
        if (loginError) {
          loginError.textContent =
            response.status === 401
              ? "Usuario o contraseña incorrecta"
              : data.error || "No fue posible iniciar sesión.";
        }
        return;
      }
      window.location.href = "/inicio";
    } catch (_error) {
      if (loginError) {
        loginError.textContent = "No fue posible conectar con el servidor. Intente de nuevo.";
      }
    }
  });

  // --- Registration handling ---
  const registerForm = document.getElementById("registerForm");
  const toggleRegister = document.getElementById("toggleRegister");

  function showRegister(show) {
    if (!registerForm) return;
    if (show) {
      form.style.display = "none";
      registerForm.style.display = "block";
      toggleRegister.textContent = "¿Ya tienes cuenta? Iniciar sesión";
    } else {
      form.style.display = "block";
      registerForm.style.display = "none";
      toggleRegister.textContent = "¿No tienes cuenta? Crear cuenta";
    }
  }

  toggleRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    const showingRegister = registerForm && registerForm.style.display === "block";
    showRegister(!showingRegister);
    if (loginError) loginError.textContent = "";
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginError) loginError.textContent = "";

    const nombre_usuario = document.getElementById("registerUsuario").value.trim();
    const contrasena = document.getElementById("registerContrasena").value.trim();
    const confirmar = document.getElementById("registerConfirmar").value.trim();

    if (!nombre_usuario || !contrasena) {
      if (loginError) loginError.textContent = "Usuario y contraseña son obligatorios.";
      return;
    }
    if (contrasena !== confirmar) {
      if (loginError) loginError.textContent = "Las contraseñas no coinciden.";
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_usuario, contrasena })
      });
      const data = await response.json();
      if (!response.ok) {
        if (loginError) loginError.textContent = data.error || "No fue posible crear la cuenta.";
        return;
      }
      // Success: show success message briefly and switch to login
      if (loginError) loginError.textContent = "Cuenta creada correctamente. Inicia sesión.";
      showRegister(false);
      // prefill username
      document.getElementById("usuario").value = nombre_usuario;
    } catch (err) {
      if (loginError) loginError.textContent = "No fue posible conectar con el servidor.";
    }
  });
});
