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
    const modalError = document.getElementById('modal-error');
    const txtError = document.getElementById('error-text');

    function showError(msg) {
        if(txtError && modalError) {
            txtError.textContent = msg;
            modalError.style.display = 'flex';
        }
        spinner.style.display = 'none';
        container.innerHTML = '<p class="no-intentos" style="color:red">Error al cargar datos.</p>';
    }

    try {
        const { data: intentos, error } = await supabase.from('resultados').select('*');
        if(error) throw new Error(error.message);

        const resUsers = await fetch('DATA/usuarios.json');
        if(!resUsers.ok) throw new Error("Falta usuarios.json");
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
            if(!intentos || intentos.length === 0) {
                container.innerHTML = '<p class="no-intentos">No hay intentos registrados.</p>';
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
                div.className = 'user-card'; // Clase de tu CSS
                // Ajuste de estilos inline por si acaso falta CSS
                div.style.background = "white"; 
                div.style.marginBottom = "15px";
                div.style.borderRadius = "8px";
                div.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";

                div.innerHTML = `
                    <div class="user-header" style="padding:15px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0; font-family:'Teko'; font-size:1.4rem;">${user.nombre}</h3>
                            <span style="color:#666;">${user.ciudad}</span>
                        </div>
                        <div>
                            <strong>${userInt.length}</strong> Intentos
                            <span style="font-size:0.8rem;">▼</span>
                        </div>
                    </div>
                    <div class="user-attempts" style="display:none; padding:15px; background:#f9f9f9; border-top:1px solid #eee;">
                        <table style="width:100%; border-collapse:collapse;">
                            <thead style="background:#eee;"><tr><th style="text-align:left; padding:5px;">Materia</th><th>Nota</th><th>Fecha</th></tr></thead>
                            <tbody>
                                ${userInt.map(i => `
                                    <tr>
                                        <td style="padding:5px; border-bottom:1px solid #ddd;">${i.materia}</td>
                                        <td style="padding:5px; border-bottom:1px solid #ddd; color:${i.puntaje>=700?'green':'red'}"><b>${i.puntaje}</b></td>
                                        <td style="padding:5px; border-bottom:1px solid #ddd;">${new Date(i.created_at).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <button class="btn-pdf-ind" style="margin-top:10px; background:#b22222; color:white; border:none; padding:5px 10px; cursor:pointer;">PDF Alumno</button>
                    </div>
                `;
                
                div.querySelector('.user-header').onclick = () => {
                    const body = div.querySelector('.user-attempts');
                    body.style.display = body.style.display === 'none' ? 'block' : 'none';
                };
                
                div.querySelector('.btn-pdf-ind').onclick = (e) => {
                    e.stopPropagation();
                    generarPDFIndividual(user, userInt);
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
            // (Lógica simplificada para exportar lo visible)
            usuariosLocal.filter(u => u.rol === 'aspirante').forEach(user => {
                const userInt = intentos.filter(i => i.usuario_id === user.usuario);
                userInt.forEach(intento => {
                     rows.push([user.nombre, user.ciudad, intento.materia, intento.puntaje, new Date(intento.created_at).toLocaleDateString()]);
                });
            });
            doc.autoTable({ startY: 30, head: [['Nombre','Ciudad','Materia','Nota','Fecha']], body: rows });
            doc.save('reporte_general.pdf');
        });

    } catch (e) {
        showError(e.message);
    }

    function generarPDFIndividual(user, intentos) {
        const doc = new jsPDF();
        doc.text(`Reporte: ${user.nombre} (${user.ciudad})`, 14, 20);
        const rows = intentos.map(i => [i.materia, i.puntaje, new Date(i.created_at).toLocaleString()]);
        doc.autoTable({ startY: 30, head: [['Materia','Nota','Fecha']], body: rows });
        doc.save(`Reporte_${user.nombre}.pdf`);
    }
});
