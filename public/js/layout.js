document.addEventListener("DOMContentLoaded", function () {
    const placeholder = document.getElementById("header-placeholder");

    if (placeholder) {
        // Usamos ../ para salir de views/ y entrar a public/
        fetch("/public/src/components/header.html")
            .then(response => {
                if (!response.ok) throw new Error("Error al cargar el header");
                return response.text();
            })
            .then(data => {
                placeholder.innerHTML = data;

                // Lógica para poner la clase 'active' en el menú
                const currentPage = window.location.pathname.split("/").pop();
                const links = document.querySelectorAll(".nav-link");

                links.forEach(link => {
                    const linkPage = link.getAttribute("href").split("/").pop();
                    if (linkPage === currentPage) {
                        link.classList.add("active");
                    }
                });
            })
            .catch(err => console.error("Fallo al cargar componente:", err));
    }
});