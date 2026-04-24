document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("tablaCiudadanos");
  if (!tabla) return;

  const modalAgregar = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalAgregar"));
  const modalEditar = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalEditar"));
  const modalEliminar = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalEliminar"));

  const formAgregar = document.getElementById("formAgregarCiudadano");
  const btnGuardar = document.getElementById("btnGuardarCiudadano");
  const btnActualizar = document.getElementById("btnActualizarCiudadano");
  const btnEliminar = document.getElementById("btnEliminarCiudadano");

  function formatearFecha(fechaISO) {
    return new Date(fechaISO).toLocaleDateString("es-MX");
  }

  function renderFila(ciudadano) {
    return `
      <tr>
        <td>${ciudadano.id_ciudadano}</td>
        <td>${ciudadano.nombre_completo}</td>
        <td>${ciudadano.telefono}</td>
        <td>${formatearFecha(ciudadano.fecha_ingreso)}</td>
        <td>
          <button class="btn btn-sm btn-primary btn-editar" data-id="${ciudadano.id_ciudadano}" data-nombre="${ciudadano.nombre_completo}" data-telefono="${ciudadano.telefono}">Editar</button>
          <button class="btn btn-sm btn-danger btn-eliminar" data-id="${ciudadano.id_ciudadano}" data-nombre="${ciudadano.nombre_completo}">Eliminar</button>
        </td>
      </tr>
    `;
  }

  async function cargarCiudadanos() {
    const response = await fetch("/api/ciudadanos");
    const data = await response.json();
    tabla.innerHTML = data.map(renderFila).join("");
  }

  btnGuardar?.addEventListener("click", async () => {
    if (!formAgregar.reportValidity()) return;
    await fetch("/api/ciudadanos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_completo: document.getElementById("agregarNombre").value.trim(),
        telefono: document.getElementById("agregarTelefono").value.trim()
      })
    });
    formAgregar.reset();
    modalAgregar.hide();
    await cargarCiudadanos();
  });

  tabla.addEventListener("click", (event) => {
    const botonEditar = event.target.closest(".btn-editar");
    const botonEliminar = event.target.closest(".btn-eliminar");

    if (botonEditar) {
      document.getElementById("editarId").value = botonEditar.dataset.id;
      document.getElementById("editarNombre").value = botonEditar.dataset.nombre;
      document.getElementById("editarTelefono").value = botonEditar.dataset.telefono;
      modalEditar.show();
    }

    if (botonEliminar) {
      document.getElementById("eliminarId").value = botonEliminar.dataset.id;
      document.getElementById("mensajeEliminar").textContent =
        `¿Está seguro de eliminar al ciudadano ${botonEliminar.dataset.nombre} (ID: ${botonEliminar.dataset.id})?`;
      modalEliminar.show();
    }
  });

  btnActualizar?.addEventListener("click", async () => {
    await fetch(`/api/ciudadanos/${document.getElementById("editarId").value}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_completo: document.getElementById("editarNombre").value.trim(),
        telefono: document.getElementById("editarTelefono").value.trim()
      })
    });
    modalEditar.hide();
    await cargarCiudadanos();
  });

  btnEliminar?.addEventListener("click", async () => {
    await fetch(`/api/ciudadanos/${document.getElementById("eliminarId").value}`, {
      method: "DELETE"
    });
    modalEliminar.hide();
    await cargarCiudadanos();
  });

  cargarCiudadanos().catch(() => {
    tabla.innerHTML = '<tr><td colspan="5" class="text-danger">No fue posible cargar ciudadanos.</td></tr>';
  });
});
