document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("tablaReuniones");
  const form = document.getElementById("formReunion");
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalNuevaReunion"));
  if (!tabla || !form) return;

  function fila(reunion) {
    return `<tr>
      <td>${reunion.id_reunion}</td>
      <td>${reunion.nombre_reunion}</td>
      <td>${new Date(reunion.fecha_reunion).toLocaleDateString("es-MX")}</td>
      <td>${reunion.descripcion || ""}</td>
    </tr>`;
  }

  async function cargarReuniones() {
    const response = await fetch("/api/reuniones");
    const reuniones = await response.json();
    tabla.innerHTML = reuniones.length ? reuniones.map(fila).join("") : '<tr><td colspan="4">Sin reuniones registradas.</td></tr>';
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await fetch("/api/reuniones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_reunion: document.getElementById("nombreReunion").value.trim(),
        fecha_reunion: document.getElementById("fechaReunion").value,
        descripcion: document.getElementById("descReunion").value.trim()
      })
    });
    form.reset();
    modal.hide();
    await cargarReuniones();
  });

  cargarReuniones();
});
