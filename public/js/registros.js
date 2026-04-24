document.addEventListener("DOMContentLoaded", () => {
  const reunionSelect = document.getElementById("reunionSelect");
  const searchInput = document.getElementById("searchInput");
  const tabla = document.getElementById("tablaAsistencias");
  const btnBuscar = document.getElementById("btnBuscar");

  if (!reunionSelect || !tabla) return;

  async function cargarReuniones() {
    const response = await fetch("/api/reuniones");
    const reuniones = await response.json();
    reunionSelect.innerHTML = reuniones.length
      ? reuniones.map((r) => `<option value="${r.id_reunion}">${r.nombre_reunion} (${new Date(r.fecha_reunion).toLocaleDateString("es-MX")})</option>`).join("")
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
          data-id="${item.id_ciudadano}" data-estado="${item.estado_asistencia ? 1 : 0}">
          ${item.estado_asistencia ? "Marcar Ausente" : "Marcar Presente"}
        </button>
      </td>
    </tr>`;
  }

  async function cargarAsistencias() {
    const reunionId = reunionSelect.value;
    if (!reunionId) return;
    const response = await fetch(`/api/asistencias?reunionId=${encodeURIComponent(reunionId)}&search=${encodeURIComponent(searchInput.value.trim())}`);
    const data = await response.json();
    tabla.innerHTML = data.length ? data.map(renderFila).join("") : '<tr><td colspan="5">No hay resultados.</td></tr>';
  }

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
    await cargarAsistencias();
  });

  btnBuscar?.addEventListener("click", cargarAsistencias);
  reunionSelect.addEventListener("change", cargarAsistencias);

  cargarReuniones().then(cargarAsistencias).catch(() => {
    tabla.innerHTML = '<tr><td colspan="5" class="text-danger">No fue posible cargar los registros.</td></tr>';
  });
});
