// JS/script-login.js - CONECTADO A SUPABASE

// Conexión Supabase
const sbUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const db = window.supabase.createClient(sbUrl, sbKey);

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usuarioInput = document.getElementById('usuario');
    const contrasenaInput = document.getElementById('contrasena');
    const errorMensaje = document.getElementById('error-mensaje');
    const togglePassword = document.getElementById('togglePassword');
    
    // Modal Elementos
    const modalOverlay = document.getElementById('modal-overlay');
    const modalNombreAspirante = document.getElementById('modal-nombre-aspirante');
    const modalRolAspirante = document.getElementById('modal-rol-aspirante');
    const continuarBtn = document.getElementById('continuar-btn');

    // Verificar si ya está logueado (auth.js)
    if (isLoggedIn()) {
        window.location.replace('index.html');
        return;
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMensaje.style.display = 'none';
        
        const usuario = usuarioInput.value.trim();
        const contrasena = contrasenaInput.value.trim();

        // Consulta a Supabase
        try {
            const { data, error } = await db
                .from('usuarios')
                .select('*')
                .eq('usuario', usuario)
                .eq('contrasena', contrasena)
                .single();

            if (error || !data) {
                throw new Error("Credenciales incorrectas");
            }

            // Login Exitoso
            const userInfo = {
                id: data.id, // Guardamos ID para referencias futuras
                usuario: data.usuario,
                nombre: data.nombre,
                rol: data.rol || 'aspirante',
                ciudad: data.ciudad || 'N/A',
                permisos: data.permisos || ['*']
            };
            
            saveSession(userInfo); // auth.js guarda sesión

            // Mostrar Modal Bienvenida
            modalNombreAspirante.textContent = userInfo.nombre;
            const prefix = (userInfo.rol === 'admin') ? 'Administrador' : 'Aspirante';
            modalRolAspirante.textContent = prefix;
            modalOverlay.style.display = 'flex';

        } catch (err) {
            console.error(err);
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
        togglePassword.addEventListener('click', function () {
            const type = contrasenaInput.getAttribute('type') === 'password' ? 'text' : 'password';
            contrasenaInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
});
