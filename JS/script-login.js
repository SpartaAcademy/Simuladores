// JS/script-login.js - Lógica de la página de login

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usuarioInput = document.getElementById('usuario');
    const contrasenaInput = document.getElementById('contrasena');
    const errorMensaje = document.getElementById('error-mensaje');
    const togglePassword = document.getElementById('togglePassword'); // (NUEVO) Referencia al ojo

    // Referencias al Modal
    const modalOverlay = document.getElementById('modal-overlay');
    const modalNombreAspirante = document.getElementById('modal-nombre-aspirante');
    const continuarBtn = document.getElementById('continuar-btn');

    // Redirigir si ya está logueado
    if (isLoggedIn()) {
        window.location.replace('index.html');
        return;
    }

    // Cargar usuarios
    let usuarios = [];
    fetch('DATA/usuarios.json')
        .then(response => response.json())
        .then(data => { usuarios = data; })
        .catch(error => {
            console.error('Error cargando usuarios:', error);
            errorMensaje.textContent = 'Error al cargar datos de usuario. Intente más tarde.';
            errorMensaje.style.display = 'block';
        });

    // Manejar envío del formulario
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        errorMensaje.style.display = 'none';

        const usuario = usuarioInput.value.trim();
        const contrasena = contrasenaInput.value;

        const usuarioEncontrado = usuarios.find(u => u.usuario === usuario && u.contrasena === contrasena);

        if (usuarioEncontrado) {
            const userInfo = { nombre: usuarioEncontrado.nombre };
            saveSession(userInfo);
            modalNombreAspirante.textContent = userInfo.nombre;
            modalOverlay.style.display = 'flex';
        } else {
            errorMensaje.textContent = 'Usuario o contraseña incorrectos.';
            errorMensaje.style.display = 'block';
            contrasenaInput.value = '';
        }
    });

    // Manejar botón "Continuar" del modal
    continuarBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
        window.location.replace('index.html');
    });

    // (NUEVO) Lógica para mostrar/ocultar contraseña
    if (togglePassword && contrasenaInput) {
        togglePassword.addEventListener('click', function (e) {
            // Obtener el tipo actual del input
            const type = contrasenaInput.getAttribute('type') === 'password' ? 'text' : 'password';
            contrasenaInput.setAttribute('type', type);

            // Cambiar el icono del ojo
            this.classList.toggle('fa-eye'); // Quita fa-eye si existe, lo añade si no
            this.classList.toggle('fa-eye-slash'); // Añade fa-eye-slash si no existe, lo quita si sí
        });
    }
});
