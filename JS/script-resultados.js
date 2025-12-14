// --- CONFIGURACIÓN Y CONEXIÓN ---
// Usamos las mismas credenciales que el simulador para poder leer los datos guardados
const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Librerías para PDF
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    // Referencias al DOM
    const container = document.getElementById('reporte-container');
    const fMateria = document.getElementById('filtro-materia');
    const fCiudad = document.getElementById('filtro-ciudad');
    const fNombre = document.getElementById('filtro-nombre');
    const spinner = document.getElementById('loading-spinner');
    
    // Botones Exportar
    const btnPDF = document.getElementById('descargar-pdf-btn');
    const btnCSV = document.getElementById('descargar-general-csv-btn');

    let allIntentos = [];
    let allUsuarios = [];

    // --- 1. CARGA DE DATOS ---
    try {
        // A) Obtener todos los resultados de Supabase
        const { data: intentos, error } = await supabase
            .from('resultados')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allIntentos = intentos || [];

        // B) Obtener lista de usuarios locales (para saber quiénes son aspirantes)
        const res = await fetch('DATA/usuarios.json');
        if (!res.ok) throw new Error("No se pudo cargar usuarios.json");
        allUsuarios = await res.json();
        
        // C) Llenar Filtro de Materias dinámicamente
        const materiasDisponibles = [...new Set(allIntentos.map(i => i.materia))].sort();
        materiasDisponibles.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            fMateria.appendChild(opt);
        });

        // Ocultar spinner y mostrar datos
        if (spinner) spinner.style.display = 'none';
        render();

    } catch (e) { 
        console.error(e);
        if (spinner) spinner.innerHTML = `<p style="color:#c0392b; font-weight:bold;">Error cargando datos: ${e.message}</p>`; 
    }

    // --- 2. RENDERIZADO DE TARJETAS ---
    function render() {
        container.innerHTML = '';

        // Filtrar usuarios: Solo 'aspirante' y que coincidan con los filtros visuales
        const usuariosFiltrados = allUsuarios.filter(u => u.rol === 'aspirante').filter(u => {
            const filtroC = fCiudad.value === 'Todas las Ciudades' || u.ciudad === fCiudad.value;
            const filtroN = fNombre.value.trim() === '' || u.nombre.toLowerCase().includes(fNombre.value.toLowerCase());
            return filtroC && filtroN;
        });

        if (usuariosFiltrados.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#666;">No se encontraron aspirantes con esos filtros.</div>';
            return;
        }

        usuariosFiltrados.forEach(user => {
            // Buscar intentos de este usuario específico
            // NOTA: Convertimos a String para asegurar coincidencia
            const intentosUsuario = allIntentos.filter(i => 
                String(i.usuario_id).trim() === String(user.usuario).trim() &&
                (fMateria.value === 'Todas las Materias' || i.materia === fMateria.value)
            );

            // Crear Tarjeta
            const card = document.createElement('div');
            card.className = 'user-card'; // Clase CSS nueva
            
            // Color del contador: Rojo si tiene intentos, Gris si es 0
            const countColor = intentosUsuario.length > 0 ? '#b22222' : '#999';
            
            // HTML de la Tarjeta
            card.innerHTML = `
                <div class="user-header">
                    <div style="text-align:left;">
                        <h3>${user.nombre}</h3>
                        <small><i class="fas fa-map-marker-alt"></i> ${user.ciudad}</small>
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:${countColor}; font-size:1.8rem; font-family:'Teko'; line-height:1;">${intentosUsuario.length}</strong> 
                        <span style="font-size:0.75rem; color:#666; display:block; letter-spacing:1px;">INTENTOS</span>
                    </div>
                </div>
                <div class="user-attempts">
                    ${intentosUsuario.length === 0 
                        ? '<p style="text-align:center; padding:15px; color:#999; font-style:italic;">Sin intentos registrados en esta materia.</p>' 
                        : `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Materia</th>
                                    <th>Puntaje</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${intentosUsuario.map(i => {
                                    // Color de nota: Verde >= 700, Rojo < 700
                                    const notaColor = i.puntaje >= 700 ? '#27ae60' : '#c0392b';
                                    const fecha = new Date(i.created_at).toLocaleDateString() + ' ' + new Date(i.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                    return `
                                    <tr>
                                        <td>${i.materia}</td>
                                        <td style="font-weight:bold; color:${notaColor}">${i.puntaje}</td>
                                        <td style="font-size:0.85rem; color:#555;">${fecha}</td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    `}
                </div>`;
            
            // Evento Click para expandir/colapsar
            const header = card.querySelector('.user-header');
            const body = card.querySelector('.user-attempts');
            
            header.onclick = () => {
                const isHidden = body.style.display === 'none' || body.style.display === '';
                body.style.display = isHidden ? 'block' : 'none';
                header.style.backgroundColor = isHidden ? '#f8f9fa' : 'white'; // Feedback visual
            };

            container.appendChild(card);
        });
    }

    // --- 3. LISTENERS DE FILTROS ---
    fCiudad.addEventListener('change', render);
    fMateria.addEventListener('change', render);
    fNombre.addEventListener('input', render);

    // --- 4. EXPORTAR PDF ---
    if (btnPDF) {
        btnPDF.onclick = () => {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("Reporte de Resultados - Sparta Academy", 14, 20);
            doc.setFontSize(10);
            doc.text(`Fecha: ${new Date().toLocaleDateString()} | Filtro: ${fMateria.value}`, 14, 28);

            const tableData = [];
            
            // Recopilar datos filtrados actualmente
            const usuariosVisibles = allUsuarios.filter(u => u.rol === 'aspirante').filter(u => {
                const matchC = fCiudad.value === 'Todas las Ciudades' || u.ciudad === fCiudad.value;
                const matchN = fNombre.value.trim() === '' || u.nombre.toLowerCase().includes(fNombre.value.toLowerCase());
                return matchC && matchN;
            });

            usuariosVisibles.forEach(u => {
                const intentos = allIntentos.filter(i => 
                    String(i.usuario_id).trim() === String(u.usuario).trim() &&
                    (fMateria.value === 'Todas las Materias' || i.materia === fMateria.value)
                );
                
                intentos.forEach(intento => {
                    tableData.push([
                        u.nombre,
                        u.ciudad,
                        intento.materia,
                        intento.puntaje,
                        new Date(intento.created_at).toLocaleDateString()
                    ]);
                });
            });

            if(tableData.length === 0) {
                alert("No hay datos para exportar con los filtros actuales.");
                return;
            }

            doc.autoTable({
                head: [['Aspirante', 'Ciudad', 'Materia', 'Nota', 'Fecha']],
                body: tableData,
                startY: 35,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [178, 34, 34] } // Rojo Sparta
            });

            doc.save("reporte_sparta.pdf");
        };
    }

    // --- 5. EXPORTAR CSV ---
    if (btnCSV) {
        btnCSV.onclick = () => {
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Aspirante,Ciudad,Materia,Puntaje,Fecha\n";

            const usuariosVisibles = allUsuarios.filter(u => u.rol === 'aspirante').filter(u => {
                const matchC = fCiudad.value === 'Todas las Ciudades' || u.ciudad === fCiudad.value;
                const matchN = fNombre.value.trim() === '' || u.nombre.toLowerCase().includes(fNombre.value.toLowerCase());
                return matchC && matchN;
            });

            usuariosVisibles.forEach(u => {
                const intentos = allIntentos.filter(i => 
                    String(i.usuario_id).trim() === String(u.usuario).trim() &&
                    (fMateria.value === 'Todas las Materias' || i.materia === fMateria.value)
                );
                
                intentos.forEach(intento => {
                    const row = [
                        u.nombre,
                        u.ciudad,
                        intento.materia,
                        intento.puntaje,
                        new Date(intento.created_at).toLocaleDateString()
                    ].join(",");
                    csvContent += row + "\n";
                });
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "reporte_sparta.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }
});
