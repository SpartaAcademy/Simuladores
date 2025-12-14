// --- CONFIGURACIÓN Y CONEXIÓN ---
const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('reporte-container');
    const fMateria = document.getElementById('filtro-materia');
    const fCiudad = document.getElementById('filtro-ciudad');
    const fNombre = document.getElementById('filtro-nombre');
    const spinner = document.getElementById('loading-spinner');
    
    // Botones
    const btnPDF = document.getElementById('descargar-pdf-btn');
    const btnCSV = document.getElementById('descargar-general-csv-btn');

    let allIntentos = [];
    let allUsuarios = [];

    // 1. Cargar Datos
    try {
        const { data: intentos, error } = await supabase.from('resultados').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allIntentos = intentos || [];

        const res = await fetch('DATA/usuarios.json');
        if (!res.ok) throw new Error("Error cargando usuarios.json");
        allUsuarios = await res.json();
        
        // Llenar Materias
        const materias = [...new Set(allIntentos.map(i => i.materia))].sort();
        materias.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            fMateria.appendChild(opt);
        });

        if (spinner) spinner.style.display = 'none';
        render();

    } catch (e) { 
        if (spinner) spinner.innerHTML = `<p style="color:red">Error: ${e.message}</p>`; 
    }

    // 2. Renderizar
    function render() {
        container.innerHTML = '';

        // Filtrado flexible
        const usuariosFiltrados = allUsuarios.filter(u => {
            // Verificar rol (case insensitive)
            const esAspirante = u.rol && u.rol.toLowerCase() === 'aspirante';
            
            // Filtros visuales
            const matchC = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
            const matchN = fNombre.value.trim() === '' || u.nombre.toLowerCase().includes(fNombre.value.toLowerCase().trim());
            
            return esAspirante && matchC && matchN;
        });

        if (usuariosFiltrados.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#666; margin-top:20px;">No se encontraron estudiantes.</p>';
            return;
        }

        usuariosFiltrados.forEach(user => {
            const intentosUser = allIntentos.filter(i => 
                String(i.usuario_id).trim() === String(user.usuario).trim() &&
                (fMateria.value === 'Todas' || i.materia === fMateria.value)
            );

            const card = document.createElement('div');
            card.className = 'user-card';
            const colorCount = intentosUser.length > 0 ? '#b22222' : '#999';
            
            card.innerHTML = `
                <div class="user-header">
                    <div style="text-align:left;">
                        <h3>${user.nombre}</h3>
                        <small><i class="fas fa-map-marker-alt"></i> ${user.ciudad}</small>
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:${colorCount}; font-size:1.8rem; font-family:'Teko'; line-height:1;">${intentosUser.length}</strong>
                        <span style="display:block; font-size:0.75rem; color:#666; letter-spacing:1px;">INTENTOS</span>
                    </div>
                </div>
                <div class="user-attempts">
                    ${intentosUser.length === 0 ? '<p style="text-align:center; color:#999; padding:10px;">Sin intentos.</p>' : `
                    <table class="table">
                        <thead><tr><th>Materia</th><th>Nota</th><th>Fecha</th></tr></thead>
                        <tbody>
                            ${intentosUser.map(i => `
                                <tr>
                                    <td>${i.materia}</td>
                                    <td style="font-weight:bold; color:${i.puntaje>=700?'#27ae60':'#c0392b'}">${i.puntaje}</td>
                                    <td>${new Date(i.created_at).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    `}
                </div>`;
            
            card.querySelector('.user-header').onclick = () => {
                const body = card.querySelector('.user-attempts');
                body.style.display = body.style.display === 'block' ? 'none' : 'block';
            };
            container.appendChild(card);
        });
    }

    fCiudad.addEventListener('change', render);
    fMateria.addEventListener('change', render);
    fNombre.addEventListener('input', render);

    // PDF Export
    if (btnPDF) {
        btnPDF.onclick = () => {
            const doc = new jsPDF();
            doc.text("Reporte Sparta Academy", 14, 20);
            
            const rows = [];
            // Recalcular visibles
            const visibles = allUsuarios.filter(u => u.rol && u.rol.toLowerCase() === 'aspirante' && (fCiudad.value === 'Todas' || u.ciudad === fCiudad.value));
            
            visibles.forEach(u => {
                const ints = allIntentos.filter(i => String(i.usuario_id) === String(u.usuario) && (fMateria.value === 'Todas' || i.materia === fMateria.value));
                ints.forEach(int => {
                    rows.push([u.nombre, u.ciudad, int.materia, int.puntaje, new Date(int.created_at).toLocaleDateString()]);
                });
            });

            doc.autoTable({
                head: [['Nombre', 'Ciudad', 'Materia', 'Nota', 'Fecha']],
                body: rows,
                startY: 30,
                headStyles: { fillColor: [178, 34, 34] }
            });
            doc.save("reporte.pdf");
        };
    }
    
    // CSV Export
    if (btnCSV) {
        btnCSV.onclick = () => {
            let csv = "Nombre,Ciudad,Materia,Nota,Fecha\n";
            const visibles = allUsuarios.filter(u => u.rol && u.rol.toLowerCase() === 'aspirante' && (fCiudad.value === 'Todas' || u.ciudad === fCiudad.value));
            
            visibles.forEach(u => {
                const ints = allIntentos.filter(i => String(i.usuario_id) === String(u.usuario) && (fMateria.value === 'Todas' || i.materia === fMateria.value));
                ints.forEach(int => {
                    csv += `${u.nombre},${u.ciudad},${int.materia},${int.puntaje},${new Date(int.created_at).toLocaleDateString()}\n`;
                });
            });
            
            const link = document.createElement("a");
            link.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
            link.setAttribute("download", "reporte.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }
});
