document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("tablaReuniones");
  const form = document.getElementById("formReunion");
  const formEditar = document.getElementById("formEditarReunion");
  const fechaReunion = document.getElementById("fechaReunion");
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalNuevaReunion"));
  const modalEditar = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalEditarReunion"));
  if (!tabla || !form) return;

  // Obtiene la fecha actual en la zona horaria local simulando YYYY-MM-DD
  function fechaMinimaHoy() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  function formatearFechaISO(fecha) {
    if (!fecha) return "";
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    // Si ya viene con formato YYYY-MM-DD (de los data-attributes), evitar doble conversión
    if (typeof fecha === 'string' && fecha.includes('-') && fecha.length === 10) return fecha;
    
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
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
  configurarFechaEditarMinima();
  
  document.getElementById("modalNuevaReunion")?.addEventListener("show.bs.modal", configurarFechaMinima);
  document.getElementById("modalEditarReunion")?.addEventListener("show.bs.modal", configurarFechaEditarMinima);
  
  fechaReunion?.addEventListener("change", () => {
    if (!esFechaPasada(fechaReunion.value)) {
      fechaReunion.setCustomValidity("");
    }
  });

  function fila(reunion) {
    const estado = reunion.finalizada ? "Finalizada" : "Abierta";
    const estadoClase = reunion.finalizada ? "badge bg-danger" : "badge bg-success";
    const editarDisabled = reunion.finalizada ? "disabled" : "";

    // Nota: Usamos una conversión limpia para mostrar localmente la fecha en formato MX
    const fechaObjeto = new Date(reunion.fecha_reunion);
    // Ajuste por desfase de zona horaria al crear el objeto Date desde la DB
    if (typeof reunion.fecha_reunion === 'string' && !reunion.fecha_reunion.includes('T')) {
      fechaObjeto.setMinutes(fechaObjeto.getMinutes() + fechaObjeto.getTimezoneOffset());
    }
    const fechaFormateada = fechaObjeto.toLocaleDateString("es-MX");

    return `<tr>
      <td>${reunion.id_reunion}</td>
      <td>${reunion.nombre_reunion}</td>
      <td>${fechaFormateada}</td>
      <td>${reunion.descripcion || ""}</td>
      <td><span class="${estadoClase}">${estado}</span></td>
      <td>
        <button class="btn btn-sm btn-primary btn-editar-reunion" ${editarDisabled}
          data-id="${reunion.id_reunion}"
          data-nombre="${reunion.nombre_reunion}"
          data-fecha="${formatearFechaISO(reunion.fecha_reunion)}"
          data-descripcion="${reunion.descripcion || ""}">Editar</button>
      </td>
    </tr>`;
  }

  async function cargarReuniones() {
    try {
      const response = await sagaFetch("/api/reuniones");
      const reuniones = await response.json();
      tabla.innerHTML = reuniones.length ? reuniones.map(fila).join("") : '<tr><td colspan="6">Sin reuniones registradas.</td></tr>';
    } catch (error) {
      console.error("Error al cargar reuniones:", error);
    }
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

    try {
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
    } catch (error) {
      console.error("Error al guardar reunión:", error);
      alert("Ocurrió un error en el servidor al intentar crear la reunión.");
    }
  });

  // 🛠️ ¡AQUÍ ESTÁ EL CAMBIO CLAVE! Agregamos 'async' al event listener de la tabla
  tabla.addEventListener("click", async (event) => {
    const editarBoton = event.target.closest(".btn-editar-reunion");
    if (editarBoton) {
      document.getElementById("editarReunionId").value = editarBoton.dataset.id;
      document.getElementById("editarNombreReunion").value = editarBoton.dataset.nombre;
      // Inyectar directamente la fecha limpia YYYY-MM-DD
      document.getElementById("editarFechaReunion").value = formatearFechaISO(editarBoton.dataset.fecha);
      document.getElementById("editarDescReunion").value = editarBoton.dataset.descripcion;
      
      configurarFechaEditarMinima();
      modalEditar.show();
      return;
    }

  });

  formEditar?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = document.getElementById("editarReunionId").value;
    const fechaInput = document.getElementById("editarFechaReunion").value;

    if (esFechaPasada(fechaInput)) {
      alert("No puedes mover una reunión a una fecha pasada.");
      return;
    }

    try {
      const response = await sagaFetch(`/api/reuniones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_reunion: document.getElementById("editarNombreReunion").value.trim(),
          fecha_reunion: fechaInput,
          descripcion: document.getElementById("editarDescReunion").value.trim()
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "No se pudieron guardar los cambios.");
        return;
      }

      modalEditar.hide();
      await cargarReuniones();
    } catch (error) {
      console.error("Error al editar reunión:", error);
      alert("Ocurrió un error al intentar actualizar la reunión.");
    }
  });

  cargarReuniones();
});