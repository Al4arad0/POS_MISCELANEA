import { auth } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Este código se ejecuta cada vez que carga una página protegida
onAuthStateChanged(auth, (user) => {
    if (user) {
        // El usuario está logueado
        console.log("Usuario autenticado:", user.email);
        
        // Si hay un elemento para mostrar el nombre del usuario, lo actualizamos
        const userInfoDisplay = document.querySelector('.user-info span');
        if(userInfoDisplay) {
            userInfoDisplay.textContent = `Usuario: ${user.displayName || user.email}`;
        }

    } else {
        // NO hay usuario logueado -> Mandar al Login
        // Evitar bucle infinito si ya estamos en login o register
        const path = window.location.pathname;
        if (!path.includes('login.html') && !path.includes('register.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Función global para cerrar sesión (para el botón del sidebar)
window.logout = async () => {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Error al cerrar sesión", error);
    }
};
