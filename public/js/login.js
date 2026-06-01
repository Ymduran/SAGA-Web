document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  if (!form) return;

  fetch("/api/auth/me", { credentials: "include" })
    .then((response) => {
      if (response.ok) {
        window.location.href = "/inicio";
      }
    })
    .catch(() => {});

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nombre_usuario = document.getElementById("usuario").value.trim();
    const contrasena = document.getElementById("contrasena").value.trim();

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nombre_usuario, contrasena })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Credenciales incorrectas.");
        return;
      }
      window.location.href = "/inicio";
    } catch (_error) {
      alert("No fue posible iniciar sesion.");
    }
  });
});