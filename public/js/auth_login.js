import { auth } from './firebase-init.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Feedback visual
    loginBtn.textContent = "Verificando...";
    loginBtn.disabled = true;
    errorMsg.style.display = 'none';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Si no hay error, Firebase guarda la sesión automáticamente
        // Redirigimos al menú principal
        window.location.href = 'index.html'; 
    } catch (error) {
        console.error(error);
        loginBtn.textContent = "Ingresar";
        loginBtn.disabled = false;
        errorMsg.style.display = 'block';
        
        // Mensajes de error amigables
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMsg.textContent = "Correo o contraseña incorrectos.";
        } else if (error.code === 'auth/too-many-requests') {
            errorMsg.textContent = "Demasiados intentos. Intenta más tarde.";
        } else {
            errorMsg.textContent = "Error al iniciar sesión: " + error.message;
        }
    }
});
