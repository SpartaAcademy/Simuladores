// --- CONFIGURACIÓN Y CONEXIÓN ---
const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    // Referencias
    const container = document.getElementById('reporte-container');
    const fMateria = document.getElementById('filtro-materia');
    const fCiudad = document.getElementById('filtro-ciudad');
    const fNombre = document.getElementById('filtro-nombre');
    const spinner = document.getElementById('loading-spinner');
    
    // Botones
    const btnPDF = document.getElementById('descargar-pdf-btn');
    const btnCSV = document.getElementById('descargar-general-csv-btn');
    const canvasHidden = document.getElementById('hidden-chart-canvas');

    let allIntentos = [];
    let allUsuarios = [];

    // --- UTILS ---
    const cleanText = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

    // --- CARGA DATOS ---
    try {
        const { data: intentos, error } = await supabase.from('resultados').select('*').order('created_at', { ascending: true }); // Ascendente para la gráfica cronológica
        if (error) throw error;
        allIntentos = intentos || [];

        const res = await fetch('DATA/usuarios.json');
        if (!res.ok) throw new Error("Error cargando usuarios.json");
        allUsuarios = await res.json();
        
        // Llenar Filtro
        const materias = [...new Set(allIntentos.map(i => i.materia))].sort();
        materias.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m; opt.textContent = m;
            fMateria.appendChild(opt);
        });

        if (spinner) spinner.style.display = 'none';
        render();

    } catch (e) { 
        if (spinner) spinner.innerHTML = `<p style="color:red">Error: ${e.message}</p>`; 
    }

    // --- RENDER WEB (Tarjetas) ---
    function render() {
        container.innerHTML = '';
        const busqueda = cleanText(fNombre.value);
        
        const usuariosFiltrados = allUsuarios.filter(u => {
            const esAspirante = u.rol && u.rol.toLowerCase() === 'aspirante';
            const matchCiudad = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
            const matchNombre = busqueda === '' || cleanText(u.nombre).includes(busqueda);
            return esAspirante && matchCiudad && matchNombre;
        });

        if (usuariosFiltrados.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#666; margin-top:30px;">No se encontraron estudiantes.</p>';
            return;
        }

        // Ordenamos intentos por fecha descendente para la vista web (lo más nuevo arriba)
        const intentosParaWeb = [...allIntentos].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        usuariosFiltrados.forEach(user => {
            const intentosUser = intentosParaWeb.filter(i => 
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
                    ${intentosUser.length === 0 ? '<p style="text-align:center; color:#999; padding:15px;">Sin intentos.</p>' : `
                    <table class="table">
                        <thead><tr><th>MATERIA</th><th>NOTA</th><th>FECHA</th><th>HORA</th></tr></thead>
                        <tbody>
                            ${intentosUser.map(i => {
                                const d = new Date(i.created_at);
                                const colorNota = i.puntaje >= 700 ? '#27ae60' : '#c0392b';
                                return `<tr><td>${i.materia}</td><td style="font-weight:bold; color:${colorNota}">${i.puntaje}</td><td>${d.toLocaleDateString()}</td><td>${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td></tr>`;
                            }).join('')}
                        </tbody>
                    </table>`}
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

    // --- GENERADOR DE PDF PROFESIONAL ---
    if (btnPDF) {
        btnPDF.onclick = async () => {
            const originalText = btnPDF.innerHTML;
            btnPDF.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
            btnPDF.disabled = true;

            const doc = new jsPDF();
            const busqueda = cleanText(fNombre.value);
            
            // 1. Filtrar Usuarios
            const usuariosVisibles = allUsuarios.filter(u => {
                const esAspirante = u.rol && u.rol.toLowerCase() === 'aspirante';
                const matchCiudad = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
                const matchNombre = busqueda === '' || cleanText(u.nombre).includes(busqueda);
                return esAspirante && matchCiudad && matchNombre;
            });

            let pageAdded = false;

            // 2. Iterar por cada usuario (Una hoja nueva por usuario)
            for (const u of usuariosVisibles) {
                // Obtener intentos (Cronológicos para la gráfica)
                let intentos = allIntentos.filter(i => 
                    String(i.usuario_id).trim() === String(u.usuario).trim() &&
                    (fMateria.value === 'Todas' || i.materia === fMateria.value)
                );

                // Si no tiene intentos y el filtro de materia está activo, saltar
                if (intentos.length === 0) continue;

                if (pageAdded) doc.addPage();
                pageAdded = true;

                // --- ENCABEZADO ---
                doc.setFillColor(178, 34, 34); // Rojo Sparta
                doc.rect(0, 0, 210, 40, 'F'); // Barra roja superior
                
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.text("SPARTA ACADEMY", 105, 20, { align: "center" });
                
                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                doc.text("INFORME DE RENDIMIENTO INDIVIDUAL", 105, 30, { align: "center" });

                // --- DATOS DEL ESTUDIANTE ---
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(16);
                doc.text(u.nombre.toUpperCase(), 14, 55);
                
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(`CIUDAD: ${u.ciudad.toUpperCase()}`, 14, 62);
                doc.text(`MATERIA FILTRO: ${fMateria.value.toUpperCase()}`, 14, 67);
                doc.text(`FECHA REPORTE: ${new Date().toLocaleDateString()}`, 14, 72);

                // --- ESTADÍSTICAS RÁPIDAS (KPIs) ---
                const promedio = (intentos.reduce((acc, curr) => acc + curr.puntaje, 0) / intentos.length).toFixed(0);
                const maxNota = Math.max(...intentos.map(i => i.puntaje));
                
                // Cuadro Promedio
                doc.setFillColor(240, 240, 240);
                doc.rect(140, 50, 25, 25, 'F');
                doc.setFontSize(8); doc.text("PROMEDIO", 152.5, 55, {align:"center"});
                doc.setFontSize(14); doc.setTextColor(178, 34, 34); doc.text(promedio, 152.5, 65, {align:"center"});

                // Cuadro Max
                doc.setFillColor(240, 240, 240);
                doc.rect(170, 50, 25, 25, 'F');
                doc.setFontSize(8); doc.setTextColor(100); doc.text("MEJOR NOTA", 182.5, 55, {align:"center"});
                doc.setFontSize(14); doc.setTextColor(39, 174, 96); doc.text(maxNota.toString(), 182.5, 65, {align:"center"});

                // --- GRÁFICA DE BARRAS (CHART.JS) ---
                // Necesitamos generar la imagen del chart
                const chartImg = await generateChartImage(intentos);
                if (chartImg) {
                    doc.addImage(chartImg, 'PNG', 14, 85, 180, 70);
                }

                // --- TABLA DE DETALLES ---
                // Preparamos datos para la tabla (Orden inverso para ver lo último primero en la lista)
                const intentosTabla = [...intentos].reverse(); 
                const tableRows = intentosTabla.map(i => [
                    i.materia,
                    i.puntaje,
                    new Date(i.created_at).toLocaleDateString(),
                    new Date(i.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                ]);

                doc.autoTable({
                    head: [['Materia', 'Puntaje', 'Fecha', 'Hora']],
                    body: tableRows,
                    startY: 165,
                    theme: 'grid',
                    headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] },
                    styles: { fontSize: 9, cellPadding: 3 },
                    columnStyles: {
                        1: { fontStyle: 'bold', textColor: [178, 34, 34] } // Columna puntaje en rojo/bold
                    }
                });

                // Footer Pie de página
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Sparta Academy - Sistema de Entrenamiento`, 105, 285, { align: "center" });
            }

            if (!pageAdded) {
                alert("No hay datos para generar el reporte con los filtros actuales.");
            } else {
                doc.save("Reporte_Sparta_Profesional.pdf");
            }

            btnPDF.innerHTML = originalText;
            btnPDF.disabled = false;
        };
    }

    // --- FUNCIÓN AUXILIAR PARA GENERAR IMAGEN DEL GRÁFICO ---
    async function generateChartImage(dataIntentos) {
        return new Promise((resolve) => {
            const ctx = canvasHidden.getContext('2d');
            
            // Destruir chart previo si existe (para no sobreponer)
            if (window.myReportChart) window.myReportChart.destroy();

            // Etiquetas (Fechas cortas) y Datos
            const labels = dataIntentos.map((i, idx) => `Intento ${idx + 1}`);
            const scores = dataIntentos.map(i => i.puntaje);
            const colors = scores.map(s => s >= 700 ? '#27ae60' : '#b22222'); // Verde si pasa, Rojo si no

            window.myReportChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Puntaje',
                        data: scores,
                        backgroundColor: colors,
                        borderWidth: 0,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: false,
                    animation: false, // Importante para que se dibuje al instante
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'EVOLUCIÓN DE PUNTAJES', color: '#333', font: {size: 14} }
                    },
                    scales: {
                        y: { beginAtZero: true, max: 1000 }
                    }
                }
            });

            // Esperar un micro-momento para que renderice y sacar la foto
            setTimeout(() => {
                const imgData = canvasHidden.toDataURL('image/png', 1.0);
                resolve(imgData);
            }, 100);
        });
    }

    // --- CSV (Simple) ---
    if (btnCSV) {
        btnCSV.onclick = () => {
            let csv = "Nombre,Ciudad,Materia,Nota,Fecha,Hora\n";
            const busqueda = cleanText(fNombre.value);
            const visibles = allUsuarios.filter(u => u.rol && u.rol.toLowerCase() === 'aspirante' && (fCiudad.value === 'Todas' || u.ciudad === fCiudad.value));
            
            visibles.forEach(u => {
                const ints = allIntentos.filter(i => String(i.usuario_id) === String(u.usuario) && (fMateria.value === 'Todas' || i.materia === fMateria.value));
                ints.forEach(int => {
                    const d = new Date(int.created_at);
                    csv += `${u.nombre},${u.ciudad},${int.materia},${int.puntaje},${d.toLocaleDateString()},${d.toLocaleTimeString()}\n`;
                });
            });
            
            const link = document.createElement("a");
            link.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
            link.setAttribute("download", "Reporte_Sparta.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }
});
