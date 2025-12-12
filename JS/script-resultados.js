

// CONEXIÓN
const supabaseUrl = 'https://vwfpjvfjmmwmrqqahooi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZnBqdmZqbW13bXJxcWFob29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzkyNTcsImV4cCI6MjA4MTA1NTI1N30.pTc8KM-GnxVRgrYpcqm8YUZ9zb6Co-QgKT0i7W41HEA';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);



document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('reporte-container');
    const spinner = document.getElementById('loading-spinner');
    const fMateria = document.getElementById('filtro-materia');
    const fCiudad = document.getElementById('filtro-ciudad');
    const fNombre = document.getElementById('filtro-nombre');
    const btnPdf = document.getElementById('descargar-pdf-btn');
    const btnCsv = document.getElementById('descargar-general-csv-btn');

    let allIntentos = [];
    let allUsuarios = [];

    // --- CARGA DE DATOS ---
    try {
        // 1. Obtener intentos desde Supabase (Ordenados por fecha más reciente)
        const { data: intentos, error } = await supabase
            .from('resultados')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allIntentos = intentos || [];

        // 2. Obtener usuarios locales
        const res = await fetch('DATA/usuarios.json');
        if (!res.ok) throw new Error("Falta archivo usuarios.json");
        allUsuarios = await res.json();

        // 3. Llenar Filtro de Materias (Basado en lo que hay en la DB)
        const mats = [...new Set(allIntentos.map(i => i.materia))].sort();
        fMateria.innerHTML = '<option value="Todas">Todas las Materias</option>';
        mats.forEach(m => {
            if (m) {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                fMateria.appendChild(opt);
            }
        });

        spinner.style.display = 'none';
        renderReporte(); // Renderizar tabla inicial

    } catch (e) {
        spinner.innerHTML = `<p style="color:red">Error cargando datos: ${e.message}</p>`;
        console.error(e);
    }

    // --- RENDERIZADO ---
    function renderReporte() {
        container.innerHTML = '';

        // 1. Filtrar Usuarios (Solo Aspirantes que coincidan con filtros)
        const usuariosVisibles = allUsuarios.filter(u => u.rol === 'aspirante').filter(u => {
            const filtroCiudad = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
            const filtroNombre = fNombre.value === '' || u.nombre.toLowerCase().includes(fNombre.value.toLowerCase());
            return filtroCiudad && filtroNombre;
        });

        if (usuariosVisibles.length === 0) {
            container.innerHTML = '<p class="no-intentos" style="text-align:center; padding:20px;">No se encontraron aspirantes.</p>';
            return;
        }

        usuariosVisibles.forEach(user => {
            // 2. Buscar intentos de este usuario (Comparando ID de usuario)
            // IMPORTANTE: Se compara user.usuario con intento.usuario_id
            const susIntentos = allIntentos.filter(i => 
                String(i.usuario_id).trim() === String(user.usuario).trim() &&
                (fMateria.value === 'Todas' || i.materia === fMateria.value)
            );

            // Si se filtra por materia y no tiene intentos, no mostrar al usuario (Opcional)
            if (fMateria.value !== 'Todas' && susIntentos.length === 0) return;

            // Crear Tarjeta
            const card = document.createElement('div');
            card.className = 'user-card';
            
            // Fecha del último intento
            const ultimoIntento = susIntentos.length > 0 
                ? new Date(susIntentos[0].created_at).toLocaleDateString() 
                : 'Sin actividad';

            card.innerHTML = `
                <div class="user-header">
                    <div>
                        <h3 style="margin:0; font-family:'Teko'; font-size:1.5rem;">${user.nombre}</h3>
                        <small style="color:#666;">${user.ciudad} | Último: ${ultimoIntento}</small>
                    </div>
                    <div style="text-align:right">
                        <strong style="font-size:1.2rem; color:${susIntentos.length > 0 ? '#b22222' : '#ccc'}">
                            ${susIntentos.length}
                        </strong> <small>Intentos</small>
                        <i class="fas fa-chevron-down" style="margin-left:10px;"></i>
                    </div>
                </div>
                <div class="user-attempts" style="display:none;">
                    ${susIntentos.length === 0 ? '<p style="padding:10px; text-align:center; color:#999;">No hay intentos registrados.</p>' : `
                    <table class="table">
                        <thead><tr><th>Materia</th><th>Nota</th><th>Estado</th><th>Fecha</th></tr></thead>
                        <tbody>
                            ${susIntentos.map(i => {
                                const aprobado = i.puntaje >= 700;
                                const color = aprobado ? '#27ae60' : '#c0392b';
                                const estado = aprobado ? 'APROBADO' : 'REPROBADO';
                                return `
                                    <tr>
                                        <td>${i.materia}</td>
                                        <td style="font-weight:bold; color:${color}">${i.puntaje}</td>
                                        <td><span style="font-size:0.8rem; padding:2px 6px; border-radius:4px; background:${color}20; color:${color}; font-weight:bold;">${estado}</span></td>
                                        <td>${new Date(i.created_at).toLocaleString()}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    `}
                </div>
            `;

            // Evento Click Acordeón
            card.querySelector('.user-header').onclick = () => {
                const body = card.querySelector('.user-attempts');
                const isHidden = body.style.display === 'none';
                // Cerrar otros (opcional, para efecto acordeón único)
                // document.querySelectorAll('.user-attempts').forEach(el => el.style.display = 'none');
                body.style.display = isHidden ? 'block' : 'none';
            };

            container.appendChild(card);
        });
    }

    // --- LISTENERS FILTROS ---
    fCiudad.addEventListener('change', renderReporte);
    fMateria.addEventListener('change', renderReporte);
    fNombre.addEventListener('input', renderReporte);

    // --- GENERAR PDF (HOJA POR ALUMNO) ---
    btnPdf.addEventListener('click', () => {
        const doc = new jsPDF();
        let pageCount = 0;

        // Filtrar usuarios visibles actualmente
        const usuariosParaReporte = usuarios.filter(u => u.rol === 'aspirante').filter(u => {
             const matchCiudad = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
             const matchNombre = fNombre.value === '' || u.nombre.toLowerCase().includes(fNombre.value.toLowerCase());
             return matchCiudad && matchNombre;
        });

        // Filtrar solo los que tienen intentos
        const usuariosConData = usuariosParaReporte.filter(user => 
            allIntentos.some(i => i.usuario_id === user.usuario)
        );

        if (usuariosConData.length === 0) {
            alert("No hay datos para generar el PDF.");
            return;
        }

        usuariosConData.forEach((user, index) => {
            const misIntentos = allIntentos.filter(i => i.usuario_id === user.usuario);
            
            if (index > 0) doc.addPage();
            
            // Encabezado Rojo
            doc.setFillColor(178, 34, 34);
            doc.rect(0, 0, 210, 25, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("SPARTA ACADEMY", 105, 17, null, null, "center");

            // Info Alumno
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(16);
            doc.text(`Reporte de: ${user.nombre.toUpperCase()}`, 14, 40);
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text(`Ciudad: ${user.ciudad} | ID: ${user.usuario}`, 14, 48);

            // Tabla
            const rows = misIntentos.map(i => [
                i.materia,
                i.puntaje,
                i.puntaje >= 700 ? 'APROBADO' : 'REPROBADO',
                new Date(i.created_at).toLocaleString()
            ]);

            doc.autoTable({
                startY: 55,
                head: [['Materia', 'Nota', 'Estado', 'Fecha']],
                body: rows,
                theme: 'grid',
                headStyles: { fillColor: [50, 50, 50] },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 2) {
                        data.cell.styles.textColor = data.cell.raw === 'APROBADO' ? [39, 174, 96] : [192, 57, 43];
                    }
                }
            });
        });

        doc.save('Reporte_Sparta.pdf');
    });

    // --- GENERAR CSV ---
    btnCsv.addEventListener('click', () => {
        if(allIntentos.length === 0) { alert("Sin datos."); return; }
        let csv = "Nombre,Ciudad,Materia,Nota,Fecha\n";
        
        allIntentos.forEach(i => {
            // Buscar nombre real en usuarios.json si en la DB se guardó mal, o usar el de la DB
            const userObj = allUsuarios.find(u => u.usuario === i.usuario_id);
            const nombreReal = userObj ? userObj.nombre : i.usuario_nombre;
            
            csv += `"${nombreReal}","${i.ciudad}","${i.materia}",${i.puntaje},"${new Date(i.created_at).toLocaleString()}"\n`;
        });

        const link = document.createElement("a");
        link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        link.download = "Reporte_General.csv";
        link.click();
    });
});
