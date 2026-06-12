document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM DE SAGA
  const reunionSelect = document.getElementById("filtroReunion");
  const ctx = document.getElementById("asistenciaChart");
  const ordenamientoSelect = document.getElementById("ordenamientoReporte");
  const statusFilter = document.getElementById("statusFilter");
  const reporteBody = document.getElementById("reporteBody");
  const btnExportarExcel = document.getElementById("btnExportarExcel");
  const btnExportarPdf = document.getElementById("btnExportarPdf");

  // Verificar que el canvas existe
  if (!ctx) return;

  // Variable global para almacenar los datos actuales
  let datosActuales = {
    reunionNombre: "",
    porcentajes: [0, 0],
    asistentes: [],
    orden: 'nombre',
    status: 'todos'
  };

  // Inicializar gráfica
  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Presente", "Ausente"],
      datasets: [
        {
          label: "Porcentaje (%)",
          data: [0, 0],
          backgroundColor: ["#4CAF50", "#F44336"]
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Porcentaje'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Estado de Asistencia'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      }
    }
  });

  /**
   * Cargar reuniones en el select
   */
  async function cargarReuniones() {
    try {
      const response = await sagaFetch("/api/reuniones");
      const reuniones = await response.json();
      
      reunionSelect.innerHTML = '<option value="">Seleccione una reunión</option>' +
        reuniones.map((r) => `<option value="${r.id_reunion}">${r.nombre_reunion}</option>`).join("");
    } catch (error) {
      console.error("Error al cargar reuniones:", error);
      reunionSelect.innerHTML = '<option value="">Error al cargar reuniones</option>';
    }
  }

  /**
   * Cargar datos de asistencia según la reunión seleccionada
   */
  async function cargarDatos() {
    const reunionId = reunionSelect.value;
    
    if (!reunionId) {
      // Resetear gráfica y datos si no hay selección
      chart.data.datasets[0].data = [0, 0];
      chart.update();
      datosActuales = {
        reunionNombre: "",
        porcentajes: [0, 0],
        asistentes: [],
        orden: ordenamientoSelect?.value || 'nombre',
        status: statusFilter?.value || 'todos'
      };
      renderTablaReporte();
      return;
    }

    try {
      // Obtener el nombre de la reunión seleccionada
      const reunionNombre = reunionSelect.options[reunionSelect.selectedIndex]?.text || "Reunión";
      
      // Obtener datos de asistencia para la reunión
      const response = await sagaFetch(`/api/asistencias?reunionId=${encodeURIComponent(reunionId)}`);
      const asistentes = await response.json();

      // Calcular porcentajes
      const total = asistentes.length;
      const presentes = asistentes.filter(a => a.estado_asistencia === true || a.estado_asistencia === 1 || a.estado_asistencia === "Presente").length;
      const ausentes = total - presentes;
      
      const porcentajePresentes = total > 0 ? Math.round((presentes / total) * 100) : 0;
      const porcentajeAusentes = total > 0 ? Math.round((ausentes / total) * 100) : 0;

      // Actualizar gráfica
      chart.data.datasets[0].data = [porcentajePresentes, porcentajeAusentes];
      chart.update();

      // Guardar datos para exportación
      datosActuales = {
        reunionNombre: reunionNombre,
        porcentajes: [porcentajePresentes, porcentajeAusentes],
        asistentes: asistentes.map(a => ({
          id_ciudadano: a.id_ciudadano,
          nombres: a.nombres,
          apellido_paterno: a.apellido_paterno,
          apellido_materno: a.apellido_materno,
          nombre_completo: a.nombre_completo || `${a.nombres || ''} ${a.apellido_paterno || ''} ${a.apellido_materno || ''}`.trim(),
          telefono: a.telefono,
          estado_asistencia: a.estado_asistencia
        })),
        orden: ordenamientoSelect?.value || 'nombre',
        status: statusFilter?.value || 'todos'
      };

      renderTablaReporte();

    } catch (error) {
      console.error("Error al cargar datos:", error);
      alert("Error al cargar los datos de asistencia");
      
      chart.data.datasets[0].data = [0, 0];
      chart.update();
      
      datosActuales = {
        reunionNombre: "",
        porcentajes: [0, 0],
        asistentes: []
      };
    }
  }

  /**
   * Obtener datos para exportación con formato específico respetando filtros activos
   */
  const INDICE_COL_ESTADO = 4;
  const COLOR_PRESENTE = [25, 135, 84];
  const COLOR_AUSENTE = [220, 53, 69];

  function obtenerDatosExportacion() {
    if (!datosActuales.asistentes || datosActuales.asistentes.length === 0) {
      return null;
    }

    // Aplicar orden actual
    const ordenActual = ordenamientoSelect?.value || datosActuales.orden;
    const asistentesOrdenados = ordenarAsistentes(datosActuales.asistentes, ordenActual);
    
    // Aplicar filtro de estado actual
    const estadoActual = statusFilter?.value || datosActuales.status;
    const asistentesFiltrados = filterPorEstado(asistentesOrdenados, estadoActual);
    
    return {
      reunionNombre: datosActuales.reunionNombre,
      encabezados: ["#", "Nombre", "Teléfono", "ID", "Estado"],
      filas: asistentesFiltrados.map((a, indice) => [
        indice + 1,
        formatNombre(a, ordenActual),
        a.telefono || "",
        a.id_ciudadano || "",
        obtenerEstadoTexto(a.estado_asistencia)
      ])
    };
  }

  function ordenarAsistentes(list, criterio) {
    const copy = (list || []).slice();
    if (criterio === 'apellido') {
      copy.sort((a, b) => {
        const apA = String(a.apellido_paterno || '').toLowerCase();
        const apB = String(b.apellido_paterno || '').toLowerCase();
        if (apA !== apB) return apA.localeCompare(apB, 'es');
        const nmA = String(a.nombres || '').toLowerCase();
        const nmB = String(b.nombres || '').toLowerCase();
        return nmA.localeCompare(nmB, 'es');
      });
      return copy;
    }
    copy.sort((a, b) => {
      const nmA = String(a.nombres || '').toLowerCase();
      const nmB = String(b.nombres || '').toLowerCase();
      if (nmA !== nmB) return nmA.localeCompare(nmB, 'es');
      const apA = String(a.apellido_paterno || '').toLowerCase();
      const apB = String(b.apellido_paterno || '').toLowerCase();
      return apA.localeCompare(apB, 'es');
    });
    return copy;
  }

  function formatNombre(a, criterio) {
    const paterno = String(a.apellido_paterno || '').trim();
    const materno = String(a.apellido_materno || '').trim();
    const nombres = String(a.nombres || '').trim();
    if (criterio === 'apellido') {
      return [paterno, materno, nombres].filter(Boolean).join(' ');
    }
    return [nombres, paterno, materno].filter(Boolean).join(' ');
  }

  function filterPorEstado(list, estado) {
    if (!list || !list.length) return [];
    if (estado === 'todos') return list;
    return list.filter(item => obtenerEstadoTexto(item.estado_asistencia) === estado);
  }

  function renderTablaReporte() {
    if (!reporteBody) return;
    const ordenActual = ordenamientoSelect?.value || datosActuales.orden;
    const estadoActual = statusFilter?.value || datosActuales.status;
    const listaOrdenada = ordenarAsistentes(datosActuales.asistentes, ordenActual);
    const listaFiltrada = filterPorEstado(listaOrdenada, estadoActual);

    reporteBody.innerHTML = listaFiltrada.length
      ? listaFiltrada.map((a, i) => {
          const estadoTexto = obtenerEstadoTexto(a.estado_asistencia);
          const claseEstado = estadoTexto === 'Presente' ? 'text-success fw-bold' : 'text-danger fw-bold';
          return `
          <tr>
            <td>${i + 1}</td>
            <td>${formatNombre(a, ordenActual)}</td>
            <td>${a.telefono || ''}</td>
            <td>${a.id_ciudadano}</td>
            <td class="${claseEstado}">${estadoTexto}</td>
          </tr>
        `;
        }).join("")
      : '<tr><td colspan="5">No hay registros.</td></tr>';
  }

  function estilosEstadoPdf(estado) {
    if (estado === "Presente") {
      return { textColor: COLOR_PRESENTE, fontStyle: "bold" };
    }
    if (estado === "Ausente") {
      return { textColor: COLOR_AUSENTE, fontStyle: "bold" };
    }
    return {};
  }

  function colorearEstadoEnHoja(hoja, filaInicioDatos, cantidadFilas) {
    for (let i = 0; i < cantidadFilas; i++) {
      const ref = XLSX.utils.encode_cell({ r: filaInicioDatos + i, c: INDICE_COL_ESTADO });
      const celda = hoja[ref];
      if (!celda) continue;
      const presente = celda.v === "Presente";
      celda.s = {
        font: {
          color: { rgb: presente ? "198754" : "DC3545" },
          bold: true
        }
      };
    }
  }

  /**
   * Convertir estado de asistencia a texto legible
   */
  function obtenerEstadoTexto(estado) {
    if (estado === true || estado === 1 || estado === "Presente") {
      return "Presente";
    }
    return "Ausente";
  }

  /**
   * Generar nombre de archivo para exportación
   */
  function nombreArchivo(base) {
    const reunionLimpia = datosActuales.reunionNombre
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .replace(/\s+/g, "_")
      .replace(/[^\w-]/g, "");
    const fecha = new Date().toISOString().slice(0, 10);
    return `${base}_${reunionLimpia || "asistencias"}_${fecha}`;
  }

  /**
   * Exportar a Excel
   */
  function exportarExcel() {
    const datos = obtenerDatosExportacion();
    
    if (!datos || typeof XLSX === "undefined") {
      alert("Seleccione una reunión para exportar los datos.");
      return;
    }

    const { encabezados, filas, reunionNombre } = datos;

    // Crear hoja con título
    const contenido = [
      [`Reporte de Asistencia - ${reunionNombre}`],
      [], // Fila vacía
      encabezados,
      ...filas
    ];

    const hoja = XLSX.utils.aoa_to_sheet(contenido);
    const filaInicioDatos = 3;

    colorearEstadoEnHoja(hoja, filaInicioDatos, filas.length);

    hoja["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 }
    ];

    hoja["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asistencia");
    XLSX.writeFile(libro, `${nombreArchivo("reporte_asistencia")}.xlsx`);
  }

  /**
   * Exportar a PDF
   */
  function exportarPdf() {
    const datos = obtenerDatosExportacion();
    
    if (!datos || typeof window.jspdf === "undefined") {
      alert("Seleccione una reunión para exportar los datos.");
      return;
    }

    const { encabezados, filas, reunionNombre } = datos;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });

    // Título principal
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Reporte de Asistencia", 14, 15);
    
    // Subtítulo con nombre de reunión y fecha
    doc.setFontSize(11);
    doc.text(`Reunión: ${reunionNombre}`, 14, 22);
    doc.text(`Total de registros: ${filas.length}`, 14, 29);
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString("es-MX")}`, 14, 36);

    // Tabla de datos
    doc.autoTable({
      head: [encabezados],
      body: filas,
      startY: 42,
      styles: {
        fontSize: 12,
        cellPadding: 3,
        lineColor: [100, 100, 100],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [0, 0, 245],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center"
      },
      columnStyles: {
        0: { cellWidth: 18, halign: "center" },
        1: { cellWidth: 95 },
        2: { cellWidth: 45, halign: "center" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 35, halign: "center" }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === INDICE_COL_ESTADO) {
          Object.assign(data.cell.styles, estilosEstadoPdf(data.cell.raw));
        }
      }
    });

    doc.save(`${nombreArchivo("reporte_asistencia")}.pdf`);
  }

  // Event Listeners
  reunionSelect?.addEventListener("change", cargarDatos);
  ordenamientoSelect?.addEventListener('change', () => {
    datosActuales.orden = ordenamientoSelect.value;
    renderTablaReporte();
  });
  statusFilter?.addEventListener('change', () => {
    datosActuales.status = statusFilter.value;
    renderTablaReporte();
  });
  btnExportarExcel?.addEventListener("click", exportarExcel);
  btnExportarPdf?.addEventListener("click", exportarPdf);

  // Inicialización
  cargarReuniones();
});