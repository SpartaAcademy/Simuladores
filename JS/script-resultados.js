const supabaseUrl = 'https://vwfpjvfjmmwmrqqahooi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZnBqdmZqbW13bXJxcWFob29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzkyNTcsImV4cCI6MjA4MTA1NTI1N30.pTc8KM-GnxVRgrYpcqm8YUZ9zb6Co-QgKT0i7W41HEA';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
const { jsPDF } = window.jspdf;

const materias = {
    'sociales': 'Ciencias Sociales', 'matematicas': 'Matemáticas', 'lengua': 'Lengua', 'ingles': 'Inglés', 'general': 'General',
    'inteligencia': 'Inteligencia', 'personalidad': 'Personalidad', 'ppnn1': 'PPNN 1', 'ppnn2': 'PPNN 2',
    'sociales_esmil': 'Sociales ESMIL', 'matematicas_esmil': 'Matemáticas ESMIL' // Agrega el resto...
};

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('reporte-container');
    const fMateria = document.getElementById('filtro-materia');
    const fCiudad = document.getElementById('filtro-ciudad');
    const fNombre = document.getElementById('filtro-nombre');

    // 1. Cargar Datos
    const { data: intentos } = await supabase.from('resultados').select('*');
    const res = await fetch('DATA/usuarios.json');
    const usuarios = await res.json();
    
    // 2. Llenar Filtro Materias
    const mats = [...new Set(intentos.map(i => i.materia))].sort();
    mats.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        fMateria.appendChild(opt);
    });

    const render = () => {
        container.innerHTML = '';
        // Filtrar solo ASPIRANTES
        const filteredUsers = usuarios.filter(u => u.rol === 'aspirante').filter(u => {
            return (fCiudad.value === 'Todas' || u.ciudad === fCiudad.value) &&
                   u.nombre.toLowerCase().includes(fNombre.value.toLowerCase());
        });

        filteredUsers.forEach(user => {
            const userInt = intentos.filter(i => i.usuario_id === user.usuario && 
                (fMateria.value === 'Todas' || i.materia === fMateria.value));

            if (fMateria.value !== 'Todas' && userInt.length === 0) return;

            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="user-header">
                    <div><h3>${user.nombre}</h3><small>${user.ciudad}</small></div>
                    <strong>${userInt.length} Intentos</strong>
                </div>
                <div class="user-attempts" style="display:none;">
                    <table class="table">
                        <thead><tr><th>Materia</th><th>Nota</th><th>Fecha</th></tr></thead>
                        <tbody>
                            ${userInt.map(i => `<tr><td>${i.materia}</td><td style="color:${i.puntaje>=700?'#27ae60':'#c0392b'}"><b>${i.puntaje}</b></td><td>${new Date(i.created_at).toLocaleDateString()}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
            card.querySelector('.user-header').onclick = (e) => {
                const b = card.querySelector('.user-attempts');
                b.style.display = b.style.display==='none'?'block':'none';
            };
            container.appendChild(card);
        });
    };

    fCiudad.onchange = render;
    fMateria.onchange = render;
    fNombre.oninput = render;
    document.getElementById('loading-spinner').style.display='none';
    render();

    // PDF HOJA POR ALUMNO (Solo Aspirantes)
    document.getElementById('descargar-pdf-btn').onclick = () => {
        const doc = new jsPDF();
        let page = 0;
        const users = usuarios.filter(u => u.rol === 'aspirante'); // Filtro clave
        
        users.forEach(user => {
            const ints = intentos.filter(i => i.usuario_id === user.usuario);
            if(ints.length === 0) return; // Si no tiene intentos, saltar

            if(page > 0) doc.addPage();
            page++;
            
            // Encabezado
            doc.setFillColor(178, 34, 34); doc.rect(0, 0, 210, 20, 'F');
            doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.text("SPARTA ACADEMY", 105, 13, null, null, "center");
            
            // Info Alumno
            doc.setTextColor(0, 0, 0); doc.setFontSize(14); doc.text(user.nombre.toUpperCase(), 14, 40);
            doc.setFontSize(11); doc.text(`Ciudad: ${user.ciudad}`, 14, 48);

            // Tabla
            const rows = ints.map(i => [i.materia, i.puntaje, new Date(i.created_at).toLocaleString()]);
            doc.autoTable({ startY: 55, head: [['Materia','Nota','Fecha']], body: rows, theme: 'grid' });
        });
        doc.save('Reporte_Aspirantes.pdf');
    };
});
