document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM DE SAGA
  const reunionSelect = document.getElementById("filtroReunion");
  const ctx = document.getElementById("asistenciaChart");
  const btnExportarExcel = document.getElementById("btnExportarExcel");
  const btnExportarPdf = document.getElementById("btnExportarPdf");

  // Verificar que el canvas existe
  if (!ctx) return;

  // Variable global para almacenar los datos actuales
  let datosActuales = {
    reunionNombre: "",
    porcentajes: [0, 0],
    asistentes: []
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
      const response = await fetch("/api/reuniones");
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
        asistentes: []
      };
      return;
    }

    try {
      // Obtener el nombre de la reunión seleccionada
      const reunionNombre = reunionSelect.options[reunionSelect.selectedIndex]?.text || "Reunión";
      
      // Obtener datos de asistencia para la reunión
      const response = await fetch(`/api/asistencias?reunionId=${encodeURIComponent(reunionId)}`);
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
          nombre_completo: a.nombre_completo,
          telefono: a.telefono,
          estado_asistencia: a.estado_asistencia
        }))
      };

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
   * Obtener datos para exportación con formato específico
   */
  function obtenerDatosExportacion() {
    if (!datosActuales.asistentes || datosActuales.asistentes.length === 0) {
      return null;
    }

    return {
      reunionNombre: datosActuales.reunionNombre,
      encabezados: ["ID", "Nombre", "Teléfono", "Estado"],
      filas: datosActuales.asistentes.map(a => [
        a.id_ciudadano || '',
        a.nombre_completo || '',
        a.telefono || '',
        obtenerEstadoTexto(a.estado_asistencia)
      ])
    };
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
    
    // Ajustar anchos de columna
    hoja['!cols'] = [
      { wch: 8 },  // ID
      { wch: 30 }, // Nombre
      { wch: 15 }, // Teléfono
      { wch: 12 }  // Estado
    ];

    // Combinar celda del título (opcional)
    hoja['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

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
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 27, halign: 'center' },  // ID
        1: { cellWidth: 120 },                      // Nombre
        2: { cellWidth: 60, halign: 'center' },    // Teléfono
        3: { cellWidth: 60, halign: 'center' }     // Estado
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    doc.save(`${nombreArchivo("reporte_asistencia")}.pdf`);
  }

  // Event Listeners
  reunionSelect?.addEventListener("change", cargarDatos);
  btnExportarExcel?.addEventListener("click", exportarExcel);
  btnExportarPdf?.addEventListener("click", exportarPdf);

  // Inicialización
  cargarReuniones();
});