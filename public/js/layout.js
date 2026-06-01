document.addEventListener("DOMContentLoaded", function () {
    const placeholder = document.getElementById("header-placeholder");

    if (!placeholder) return;

    fetch("/api/auth/me", { credentials: "include" })
        .then((response) => {
            if (!response.ok) {
                window.location.href = "/";
                return null;
            }
            return fetch("/public/src/components/header.html");
        })
        .then((response) => {
            if (!response) return null;
            if (!response.ok) throw new Error("Error al cargar el header");
            return response.text();
        })
        .then((data) => {
            if (!data) return;
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
        .catch((err) => console.error("Fallo al cargar componente:", err));
});

document.addEventListener("click", async (event) => {
    const logoutButton = event.target.closest("#btnCerrarSesion");
    if (!logoutButton) return;

    event.preventDefault();
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
});