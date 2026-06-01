document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorMsg = document.getElementById("loginError");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.textContent = "";

    const usuario = document.getElementById("usuario").value.trim();
    const contrasena = document.getElementById("contrasena").value.trim();

    if (!usuario || !contrasena) {
      errorMsg.textContent = "Todos los campos son obligatorios.";
      return;
    }
    if (usuario.length < 4) {
      errorMsg.textContent = "El usuario debe tener mínimo 4 caracteres.";
      return;
    }

    if (contrasena.length < 8) {
      errorMsg.textContent = "La contraseña debe tener mínimo 8 caracteres.";
      return;
    }

try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          usuario,
          contrasena
        })
      });

      const data = await response.json();

      if (!response.ok) {
        errorMsg.textContent =
          data.error || "No fue posible iniciar sesión.";
        return;
      }

      // Login exitoso
window.location.href = "/public/index.html";

console.log("Login exitoso");

    } catch (error) {
      errorMsg.textContent = "Error de conexión con el servidor.";
      console.error(error);
    }
  });
});