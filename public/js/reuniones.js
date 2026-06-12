document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("tablaReuniones");
  const form = document.getElementById("formReunion");
  const formEditar = document.getElementById("formEditarReunion");
  const fechaReunion = document.getElementById("fechaReunion");
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalNuevaReunion"));
  const modalEditar = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalEditarReunion"));
  if (!tabla || !form) return;

  function fechaMinimaHoy() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatearFechaISO(fecha) {
    if (!fecha) return "";
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toISOString().slice(0, 10);
  }

  function configurarFechaMinima() {
    const hoy = fechaMinimaHoy();
    if (fechaReunion) {
      fechaReunion.min = hoy;
      fechaReunion.setCustomValidity("");
    }
  }

  function configurarFechaEditarMinima() {
    const hoy = fechaMinimaHoy();
    const inputEditarFecha = document.getElementById("editarFechaReunion");
    if (inputEditarFecha) {
      inputEditarFecha.min = hoy;
      inputEditarFecha.setCustomValidity("");
    }
  }

  function esFechaPasada(valorFecha) {
    return valorFecha && valorFecha < fechaMinimaHoy();
  }

  configurarFechaMinima();
  document.getElementById("modalNuevaReunion")?.addEventListener("show.bs.modal", configurarFechaMinima);
  document.getElementById("modalEditarReunion")?.addEventListener("show.bs.modal", configurarFechaEditarMinima);
  fechaReunion?.addEventListener("change", () => {
    if (!esFechaPasada(fechaReunion.value)) {
      fechaReunion.setCustomValidity("");
    }
  });

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
    const fecha = fechaReunion.value;

    if (esFechaPasada(fecha)) {
      fechaReunion.setCustomValidity("No puede programar reuniones en fechas pasadas.");
      fechaReunion.reportValidity();
      return;
    }
    fechaReunion.setCustomValidity("");

    const response = await sagaFetch("/api/reuniones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_reunion: document.getElementById("nombreReunion").value.trim(),
        fecha_reunion: fecha,
        descripcion: document.getElementById("descReunion").value.trim()
      })
    });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "No fue posible crear la reunión.");
      return;
    }
    form.reset();
    configurarFechaMinima();
    modal.hide();
    await cargarReuniones();
  });

  tabla.addEventListener("click", (event) => {
    const boton = event.target.closest(".btn-editar-reunion");
    if (!boton) return;
    document.getElementById("editarReunionId").value = boton.dataset.id;
    document.getElementById("editarNombreReunion").value = boton.dataset.nombre;
    // Formatear la fecha al formato YYYY-MM-DD
    document.getElementById("editarFechaReunion").value = formatearFechaISO(boton.dataset.fecha);
    document.getElementById("editarDescReunion").value = boton.dataset.descripcion;
    // Configurar la fecha mínima antes de mostrar el modal
    configurarFechaEditarMinima();
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
