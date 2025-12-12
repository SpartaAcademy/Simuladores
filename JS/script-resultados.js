// JS/script-resultados.js

const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
const { jsPDF } = window.jspdf;

// Lista de materias para el filtro
const materias = {
    'sociales': 'Ciencias Sociales',
    'matematicas': 'Matemáticas y Física',
    'lengua': 'Lengua y Literatura',
    'ingles': 'Inglés',
    'general': 'General (Todas)',
    'inteligencia': 'Inteligencia',
    'personalidad': 'Personalidad',
    'ppnn1': 'Cuestionario 1 PPNN',
    'ppnn2': 'Cuestionario 2 PPNN',
    'ppnn3': 'Cuestionario 3 PPNN',
    'ppnn4': 'Cuestionario 4 PPNN',
    'sociales_esmil': 'Ciencias Sociales (ESMIL)',
    'matematicas_esmil': 'Matemáticas y Física (ESMIL)',
    'lengua_esmil': 'Lengua y Literatura (ESMIL)',
    'ingles_esmil': 'Inglés (ESMIL)',
    'general_esmil': 'General ESMIL (Todas)'
};

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('reporte-container');
    const spinner = document.getElementById('loading-spinner');
    const fCiudad = document.getElementById('filtro-ciudad');
    const fMateria = document.getElementById('filtro-materia');
    const fNombre = document.getElementById('filtro-nombre');

    function showError(msg) {
        document.getElementById('error-text').innerHTML = msg;
        document.getElementById('error-modal').style.display = 'flex';
        spinner.style.display = 'none';
        container.innerHTML = '<p style="text-align:center; color:red;">No se cargaron datos.</p>';
    }

    try {
        const { data: intentos, error } = await supabase.from('resultados').select('*');
        if(error) throw new Error(error.message);

        const resUsers = await fetch('DATA/usuarios.json');
        if(!resUsers.ok) throw new Error("Falta archivo usuarios.json");
        const usuariosLocal = await resUsers.json();

        // Llenar filtro
        Object.values(materias).forEach(m => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = m;
            fMateria.appendChild(opt);
        });

        const render = () => {
            container.innerHTML = '';
            if(!intentos || intentos.length === 0) {
                container.innerHTML = '<p class="no-intentos">No hay resultados aún.</p>';
                return;
            }

            const usuarios = usuariosLocal.filter(u => u.rol === 'aspirante').filter(u => {
                const matchC = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
                const matchN = u.nombre.toLowerCase().includes(fNombre.value.toLowerCase());
                return matchC && matchN;
            });

            usuarios.forEach(user => {
                const userInt = intentos.filter(i => 
                    i.usuario_id === user.usuario && 
                    (fMateria.value === 'Todas' || i.materia === fMateria.value)
                );

                if (fMateria.value !== 'Todas' && userInt.length === 0) return;

                const div = document.createElement('div');
                div.className = 'user-card';
                div.innerHTML = `
                    <div class="user-header">
                        <div><h3>${user.nombre}</h3><small>${user.ciudad}</small></div>
                        <strong>${userInt.length} Intentos</strong>
                    </div>
                    <div class="user-attempts">
                        <table class="table" style="width:100%">
                            ${userInt.map(i => `<tr><td>${i.materia}</td><td>${i.puntaje}</td></tr>`).join('')}
                        </table>
                    </div>
                `;
                div.querySelector('.user-header').onclick = () => div.classList.toggle('open');
                container.appendChild(div);
            });
        };

        fCiudad.onchange = render;
        fMateria.onchange = render;
        fNombre.oninput = render;
        spinner.style.display = 'none';
        render();

    } catch (e) {
        showError(e.message);
    }
});
