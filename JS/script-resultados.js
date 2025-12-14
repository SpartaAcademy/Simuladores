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

    // --- 1. CARGA DATOS ---
    try {
        // Traemos datos ordenados por fecha ascendente (útil para la gráfica cronológica)
        const { data: intentos, error } = await supabase.from('resultados').select('*').order('created_at', { ascending: true });
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

    // --- 2. RENDERIZADO WEB (VISTA GENERAL) ---
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

        // Para la vista web mostramos lo más reciente primero
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
                        <span style="display:block; font-size:0.75rem; color:#666; letter-spacing:1px;">INTENTOS TOTALES</span>
                    </div>
                </div>
                <div class="user-attempts">
                    ${intentosUser.length === 0 ? '<p style="text-align:center; color:#999; padding:15px;">Sin intentos registrados.</p>' : `
                    <table class="table">
                        <thead><tr><th>MATERIA</th><th>NOTA</th><th>FECHA</th><th>HORA</th></tr></thead>
                        <tbody>
                            ${intentosUser.map(i => {
                                const d = new Date(i.created_at);
                                const colorNota = i.puntaje >= 700 ? '#27ae60' : '#c0392b';
                                return `<tr>
                                    <td>${i.materia}</td>
                                    <td style="font-weight:bold; color:${colorNota}">${i.puntaje}</td>
                                    <td>${d.toLocaleDateString()}</td>
                                    <td>${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                </tr>`;
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

    // Eventos Filtros
    fCiudad.addEventListener('change', render);
    fMateria.addEventListener('change', render);
    fNombre.addEventListener('input', render);

    // --- 3. GENERADOR DE PDF AVANZADO (SEPARADO POR MATERIAS) ---
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

            // 2. Iterar por USUARIO
            for (const u of usuariosVisibles) {
                
                // Obtener todos los intentos de este usuario
                let intentosTotalesUsuario = allIntentos.filter(i => 
                    String(i.usuario_id).trim() === String(u.usuario).trim()
                );

                if (intentosTotalesUsuario.length === 0) continue;

                // 3. Agrupar por MATERIA (Esto separa el reporte)
                // Obtenemos las materias únicas que ha rendido este usuario
                const materiasDelUsuario = [...new Set(intentosTotalesUsuario.map(i => i.materia))];

                // Si hay un filtro de materia seleccionado, solo usamos esa
                const materiasAProcesar = fMateria.value === 'Todas' 
                    ? materiasDelUsuario 
                    : materiasDelUsuario.filter(m => m === fMateria.value);

                // 4. Iterar por MATERIA (Crear una sección/página por materia)
                for (const materiaNombre of materiasAProcesar) {
                    
                    // Filtrar intentos SOLO de esta materia
                    // Nota: 'allIntentos' ya viene ordenado cronológicamente (antiguo -> nuevo)
                    const intentosMateria = intentosTotalesUsuario.filter(i => i.materia === materiaNombre);

                    if (intentosMateria.length === 0) continue;

                    if (pageAdded) doc.addPage();
                    pageAdded = true;

                    // --- ENCABEZADO DE PÁGINA ---
                    doc.setFillColor(178, 34, 34); // Rojo Sparta
                    doc.rect(0, 0, 210, 35, 'F');
                    
                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(20);
                    doc.text("SPARTA ACADEMY", 105, 18, { align: "center" });
                    
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.text("INFORME DE RENDIMIENTO POR MATERIA", 105, 26, { align: "center" });

                    // --- INFO ALUMNO ---
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(14);
                    doc.text(u.nombre.toUpperCase(), 14, 48);
                    
                    doc.setFontSize(10);
                    doc.setTextColor(100);
                    doc.text(`CIUDAD: ${u.ciudad.toUpperCase()}`, 14, 54);
                    doc.text(`MATERIA: ${materiaNombre.toUpperCase()}`, 14, 59); // Nombre específico de la materia

                    // --- ESTADÍSTICAS DE LA MATERIA ---
                    const promedio = (intentosMateria.reduce((acc, curr) => acc + curr.puntaje, 0) / intentosMateria.length).toFixed(0);
                    const maxNota = Math.max(...intentosMateria.map(i => i.puntaje));
                    const totalTests = intentosMateria.length;

                    // Cajas de KPIs
                    drawStatBox(doc, 140, 45, "PROMEDIO", promedio, 178, 34, 34);
                    drawStatBox(doc, 170, 45, "MEJOR NOTA", maxNota, 39, 174, 96);

                    // --- GRÁFICA INTELIGENTE (Limitada a últimos 20) ---
                    // Tomamos los últimos 20 intentos para que la gráfica no explote
                    const limitChart = 20;
                    const dataParaGrafica = intentosMateria.slice(-limitChart); // Los últimos X
                    
                    doc.setFontSize(9);
                    doc.setTextColor(50);
                    let tituloGrafica = "EVOLUCIÓN DE PUNTAJES";
                    if (intentosMateria.length > limitChart) {
                        tituloGrafica += ` (Últimos ${limitChart} de ${intentosMateria.length} intentos)`;
                    }
                    doc.text(tituloGrafica, 105, 75, { align: "center" });

                    // Generar imagen del chart solo con esta materia
                    const chartImg = await generateChartImage(dataParaGrafica);
                    if (chartImg) {
                        doc.addImage(chartImg, 'PNG', 14, 80, 180, 65);
                    }

                    // --- TABLA COMPLETA (Aquí sí van todos los intentos) ---
                    // Invertimos para mostrar el más reciente arriba en la tabla
                    const intentosTabla = [...intentosMateria].reverse(); 
                    
                    const tableRows = intentosTabla.map((i, index) => {
                        // Calculamos el número de intento real (basado en el total)
                        const numIntento = intentosMateria.length - index;
                        return [
                            numIntento,
                            i.puntaje,
                            new Date(i.created_at).toLocaleDateString(),
                            new Date(i.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        ];
                    });

                    doc.autoTable({
                        head: [['#', 'Puntaje', 'Fecha', 'Hora']],
                        body: tableRows,
                        startY: 155,
                        theme: 'grid',
                        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], halign: 'center' },
                        columnStyles: {
                            0: { halign: 'center', cellWidth: 20 },
                            1: { halign: 'center', fontStyle: 'bold' },
                            2: { halign: 'center' },
                            3: { halign: 'center' }
                        },
                        styles: { fontSize: 9, cellPadding: 3 },
                        // Colorear notas rojas/verdes en la tabla
                        didParseCell: function(data) {
                            if (data.section === 'body' && data.column.index === 1) {
                                const val = parseInt(data.cell.raw);
                                data.cell.styles.textColor = val >= 700 ? [39, 174, 96] : [192, 57, 43];
                            }
                        }
                    });

                    // Pie de página
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(`Reporte generado el ${new Date().toLocaleDateString()}`, 14, 285);
                    doc.text(`Sparta Academy`, 195, 285, { align: "right" });
                } // Fin loop Materias
            } // Fin loop Usuarios

            if (!pageAdded) {
                alert("No hay datos para generar el reporte.");
            } else {
                doc.save("Reporte_Sparta_Completo.pdf");
            }

            btnPDF.innerHTML = originalText;
            btnPDF.disabled = false;
        };
    }

    // --- AUXILIARES PDF ---
    function drawStatBox(doc, x, y, label, value, r, g, b) {
        doc.setFillColor(245, 245, 245);
        doc.rect(x, y, 25, 20, 'F');
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(label, x + 12.5, y + 5, {align:"center"});
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(r, g, b);
        doc.text(String(value), x + 12.5, y + 15, {align:"center"});
    }

    async function generateChartImage(dataIntentos) {
        return new Promise((resolve) => {
            const ctx = canvasHidden.getContext('2d');
            
            if (window.myReportChart) window.myReportChart.destroy();

            // Etiquetas simples 1, 2, 3... correspondientes al orden cronológico
            // dataIntentos viene ordenado antiguo -> nuevo
            const labels = dataIntentos.map((_, idx) => `${idx + 1}`);
            const scores = dataIntentos.map(i => i.puntaje);
            const colors = scores.map(s => s >= 700 ? '#27ae60' : '#b22222');

            window.myReportChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Puntaje',
                        data: scores,
                        backgroundColor: colors,
                        borderRadius: 3,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: false,
                    animation: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        y: { beginAtZero: true, max: 1000, grid: { color: '#eee' } },
                        x: { grid: { display: false } }
                    }
                }
            });

            setTimeout(() => {
                const imgData = canvasHidden.toDataURL('image/png', 1.0);
                resolve(imgData);
            }, 150);
        });
    }

    // --- CSV ---
    if (btnCSV) {
        btnCSV.onclick = () => {
            let csv = "Nombre,Ciudad,Materia,Nota,Fecha,Hora\n";
            const busqueda = cleanText(fNombre.value);
            const visibles = allUsuarios.filter(u => {
                const esAspirante = u.rol && u.rol.toLowerCase() === 'aspirante';
                const matchCiudad = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
                const matchNombre = busqueda === '' || cleanText(u.nombre).includes(busqueda);
                return esAspirante && matchCiudad && matchNombre;
            });
            
            visibles.forEach(u => {
                const ints = allIntentos.filter(i => String(i.usuario_id) === String(u.usuario));
                // Filtro materia también en CSV si está seleccionado
                const intsFiltrados = fMateria.value === 'Todas' ? ints : ints.filter(i => i.materia === fMateria.value);

                intsFiltrados.forEach(int => {
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
