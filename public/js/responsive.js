document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');
    const navLinks = document.querySelectorAll('.sidebar nav a');

    // Función para alternar el menú
    const toggleMenu = () => {
        // Agrega o quita la clase 'active' que cambia la posición en CSS
        sidebar.classList.toggle('active');
        
        // Muestra u oculta el fondo oscuro
        if (sidebar.classList.contains('active')) {
            overlay.style.display = 'block';
        } else {
            overlay.style.display = 'none';
        }
    };

    // Evento Click en el botón hamburguesa
    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que el click se propague
            toggleMenu();
        });
    }

    // Evento Click en el fondo oscuro (para cerrar)
    if (overlay) {
        overlay.addEventListener('click', toggleMenu);
    }

    // Cerrar menú automáticamente al hacer clic en una opción (UX móvil)
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                overlay.style.display = 'none';
            }
        });
    });
});
