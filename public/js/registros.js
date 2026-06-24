document.addEventListener("DOMContentLoaded", () => {
  const reunionSelect = document.getElementById("reunionSelect");
  const searchInput = document.getElementById("searchInput");
  const tabla = document.getElementById("tablaAsistencias");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnFinalizarReunion = document.getElementById("btnFinalizarReunion");
  const sugerencias = document.getElementById("sugerencias");
  const presentesCount = document.getElementById("presentesCount");
  const ausentesCount = document.getElementById("ausentesCount");

  // Instancia del modal de Bootstrap de forma segura
  const modalElement = document.getElementById("modalConfirmarFinalizar");
  let bsModal = null;
  const crearBootstrapModal = () => {
    if (!modalElement) return null;
    if (!window.bootstrap || !window.bootstrap.Modal) {
      console.warn("Bootstrap Modal no está disponible aún.");
      return null;
    }
    try {
      return new window.bootstrap.Modal(modalElement);
    } catch (error) {
      console.error("Error al inicializar el modal de Bootstrap:", error);
      return null;
    }
  };

  bsModal = crearBootstrapModal();
  
  const btnModalConfirmarSi = document.getElementById("btnModalConfirmarSi");
  const modalNombreReunion = document.getElementById("modalNombreReunion");

  if (!reunionSelect || !tabla) return;

  let reunionFinalizada = false;

  async function cargarReuniones() {
    const response = await sagaFetch("/api/reuniones");
    const reuniones = await response.json();

    reunionSelect.innerHTML = reuniones.length
      ? reuniones.map((r) =>
          `<option value="${r.id_reunion}" data-finalizada="${r.finalizada ? "true" : "false"}">
            ${r.nombre_reunion} (${new Date(r.fecha_reunion).toLocaleDateString("es-MX")})
          </option>`
        ).join("")
      : '<option value="">Sin reuniones registradas</option>';

    actualizarEstadoReunion();
  }

  function renderFila(item) {
    const nombreCompleto = `${item.nombres || ''} ${item.apellido_paterno || ''} ${item.apellido_materno || ''}`.trim();
    const botonDeshabilitado = reunionFinalizada ? "disabled" : "";
    const botonClase = item.estado_asistencia ? "btn-outline-secondary" : "btn-success";
    const botonTexto = item.estado_asistencia ? "Marcar Ausente" : "Marcar Presente";
    const estadoTexto = item.estado_asistencia ? "Presente" : "Ausente";
    const estadoClase = item.estado_asistencia ? "estado-presente" : "estado-ausente";

    return `<tr>
      <td>${item.id_ciudadano}</td>
      <td>${nombreCompleto}</td>
      <td>${item.telefono}</td>
      <td class="${estadoClase}">${estadoTexto}</td>
      <td>
        <button class="btn btn-sm ${botonClase} btn-toggle-asistencia" ${botonDeshabilitado}
          data-id="${item.id_ciudadano}"
          data-estado="${item.estado_asistencia ? 1 : 0}">
          ${botonTexto}
        </button>
      </td>
    </tr>`;
  }

  //Actualiza el estado de la reunión y habilita/deshabilita el botón de finalizar según corresponda
  function actualizarEstadoReunion() {
    const selectedOption = reunionSelect.selectedOptions[0];
    const statusContainer = document.getElementById("reunionStatus");

    if (!selectedOption) {
      reunionFinalizada = false;
      if (statusContainer) statusContainer.innerHTML = "";
      btnFinalizarReunion?.setAttribute("disabled", "disabled");
      return;
    }

    reunionFinalizada = selectedOption.dataset.finalizada === "true";
    
    if (reunionFinalizada) {
      if (statusContainer) {
        statusContainer.innerHTML = '<div class="alert alert-danger py-2 fw-bold">Esta reunión está <strong>finalizada</strong>. No se pueden cambiar asistencias.</div>';
      }
      btnFinalizarReunion?.setAttribute("disabled", "disabled");
    } else {
      if (statusContainer) {
        statusContainer.innerHTML = '<div class="alert alert-info py-2">Esta reunión está abierta. Puede marcar asistencia.</div>';
      }
      btnFinalizarReunion?.removeAttribute("disabled");
    }
  }

  function actualizarContadores(data) {
    const presentes = data.filter((item) => item.estado_asistencia).length;
    const ausentes = data.length - presentes;
    if (presentesCount) presentesCount.textContent = String(presentes);
    if (ausentesCount) ausentesCount.textContent = String(ausentes);
  }

  async function cargarAsistencias() {
    const reunionId = reunionSelect.value;
    if (!reunionId) return;

    const texto = searchInput.value.trim();

    const response = await sagaFetch(
      `/api/asistencias?reunionId=${encodeURIComponent(reunionId)}&search=${encodeURIComponent(texto)}`
    );

    const data = await response.json();

    data.sort((a, b) => a.id_ciudadano - b.id_ciudadano);

    tabla.innerHTML = data.length
      ? data.map(renderFila).join("")
      : '<tr><td colspan="5">No hay resultados.</td></tr>';

    actualizarContadores(data);

    const contenedor = tabla.closest('div[style]');
    if (contenedor) contenedor.scrollTop = 0;
  }

  /* ===========================
      MANEJO DEL MODAL DE CIERRE
  ============================ */
  // De esta manera el listener queda fijo al botón que ya existe estáticamente en el HTML
  btnFinalizarReunion?.addEventListener("click", () => {
    const selectedOption = reunionSelect.selectedOptions[0];
    if (!selectedOption || !bsModal) return;

    // Ponemos el texto de la reunión en el modal
    if (modalNombreReunion) {
      modalNombreReunion.textContent = selectedOption.text;
    }
    
    // Mostramos el modal usando la API de Bootstrap
    bsModal.show();
  });

  btnModalConfirmarSi?.addEventListener("click", async () => {
    const reunionId = reunionSelect.value;
    if (!reunionId) return;

    try {
      const response = await sagaFetch(`/api/reuniones/${encodeURIComponent(reunionId)}/finalizar`, { method: "POST" });
      
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "No fue posible finalizar la reunión.");
        bsModal?.hide();
        return;
      }

      // Cerramos el modal de confirmación
      bsModal?.hide();

      // Forzar actualización del dataset de la opción seleccionada
      const selectedOption = reunionSelect.selectedOptions[0];
      if (selectedOption) selectedOption.dataset.finalizada = "true";

      actualizarEstadoReunion();
      await cargarAsistencias();

    } catch (error) {
      console.error("Error al finalizar reunión:", error);
      alert("Ocurrió un error al intentar finalizar la reunión.");
      bsModal?.hide();
    }
  });

  /* ===========================
      AUTOCOMPLETADO + FILTRO
  ============================ */
  searchInput.addEventListener("input", async () => {
    const texto = searchInput.value.trim();
    const reunionId = reunionSelect.value;
    if (!reunionId) return;

    if (texto === "") {
      sugerencias.innerHTML = "";
      cargarAsistencias();
      return;
    }

    if (texto.length < 2) {
      sugerencias.innerHTML = "";
      return;
    }

    cargarAsistencias();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".input-group")) {
      sugerencias.innerHTML = "";
    }
  });

  /* ===========================
      MARCAR ASISTENCIA
  ============================ */
  tabla.addEventListener("click", async (event) => {
    const boton = event.target.closest(".btn-toggle-asistencia");
    if (!boton) return;
    if (reunionFinalizada) {
      alert("No se pueden cambiar asistencias de una reunión finalizada.");
      return;
    }

    const response = await sagaFetch("/api/asistencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_ciudadano: Number(boton.dataset.id),
        id_reunion: Number(reunionSelect.value),
        estado_asistencia: boton.dataset.estado !== "1"
      })
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "No fue posible actualizar la asistencia.");
      return;
    }

    await cargarAsistencias();
  });

  btnBuscar?.addEventListener("click", cargarAsistencias);
  
  reunionSelect.addEventListener("change", async () => {
    actualizarEstadoReunion();
    await cargarAsistencias();
  });

  cargarReuniones()
    .then(cargarAsistencias)
    .catch(() => {
      tabla.innerHTML =
        '<tr><td colspan="5" class="text-danger">No fue posible cargar los registros.</td></tr>';
    });
});