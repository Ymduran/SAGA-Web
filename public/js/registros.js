document.addEventListener("DOMContentLoaded", () => {
  const reunionSelect = document.getElementById("reunionSelect");
  const searchInput = document.getElementById("searchInput");
  const tabla = document.getElementById("tablaAsistencias");
  const btnBuscar = document.getElementById("btnBuscar");
  const sugerencias = document.getElementById("sugerencias");

  if (!reunionSelect || !tabla) return;

  async function cargarReuniones() {
    const response = await fetch("/api/reuniones");
    const reuniones = await response.json();

    reunionSelect.innerHTML = reuniones.length
      ? reuniones.map((r) =>
          `<option value="${r.id_reunion}">
            ${r.nombre_reunion} (${new Date(r.fecha_reunion).toLocaleDateString("es-MX")})
          </option>`
        ).join("")
      : '<option value="">Sin reuniones registradas</option>';
  }

  function renderFila(item) {
    return `<tr>
      <td>${item.id_ciudadano}</td>
      <td>${item.nombre_completo}</td>
      <td>${item.telefono}</td>
      <td>${item.estado_asistencia ? "Presente" : "Ausente"}</td>
      <td>
        <button class="btn btn-sm ${item.estado_asistencia ? "btn-outline-secondary" : "btn-success"} btn-toggle-asistencia"
          data-id="${item.id_ciudadano}"
          data-estado="${item.estado_asistencia ? 1 : 0}">
          ${item.estado_asistencia ? "Marcar Ausente" : "Marcar Presente"}
        </button>
      </td>
    </tr>`;
  }

  async function cargarAsistencias() {
    const reunionId = reunionSelect.value;
    if (!reunionId) return;

    const texto = searchInput.value.trim();

    const response = await fetch(
      `/api/asistencias?reunionId=${encodeURIComponent(reunionId)}&search=${encodeURIComponent(texto)}`
    );

    const data = await response.json();

    data.sort((a, b) => a.id_ciudadano - b.id_ciudadano);

    tabla.innerHTML = data.length
      ? data.map(renderFila).join("")
      : '<tr><td colspan="5">No hay resultados.</td></tr>';
  }

  /* ===========================
     AUTOCOMPLETADO + FILTRO
  ============================ */

  searchInput.addEventListener("input", async () => {
    const texto = searchInput.value.trim();
    const reunionId = reunionSelect.value;
    if (!reunionId) return;

    // 🔹 Si está vacío → mostrar todo
    if (texto === "") {
      sugerencias.innerHTML = "";
      cargarAsistencias();
      return;
    }

    // 🔹 Si tiene menos de 2 letras → no mostrar sugerencias
    if (texto.length < 2) {
      sugerencias.innerHTML = "";
      return;
    }

    const response = await fetch(
      `/api/asistencias?reunionId=${encodeURIComponent(reunionId)}&search=${encodeURIComponent(texto)}`
    );

    const data = await response.json();

    sugerencias.innerHTML = "";

    data.slice(0, 5).forEach(item => {
      const opcion = document.createElement("button");
      opcion.type = "button";
      opcion.className = "list-group-item list-group-item-action";
      opcion.textContent = `${item.nombre_completo} - ID: ${item.id_ciudadano}`;

      opcion.addEventListener("click", () => {
        searchInput.value = item.nombre_completo;
        sugerencias.innerHTML = "";
        cargarAsistencias();
      });

      sugerencias.appendChild(opcion);
    });

    // 🔹 También filtrar tabla en tiempo real
    cargarAsistencias();
  });

  // Cerrar sugerencias si hacen click fuera
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

    await fetch("/api/asistencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_ciudadano: Number(boton.dataset.id),
        id_reunion: Number(reunionSelect.value),
        estado_asistencia: boton.dataset.estado !== "1"
      })
    });

    cargarAsistencias();
  });

  btnBuscar?.addEventListener("click", cargarAsistencias);
  reunionSelect.addEventListener("change", cargarAsistencias);

  cargarReuniones()
    .then(cargarAsistencias)
    .catch(() => {
      tabla.innerHTML =
        '<tr><td colspan="5" class="text-danger">No fue posible cargar los registros.</td></tr>';
    });
});