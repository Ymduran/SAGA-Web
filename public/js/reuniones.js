document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("tablaReuniones");
  const form = document.getElementById("formReunion");
  const formEditar = document.getElementById("formEditarReunion");
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalNuevaReunion"));
  const modalEditar = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalEditarReunion"));
   // Verificar tablas 
  if (!tabla || !form) return;

  function fila(reunion) {
    return `<tr>
      <td>${reunion.id_reunion}</td>
      <td>${reunion.nombre_reunion}</td>
      <td>${new Date(reunion.fecha_reunion).toLocaleDateString("es-MX")}</td>
      <td>${reunion.descripcion || ""}</td>
      <td><button class="btn btn-sm btn-primary btn-editar-reunion"
          data-id="${reunion.id_reunion}"
          data-nombre="${reunion.nombre_reunion}"
          data-fecha="${reunion.fecha_reunion}"
          data-descripcion="${reunion.descripcion || ""}">Editar</button></td>
    </tr>`;
  }

  async function cargarReuniones() {
    const response = await sagaFetch("/api/reuniones");
    const reuniones = await response.json();
    tabla.innerHTML = reuniones.length ? reuniones.map(fila).join("") : '<tr><td colspan="5">Sin reuniones registradas.</td></tr>';
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sagaFetch("/api/reuniones", {
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

  tabla.addEventListener("click", (event) => {
    const boton = event.target.closest(".btn-editar-reunion");
    if (!boton) return;
    document.getElementById("editarReunionId").value = boton.dataset.id;
    document.getElementById("editarNombreReunion").value = boton.dataset.nombre;
    document.getElementById("editarFechaReunion").value = boton.dataset.fecha;
    document.getElementById("editarDescReunion").value = boton.dataset.descripcion;
    modalEditar.show();
  });

  formEditar?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = document.getElementById("editarReunionId").value;
    await sagaFetch(`/api/reuniones/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_reunion: document.getElementById("editarNombreReunion").value.trim(),
        fecha_reunion: document.getElementById("editarFechaReunion").value,
        descripcion: document.getElementById("editarDescReunion").value.trim()
      })
    });
    modalEditar.hide();
    await cargarReuniones();
  });

  cargarReuniones();
});
