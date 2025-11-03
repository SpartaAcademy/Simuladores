// JS/script-login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usuarioInput = document.getElementById('usuario');
    const contrasenaInput = document.getElementById('contrasena');
    const errorMensaje = document.getElementById('error-mensaje');
    const togglePassword = document.getElementById('togglePassword');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalNombreAspirante = document.getElementById('modal-nombre-aspirante');
    const modalRolAspirante = document.getElementById('modal-rol-aspirante');
    const continuarBtn = document.getElementById('continuar-btn');

    // Esta función DEBE existir (viene de auth.js)
    if (isLoggedIn()) {
        window.location.replace('index.html');
        return;
    }

    let usuarios = [];
    fetch('DATA/usuarios.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error de red o archivo no encontrado');
            }
            return response.json();
        })
        .then(data => {
            // Filtra los objetos que son comentarios
            usuarios = data.filter(u => u.usuario); // Solo incluye objetos que tengan la propiedad 'usuario'
            console.log(`Cargados ${usuarios.length} usuarios.`);
        })
        .catch(error => {
            console.error('Error cargando usuarios.json:', error);
            errorMensaje.textContent = 'Error fatal al cargar datos de usuario. Revise el archivo JSON.';
            errorMensaje.style.display = 'block';
        });

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        errorMensaje.style.display = 'none';
        const usuario = usuarioInput.value.trim();
        const contrasena = contrasenaInput.value;

        if (usuarios.length === 0) {
             errorMensaje.textContent = 'Error: La lista de usuarios está vacía. Contacte al admin.';
             errorMensaje.style.display = 'block';
             return;
        }

        const usuarioEncontrado = usuarios.find(u => u.usuario === usuario && u.contrasena === contrasena);

        if (usuarioEncontrado) {
            const userInfo = {
                usuario: usuarioEncontrado.usuario,
                nombre: usuarioEncontrado.nombre,
                rol: usuarioEncontrado.rol || 'aspirante',
                ciudad: usuarioEncontrado.ciudad || 'N/A'
            };
            saveSession(userInfo); // <-- Esta función de auth.js guarda la sesión

            modalNombreAspirante.textContent = userInfo.nombre;
            const prefix = (userInfo.rol === 'aspirante') ? 'Aspirante' : 'Usuario';
            modalRolAspirante.textContent = prefix;
            modalOverlay.style.display = 'flex';
        } else {
            errorMensaje.textContent = 'Usuario o contraseña incorrectos.';
            errorMensaje.style.display = 'block';
            contrasenaInput.value = '';
        }
    });

    continuarBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
        window.location.replace('index.html');
    });

    if (togglePassword && contrasenaInput) {
        togglePassword.addEventListener('click', function (e) {
            const type = contrasenaInput.getAttribute('type') === 'password' ? 'text' : 'password';
            contrasenaInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
});
