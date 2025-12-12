// --- CONFIGURACIÓN DE SUPABASE ---
const supabaseUrl = 'https://vwfpjvfjmmwmrqqahooi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZnBqdmZqbW13bXJxcWFob29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzkyNTcsImV4cCI6MjA4MTA1NTI1N30.pTc8KM-GnxVRgrYpcqm8YUZ9zb6Co-QgKT0i7W41HEA';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- MÓDULOS DE PDF ---
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('reporte-container');
    const spinner = document.getElementById('loading-spinner');
    const fCiudad = document.getElementById('filtro-ciudad');
    const fMateria = document.getElementById('filtro-materia');
    const fNombre = document.getElementById('filtro-nombre');
    const btnPdf = document.getElementById('descargar-pdf-btn');
    const btnCsv = document.getElementById('descargar-general-csv-btn');

    // --- 1. CARGA DE DATOS ---
    let intentos = [];
    let usuarios = [];

    try {
        // Cargar intentos desde Supabase
        const { data: resultsData, error: resultsError } = await supabase
            .from('resultados')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (resultsError) throw resultsError;
        intentos = resultsData;

        // Cargar usuarios desde JSON local
        const resUsers = await fetch('DATA/usuarios.json');
        if (!resUsers.ok) throw new Error("No se pudo cargar el archivo de usuarios.");
        usuarios = await resUsers.json();

        // --- 2. POBLAR FILTROS ---
        // Filtro de Materias (Dinámico)
        const materiasUnicas = [...new Set(intentos.map(i => i.materia))].sort();
        materiasUnicas.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia;
            option.textContent = materia;
            fMateria.appendChild(option);
        });
        // Filtro de Ciudades (Dinámico)
        const ciudadesUnicas = [...new Set(usuarios.map(u => u.ciudad))].sort();
        ciudadesUnicas.forEach(ciudad => {
            const option = document.createElement('option');
            option.value = ciudad;
            option.textContent = ciudad;
            fCiudad.appendChild(option);
        });

        spinner.style.display = 'none';
        renderizarReporte(); // Renderizar inicial

    } catch (error) {
        console.error("Error cargando datos:", error);
        spinner.innerHTML = `<span style="color: #c0392b;">Error al cargar los datos. Por favor, recarga la página.</span>`;
    }

    // --- 3. FUNCIÓN DE RENDERIZADO EN PANTALLA ---
    function renderizarReporte() {
        container.innerHTML = '';
        
        // Filtrar usuarios según los criterios
        const usuariosFiltrados = usuarios.filter(user => {
            // Filtro básico: Rol, Ciudad y Nombre
            const matchRol = user.rol === 'aspirante'; // Mostrar solo aspirantes en la lista
            const matchCiudad = fCiudad.value === 'Todas' || user.ciudad === fCiudad.value;
            const matchNombre = fNombre.value === '' || user.nombre.toLowerCase().includes(fNombre.value.toLowerCase());
            return matchRol && matchCiudad && matchNombre;
        });

        if (usuariosFiltrados.length === 0) {
            container.innerHTML = '<div class="no-intentos">No se encontraron aspirantes con esos filtros.</div>';
            return;
        }

        usuariosFiltrados.forEach(user => {
            // Filtrar intentos para este usuario y la materia seleccionada
            const susIntentos = intentos.filter(intento => 
                intento.usuario_id === user.usuario &&
                (fMateria.value === 'Todas' || intento.materia === fMateria.value)
            );

            // Si se seleccionó una materia específica y el usuario no tiene intentos en ella, no mostrarlo.
            if (fMateria.value !== 'Todas' && susIntentos.length === 0) return;

            const card = document.createElement('div');
            card.className = 'user-card';
            
            const latestDate = susIntentos.length > 0 ? new Date(susIntentos[0].created_at).toLocaleDateString() : 'N/A';

            card.innerHTML = `
                <div class="user-header" onclick="toggleAttempts(this)">
                    <div>
                        <h3>${user.nombre}</h3>
                        <small>${user.ciudad} | Último: ${latestDate}</small>
                    </div>
                    <div style="text-align:right;">
                        <strong>${susIntentos.length}</strong> Intentos<br>
                        <small style="font-size:0.8rem">Clic para ver detalles</small>
                    </div>
                </div>
                <div class="user-attempts">
                    ${susIntentos.length === 0 ? '<p>No hay intentos registrados para este filtro.</p>' : `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Materia / Cuestionario</th>
                                    <th>Nota</th>
                                    <th>Estado</th>
                                    <th>Fecha y Hora</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${susIntentos.map(intento => {
                                    const nota = intento.puntaje;
                                    const aprobado = nota >= 700;
                                    const color = aprobado ? '#27ae60' : '#c0392b';
                                    const estado = aprobado ? 'Aprobado' : 'Reprobado';
                                    return `
                                        <tr>
                                            <td>${intento.materia}</td>
                                            <td style="font-weight:bold; color:${color}; font-size:1.1rem;">${nota}</td>
                                            <td><span style="background:${color}20; color:${color}; padding: 3px 8px; border-radius:10px; font-size:0.85rem; font-weight:bold;">${estado}</span></td>
                                            <td>${new Date(intento.created_at).toLocaleString()}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --- 4. LISTENERS PARA FILTROS ---
    fCiudad.addEventListener('change', renderizarReporte);
    fMateria.addEventListener('change', renderizarReporte);
    fNombre.addEventListener('input', renderizarReporte);

    // --- 5. GENERACIÓN DE PDF PROFESIONAL (HOJA POR ALUMNO) ---
    btnPdf.addEventListener('click', () => {
        // 1. Filtrar solo aspirantes que tengan intentos
        const aspirantesConIntentos = usuarios
            .filter(u => u.rol === 'aspirante')
            .filter(u => intentos.some(i => i.usuario_id === u.usuario));
        
        if (aspirantesConIntentos.length === 0) {
            alert("No hay datos de aspirantes para generar el reporte.");
            return;
        }

        const doc = new jsPDF();
        let pageCount = 0;
        const fechaReporte = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

        aspirantesConIntentos.forEach((user, index) => {
            // Obtener todos los intentos del usuario
            const userIntentos = intentos.filter(i => i.usuario_id === user.usuario);
            
            // Calcular estadísticas
            const totalIntentos = userIntentos.length;
            const promedio = totalIntentos > 0 
                ? (userIntentos.reduce((sum, i) => sum + i.puntaje, 0) / totalIntentos).toFixed(2) 
                : "0.00";

            // Agregar nueva página para cada alumno (excepto el primero)
            if (index > 0) {
                doc.addPage();
            }
            pageCount++;

            // --- ENCABEZADO PROFESIONAL ---
            // Barra de color superior
            doc.setFillColor(178, 34, 34); // Rojo Sparta (#b22222)
            doc.rect(0, 0, 210, 35, 'F');
            
            // Título Principal
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.text("SPARTA ACADEMY", 105, 20, null, null, "center");
            
            // Subtítulo
            doc.setFontSize(14);
            doc.setFont("helvetica", "normal");
            doc.text("Reporte Individual de Resultados", 105, 28, null, null, "center");
            
            // Fecha
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(10);
            doc.text(`Fecha de emisión: ${fechaReporte}`, 195, 42, null, null, "right");

            // --- SECCIÓN DE INFORMACIÓN DEL ASPIRANTE ---
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(`Aspirante: ${user.nombre}`, 14, 55);
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`Ciudad: ${user.ciudad}`, 14, 62);
            doc.text(`ID de Usuario: ${user.usuario}`, 14, 68);

            // --- RESUMEN ESTADÍSTICO ---
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(14, 75, 182, 25, 3, 3, 'FD');
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Total Intentos:", 30, 85);
            doc.text("Promedio General:", 100, 85);
            
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(String(totalIntentos), 30, 93);
            
            // Color para el promedio
            const promVal = parseFloat(promedio);
            if(promVal >= 700) doc.setTextColor(39, 174, 96); // Verde
            else doc.setTextColor(192, 57, 43); // Rojo
            doc.text(promedio + " / 1000", 100, 93);

            // --- TABLA DE RESULTADOS ---
            const tableBody = userIntentos.map(i => [
                i.materia,
                i.puntaje,
                i.puntaje >= 700 ? 'Aprobado' : 'Reprobado',
                new Date(i.created_at).toLocaleString()
            ]);

            doc.autoTable({
                startY: 110,
                head: [['Materia / Cuestionario', 'Nota', 'Estado', 'Fecha y Hora']],
                body: tableBody,
                theme: 'grid',
                headStyles: {
                    fillColor: [26, 26, 26], // Color oscuro para encabezado
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 70 }, // Ancho para Materia
                    1: { fontStyle: 'bold', halign: 'center' }, // Nota centrada y negrita
                    2: { halign: 'center' }, // Estado centrado
                    3: { cellWidth: 'auto' } // Fecha auto
                },
                styles: {
                    fontSize: 10,
                    cellPadding: 5,
                    valign: 'middle'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                // Hook para colorear celdas dinámicamente
                didParseCell: function(data) {
                    if (data.section === 'body') {
                        // Colorear la columna de "Nota" (índice 1)
                        if (data.column.index === 1) {
                            const score = parseInt(data.cell.raw);
                            if (score >= 700) {
                                data.cell.styles.textColor = [39, 174, 96]; // Verde
                            } else {
                                data.cell.styles.textColor = [192, 57, 43]; // Rojo
                            }
                        }
                        // Colorear la columna de "Estado" (índice 2)
                        if (data.column.index === 2) {
                             if (data.cell.raw === 'Aprobado') {
                                data.cell.styles.textColor = [39, 174, 96];
                            } else {
                                data.cell.styles.textColor = [192, 57, 43];
                            }
                        }
                    }
                }
            });
            
            // Pie de página con número
            const pageNumber = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${pageNumber} de ${aspirantesConIntentos.length}`, 195, 285, null, null, "right");
        });

        // Guardar el archivo
        doc.save(`Reporte_Aspirantes_Sparta_${new Date().toISOString().slice(0,10)}.pdf`);
    });

    // --- 6. GENERACIÓN DE CSV GENERAL (Opcional, simple) ---
    btnCsv.addEventListener('click', () => {
        if (intentos.length === 0) { alert("No hay datos para exportar."); return; }
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID Usuario,Nombre,Ciudad,Materia,Puntaje,Fecha\n"; // Encabezados
        
        intentos.forEach(i => {
            const row = [
                i.usuario_id,
                `"${i.usuario_nombre}"`, // Comillas por si hay comas en el nombre
                i.ciudad,
                `"${i.materia}"`,
                i.puntaje,
                new Date(i.created_at).toLocaleDateString()
            ].join(",");
            csvContent += row + "\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Reporte_General_Sparta.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});

// --- FUNCIONES GLOBALES ---
// Función para abrir/cerrar el acordeón de detalles en la vista web
window.toggleAttempts = function(headerElement) {
    const attemptsDiv = headerElement.nextElementSibling;
    if (attemptsDiv.style.display === 'block') {
        attemptsDiv.style.display = 'none';
    } else {
        // Cierra otros abiertos si quieres un comportamiento de acordeón estricto
        // document.querySelectorAll('.user-attempts').forEach(el => el.style.display = 'none'); 
        attemptsDiv.style.display = 'block';
    }
}
