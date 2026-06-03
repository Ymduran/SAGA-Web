document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const contrasenaInput = document.getElementById("contrasena");
  const togglePassword = document.getElementById("togglePassword");
  const iconoOjoCerrado = togglePassword?.querySelector(".icon-eye-off");
  const iconoOjoAbierto = togglePassword?.querySelector(".icon-eye-on");
  if (!form) return;

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
});
