document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorMsg = document.getElementById("loginError");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.textContent = "";

    const usuario = document.getElementById("usuario").value.trim();
    const contrasena = document.getElementById("contrasena").value.trim();

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, contrasena })
    });
    const data = await response.json();
    if (!response.ok) {
      errorMsg.textContent = data.error || "No fue posible iniciar sesión.";
      return;
    }
    window.location.href = "/public/src/views/ciudadanos.html";
  });
});