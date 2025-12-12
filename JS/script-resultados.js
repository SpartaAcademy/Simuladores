// JS/script-resultados.js

const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
const { jsPDF } = window.jspdf;


// LISTA DE MATERIAS (PARA EL FILTRO)
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
    // Referencias
    const container = document.getElementById('reporte-container');
    const spinner = document.getElementById('loading-spinner');
    
    // Filtros y Botones
    const fCiudad = document.getElementById('filtro-ciudad');
    const fMateria = document.getElementById('filtro-materia');
    const fNombre = document.getElementById('filtro-nombre');
    const btnPdf = document.getElementById('descargar-pdf-btn');
    const btnCsv = document.getElementById('descargar-general-csv-btn');

    // Datos en memoria
    let allIntentos = [];
    let allUsuarios = [];
    let filteredIntentos = []; // Para el PDF General

    // Función auxiliar para errores
    function showError(msg) {
        container.innerHTML = `<p style="color:red; text-align:center; font-weight:bold;">${msg}</p>`;
        spinner.style.display = 'none';
    }

    try {
        // 1. CARGAR DATOS
        const { data: intentos, error } = await supabase.from('resultados').select('*');
        if(error) throw new Error("Error Supabase: " + error.message);
        allIntentos = intentos;

        const resUsers = await fetch('DATA/usuarios.json');
        if(!resUsers.ok) throw new Error("Falta archivo usuarios.json");
        allUsuarios = await resUsers.json();

        // 2. POBLAR FILTRO MATERIAS
        // Usamos la lista 'materias' definida arriba o lo que venga de la DB
        const matsEnDB = [...new Set(intentos.map(i => i.materia))];
        // Fusionamos con la lista oficial para asegurar nombres bonitos
        const listaFinal = new Set([...Object.values(materias), ...matsEnDB]);
        
        fMateria.innerHTML = '<option value="Todas">Todas las Materias</option>';
        [...listaFinal].sort().forEach(m => {
            if(m) {
                const opt = document.createElement('option');
                opt.value = m; opt.textContent = m;
                fMateria.appendChild(opt);
            }
        });

        // 3. RENDERIZAR TABLA
        const render = () => {
            container.innerHTML = '';
            
            // Filtramos usuarios (rol aspirante + filtros de UI)
            const usuariosVisibles = allUsuarios.filter(u => u.rol === 'aspirante').filter(u => {
                const matchC = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
                const matchN = u.nombre.toLowerCase().includes(fNombre.value.toLowerCase());
                return matchC && matchN;
            });

            // Preparamos lista plana para el PDF General
            filteredIntentos = [];

            if(usuariosVisibles.length === 0) {
                container.innerHTML = '<p class="no-intentos">No se encontraron alumnos.</p>';
                return;
            }

            usuariosVisibles.forEach(user => {
                // Sus intentos
                const misIntentos = allIntentos.filter(i => 
                    i.usuario_id === user.usuario &&
                    (fMateria.value === 'Todas' || i.materia === fMateria.value)
                );

                // Si se filtra por materia y el usuario no tiene, no lo mostramos (opcional)
                if (fMateria.value !== 'Todas' && misIntentos.length === 0) return;

                // Guardar para PDF Global
                misIntentos.forEach(inte => {
                    filteredIntentos.push({
                        nombre: user.nombre,
                        ciudad: user.ciudad,
                        ...inte
                    });
                });

                // Crear Tarjeta HTML
                const card = document.createElement('div');
                card.className = 'user-card'; // Clase de tu CSS
                card.innerHTML = `
                    <div class="user-header" style="cursor:pointer; padding:15px; background:white; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0; font-family:'Teko'; font-size:1.4rem;">${user.nombre}</h3>
                            <span style="color:#666;">${user.ciudad}</span>
                        </div>
                        <div>
                            <strong>${misIntentos.length}</strong> Intentos
                            <i class="fas fa-chevron-down" style="margin-left:10px;"></i>
                        </div>
                    </div>
                    <div class="user-attempts" style="display:none; padding:15px; background:#f9f9f9;">
                        ${misIntentos.length === 0 ? '<p>Sin intentos.</p>' : `
                        <table style="width:100%; border-collapse:collapse;">
                            <thead style="background:#eee;"><tr><th style="padding:8px;">Materia</th><th>Nota</th><th>Fecha</th></tr></thead>
                            <tbody>
                                ${misIntentos.map(i => `
                                    <tr>
                                        <td style="padding:8px; border-bottom:1px solid #ddd;">${i.materia}</td>
                                        <td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold; color:${i.puntaje>=700?'green':'red'}">${i.puntaje}</td>
                                        <td style="padding:8px; border-bottom:1px solid #ddd;">${new Date(i.created_at).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        `}
                        <div style="margin-top:10px; text-align:right;">
                             <button class="btn-pdf-user" style="padding:5px 10px; background:#b22222; color:white; border:none; cursor:pointer;">Descargar PDF Alumno</button>
                        </div>
                    </div>
                `;

                // Toggle Acordeón
                const header = card.querySelector('.user-header');
                const body = card.querySelector('.user-attempts');
                header.onclick = () => {
                    const isHidden = body.style.display === 'none';
                    body.style.display = isHidden ? 'block' : 'none';
                };

                // Botón PDF Individual
                const btnUserPdf = card.querySelector('.btn-pdf-user');
                btnUserPdf.onclick = (e) => {
                    e.stopPropagation(); // Evitar cerrar acordeón
                    generarPDFIndividual(user, misIntentos);
                };

                container.appendChild(card);
            });
        };

        // Listeners Filtros
        fCiudad.onchange = render;
        fMateria.onchange = render;
        fNombre.oninput = render;

        // Render inicial
        spinner.style.display = 'none';
        render();

        // BOTONES GENERALES
        btnCsv.addEventListener('click', () => {
            if(filteredIntentos.length === 0) { alert("No hay datos para exportar."); return; }
            let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
            csvContent += "Nombre;Ciudad;Materia;Puntaje;Fecha\n";
            filteredIntentos.forEach(row => {
                csvContent += `${row.nombre};${row.ciudad};${row.materia};${row.puntaje};${new Date(row.created_at).toLocaleDateString()}\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "reporte_general.csv");
            document.body.appendChild(link);
            link.click();
        });

        btnPdf.addEventListener('click', () => {
            if(filteredIntentos.length === 0) { alert("No hay datos para el PDF."); return; }
            const doc = new jsPDF();
            doc.text("REPORTE GENERAL - SPARTA ACADEMY", 14, 20);
            
            const tableData = filteredIntentos.map(row => [
                row.nombre,
                row.ciudad,
                row.materia,
                row.puntaje,
                new Date(row.created_at).toLocaleDateString()
            ]);

            doc.autoTable({
                startY: 30,
                head: [['Nombre', 'Ciudad', 'Materia', 'Nota', 'Fecha']],
                body: tableData,
            });
            doc.save('reporte_general.pdf');
        });

    } catch (e) {
        showError(e.message);
    }

    // GENERAR PDF INDIVIDUAL
    function generarPDFIndividual(user, intentos) {
        if(intentos.length === 0) { alert("Este alumno no tiene intentos."); return; }
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Reporte de Alumno: ${user.nombre}`, 14, 20);
        doc.setFontSize(12);
        doc.text(`Ciudad: ${user.ciudad} | Total Intentos: ${intentos.length}`, 14, 30);

        const tableData = intentos.map(i => [
            i.materia,
            i.puntaje,
            new Date(i.created_at).toLocaleString()
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Materia', 'Puntaje', 'Fecha y Hora']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [178, 34, 34] } // Rojo Sparta
        });
        
        doc.save(`Reporte_${user.nombre}.pdf`);
    }
});
