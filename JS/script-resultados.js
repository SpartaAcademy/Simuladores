// JS/script-resultados.js

const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
const { jsPDF } = window.jspdf;

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
    const fMateria = document.getElementById('filtro-materia');
    const fCiudad = document.getElementById('filtro-ciudad');
    const fNombre = document.getElementById('filtro-nombre');
    const btnPdf = document.getElementById('descargar-pdf-btn');

    try {
        const { data: intentos, error } = await supabase.from('resultados').select('*');
        if(error) throw new Error(error.message);

        const resUsers = await fetch('DATA/usuarios.json');
        const usuariosLocal = await resUsers.json();

        // Llenar Filtro
        fMateria.innerHTML = '<option value="Todas">Todas las Materias</option>';
        Object.values(materias).forEach(m => {
            const opt = document.createElement('option');
            opt.value = m; opt.textContent = m;
            fMateria.appendChild(opt);
        });

        // Render
        const render = () => {
            container.innerHTML = '';
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
                        <h3>${user.nombre} (${user.ciudad})</h3>
                        <strong>${userInt.length} Intentos</strong>
                    </div>
                    <div class="user-attempts" style="display:none; padding:10px;">
                        <table class="table">
                            ${userInt.map(i => `<tr><td>${i.materia}</td><td>${i.puntaje}</td><td>${new Date(i.created_at).toLocaleDateString()}</td></tr>`).join('')}
                        </table>
                    </div>
                `;
                div.querySelector('.user-header').onclick = () => {
                    const body = div.querySelector('.user-attempts');
                    body.style.display = body.style.display === 'none' ? 'block' : 'none';
                };
                container.appendChild(div);
            });
        };

        fCiudad.onchange = render;
        fMateria.onchange = render;
        fNombre.oninput = render;
        spinner.style.display = 'none';
        render();

        // PDF GENERAL
        btnPdf.addEventListener('click', () => {
            const doc = new jsPDF();
            doc.text("REPORTE GENERAL SPARTA", 14, 20);
            const rows = [];
            // Lógica para exportar lo filtrado
            // (Aquí puedes agregar la lógica para recorrer 'intentos' filtrados y añadirlos a rows)
            intentos.forEach(i => {
                rows.push([i.usuario_nombre, i.ciudad, i.materia, i.puntaje, new Date(i.created_at).toLocaleDateString()]);
            });
            doc.autoTable({ startY: 30, head: [['Nombre','Ciudad','Materia','Nota','Fecha']], body: rows });
            doc.save('reporte_general.pdf');
        });

    } catch (e) {
        container.innerHTML = `<p style="color:red">Error: ${e.message}</p>`;
        spinner.style.display = 'none';
    }
});
