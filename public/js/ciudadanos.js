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
  const inputBuscar = document.getElementById("buscarCiudadano");

  function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  function aplicarFiltroBusqueda() {
    if (typeof filtrarTabla === "function") {
      filtrarTabla("buscarCiudadano", "tablaCiudadanosList");
    }
  }

  function formatearFecha(fechaISO) {
    return new Date(fechaISO).toLocaleDateString("es-MX");
  }

  function validarTelefonoMx(telefono) {
    const soloDigitos = String(telefono || "").replace(/\D/g, "");
    if (soloDigitos.length !== 10) {
      return {
        ok: false,
        error: "El teléfono debe tener exactamente 10 dígitos (ej. 9516668896)."
      };
    }
    return { ok: true, telefono: soloDigitos };
  }

  function obtenerTelefonoValido(inputId) {
    const input = document.getElementById(inputId);
    const resultado = validarTelefonoMx(input.value.trim());
    if (!resultado.ok) {
      input.setCustomValidity(resultado.error);
      input.reportValidity();
      return null;
    }
    input.setCustomValidity("");
    return resultado.telefono;
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
    const response = await sagaFetch("/api/ciudadanos");
    const data = await response.json();
    tabla.innerHTML = data.map(renderFila).join("");
    aplicarFiltroBusqueda();
  }

  inputBuscar?.addEventListener("input", aplicarFiltroBusqueda);

  btnGuardar?.addEventListener("click", async () => {
    if (!formAgregar.reportValidity()) return;
    const telefono = obtenerTelefonoValido("agregarTelefono");
    if (!telefono) return;

    const response = await sagaFetch("/api/ciudadanos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_completo: document.getElementById("agregarNombre").value.trim(),
        telefono
      })
    });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "No fue posible guardar el ciudadano.");
      return;
    }
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
      document.getElementById("mensajeEliminar").innerHTML =
        `¿Está seguro de eliminar al ciudadano <strong>${escaparHtml(botonEliminar.dataset.nombre)}</strong> (ID: ${botonEliminar.dataset.id})?`;
      modalEliminar.show();
    }
  });

  btnActualizar?.addEventListener("click", async () => {
    const telefono = obtenerTelefonoValido("editarTelefono");
    if (!telefono) return;

    const response = await sagaFetch(`/api/ciudadanos/${document.getElementById("editarId").value}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_completo: document.getElementById("editarNombre").value.trim(),
        telefono
      })
    });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "No fue posible actualizar el ciudadano.");
      return;
    }
    modalEditar.hide();
    await cargarCiudadanos();
  });

  btnEliminar?.addEventListener("click", async () => {
    await sagaFetch(`/api/ciudadanos/${document.getElementById("eliminarId").value}`, {
      method: "DELETE"
    });
    modalEliminar.hide();
    await cargarCiudadanos();
  });

  cargarCiudadanos().catch(() => {
    tabla.innerHTML = '<tr><td colspan="5" class="text-danger">No fue posible cargar ciudadanos.</td></tr>';
  });
});
