document.addEventListener("DOMContentLoaded", () => {
  const reunionSelect = document.getElementById("reunionSelect");
  const searchInput = document.getElementById("searchInput");
  const tabla = document.getElementById("tablaAsistencias");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnExportarExcel = document.getElementById("btnExportarExcel");
  const btnExportarPdf = document.getElementById("btnExportarPdf");

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

  function obtenerTablaVisible() {
    const tablaCompleta = document.querySelector(".result-placeholder table");
    if (!tablaCompleta) return null;

    const encabezados = Array.from(tablaCompleta.querySelectorAll("thead th"))
      .filter((th) => th.offsetParent !== null)
      .map((th) => th.textContent.trim());

    const filas = Array.from(tablaCompleta.querySelectorAll("tbody tr"))
      .filter((tr) => !tr.querySelector("td[colspan]"))
      .map((tr) =>
        Array.from(tr.querySelectorAll("td"))
          .filter((td) => td.offsetParent !== null)
          .map((td) => td.textContent.trim())
      )
      .filter((fila) => fila.length);

    if (!encabezados.length || !filas.length) return null;
    return { encabezados, filas };
  }

  function nombreArchivo(base) {
    const reunionNombre = reunionSelect.options[reunionSelect.selectedIndex]?.text || "asistencias";
    const reunionLimpia = reunionNombre
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w-]/g, "");
    const fecha = new Date().toISOString().slice(0, 10);
    return `${base}_${reunionLimpia || "asistencias"}_${fecha}`;
  }

  function exportarExcel() {
    const tablaVisible = obtenerTablaVisible();
    if (!tablaVisible || typeof XLSX === "undefined") {
      alert("No hay datos para exportar a Excel.");
      return;
    }

    const { encabezados, filas } = tablaVisible;
    const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asistencias");
    XLSX.writeFile(libro, `${nombreArchivo("reporte_asistencias")}.xlsx`);
  }

  function exportarPdf() {
    const tablaVisible = obtenerTablaVisible();
    if (!tablaVisible || typeof window.jspdf === "undefined") {
      alert("No hay datos para exportar a PDF.");
      return;
    }

    const { encabezados, filas } = tablaVisible;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(12);
    doc.text("Reporte de asistencias", 14, 15);

    doc.autoTable({
      head: [encabezados],
      body: filas,
      startY: 22,
      styles: { fontSize: 9 }
    });

    doc.save(`${nombreArchivo("reporte_asistencias")}.pdf`);
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
  btnExportarExcel?.addEventListener("click", exportarExcel);
  btnExportarPdf?.addEventListener("click", exportarPdf);

  cargarReuniones().then(cargarAsistencias).catch(() => {
    tabla.innerHTML = '<tr><td colspan="5" class="text-danger">No fue posible cargar los registros.</td></tr>';
  });
});
