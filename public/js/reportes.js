document.addEventListener("DOMContentLoaded", () => {
  const reunionSelect = document.getElementById("filtroReunion");
  const fechaInicial = document.getElementById("fechaInicial");
  const fechaFinal = document.getElementById("fechaFinal");
  const btnAplicar = document.getElementById("btnAplicarFiltros");
  const ctx = document.getElementById("asistenciaChart");
  if (!ctx) return;

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
          max: 100
        }
      }
    }
  });

  async function cargarReuniones() {
    const response = await fetch("/api/reuniones");
    const reuniones = await response.json();
    reunionSelect.innerHTML =
      '<option value="">Todas las reuniones</option>' +
      reuniones.map((r) => `<option value="${r.id_reunion}">${r.nombre_reunion}</option>`).join("");
  }

  async function cargarResumen() {
    const params = new URLSearchParams();
    if (reunionSelect.value) params.set("reunionId", reunionSelect.value);
    if (fechaInicial.value) params.set("fechaInicio", fechaInicial.value);
    if (fechaFinal.value) params.set("fechaFin", fechaFinal.value);

    const response = await fetch(`/api/reportes/resumen?${params.toString()}`);
    const resumen = await response.json();
    chart.data.datasets[0].data = [resumen.porcentaje_presentes, resumen.porcentaje_ausentes];
    chart.update();
  }

  btnAplicar?.addEventListener("click", cargarResumen);
  cargarReuniones().then(cargarResumen);
});
