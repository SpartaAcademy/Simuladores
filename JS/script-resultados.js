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

    // --- 2. RENDERIZADO WEB (VISTA AGRUPADA POR MATERIAS) ---
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

        // Orden general para conteos (más reciente primero)
        const intentosParaWeb = [...allIntentos].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        usuariosFiltrados.forEach(user => {
            // Filtrar todos los intentos de este usuario según el filtro de materia global
            const intentosTotalesUser = intentosParaWeb.filter(i => 
                String(i.usuario_id).trim() === String(user.usuario).trim() &&
                (fMateria.value === 'Todas' || i.materia === fMateria.value)
            );

            const card = document.createElement('div');
            card.className = 'user-card';
            const colorCount = intentosTotalesUser.length > 0 ? '#b22222' : '#999';
            
            // Construir el HTML interno
            let attemptsHTML = '';

            if (intentosTotalesUser.length === 0) {
                attemptsHTML = '<p style="text-align:center; color:#999; padding:15px;">Sin intentos registrados.</p>';
            } else {
                // AGRUPAR POR MATERIA
                // 1. Obtener materias únicas de este usuario
                const materiasDelUsuario = [...new Set(intentosTotalesUser.map(i => i.materia))].sort();

                // 2. Crear una tabla por cada materia
                materiasDelUsuario.forEach(materiaNombre => {
                    const intentosDeMateria = intentosTotalesUser.filter(i => i.materia === materiaNombre);
                    
                    attemptsHTML += `
                    <div class="materia-block">
                        <h4 class="materia-title">${materiaNombre} (${intentosDeMateria.length})</h4>
                        <table class="table">
                            <thead><tr><th>NOTA</th><th>FECHA</th><th>HORA</th></tr></thead>
                            <tbody>
                                ${intentosDeMateria.map(i => {
                                    const d = new Date(i.created_at);
                                    const colorNota = i.puntaje >= 700 ? '#27ae60' : '#c0392b';
                                    return `<tr>
                                        <td style="font-weight:bold; color:${colorNota}">${i.puntaje}</td>
                                        <td>${d.toLocaleDateString()}</td>
                                        <td>${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>`;
                });
            }
            
            card.innerHTML = `
                <div class="user-header">
                    <div style="text-align:left;">
                        <h3>${user.nombre}</h3>
                        <small><i class="fas fa-map-marker-alt"></i> ${user.ciudad}</small>
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:${colorCount}; font-size:1.8rem; font-family:'Teko'; line-height:1;">${intentosTotalesUser.length}</strong>
                        <span style="display:block; font-size:0.75rem; color:#666; letter-spacing:1px;">TOTAL</span>
                    </div>
                </div>
                <div class="user-attempts">
                    ${attemptsHTML}
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

    // --- GENERADOR PDF (Mantiene lógica de separación) ---
    if (btnPDF) {
        btnPDF.onclick = async () => {
            const originalText = btnPDF.innerHTML;
            btnPDF.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
            btnPDF.disabled = true;

            const doc = new jsPDF();
            const busqueda = cleanText(fNombre.value);
            
            const usuariosVisibles = allUsuarios.filter(u => {
                const esAspirante = u.rol && u.rol.toLowerCase() === 'aspirante';
                const matchCiudad = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
                const matchNombre = busqueda === '' || cleanText(u.nombre).includes(busqueda);
                return esAspirante && matchCiudad && matchNombre;
            });

            let pageAdded = false;

            for (const u of usuariosVisibles) {
                let intentosTotalesUsuario = allIntentos.filter(i => 
                    String(i.usuario_id).trim() === String(u.usuario).trim()
                );

                if (intentosTotalesUsuario.length === 0) continue;

                const materiasDelUsuario = [...new Set(intentosTotalesUsuario.map(i => i.materia))];
                const materiasAProcesar = fMateria.value === 'Todas' ? materiasDelUsuario : materiasDelUsuario.filter(m => m === fMateria.value);

                for (const materiaNombre of materiasAProcesar) {
                    const intentosMateria = intentosTotalesUsuario.filter(i => i.materia === materiaNombre);
                    if (intentosMateria.length === 0) continue;

                    if (pageAdded) doc.addPage();
                    pageAdded = true;

                    // Encabezado
                    doc.setFillColor(178, 34, 34); doc.rect(0, 0, 210, 35, 'F');
                    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
                    doc.text("SPARTA ACADEMY", 105, 18, { align: "center" });
                    doc.setFontSize(10); doc.setFont("helvetica", "normal");
                    doc.text("INFORME DE RENDIMIENTO POR MATERIA", 105, 26, { align: "center" });

                    // Info
                    doc.setTextColor(0, 0, 0); doc.setFontSize(14); doc.text(u.nombre.toUpperCase(), 14, 48);
                    doc.setFontSize(10); doc.setTextColor(100);
                    doc.text(`CIUDAD: ${u.ciudad.toUpperCase()}`, 14, 54);
                    doc.text(`MATERIA: ${materiaNombre.toUpperCase()}`, 14, 59);

                    // Stats
                    const promedio = (intentosMateria.reduce((acc, curr) => acc + curr.puntaje, 0) / intentosMateria.length).toFixed(0);
                    const maxNota = Math.max(...intentosMateria.map(i => i.puntaje));
                    drawStatBox(doc, 140, 45, "PROMEDIO", promedio, 178, 34, 34);
                    drawStatBox(doc, 170, 45, "MEJOR NOTA", maxNota, 39, 174, 96);

                    // Chart (Últimos 20)
                    const limitChart = 20;
                    const dataParaGrafica = intentosMateria.slice(-limitChart);
                    const chartImg = await generateChartImage(dataParaGrafica);
                    if (chartImg) {
                        doc.addImage(chartImg, 'PNG', 14, 80, 180, 65);
                    }

                    // Tabla
                    const intentosTabla = [...intentosMateria].reverse(); 
                    const tableRows = intentosTabla.map((i, index) => {
                        const numIntento = intentosMateria.length - index;
                        return [numIntento, i.puntaje, new Date(i.created_at).toLocaleDateString(), new Date(i.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})];
                    });

                    doc.autoTable({
                        head: [['#', 'Puntaje', 'Fecha', 'Hora']],
                        body: tableRows,
                        startY: 155,
                        theme: 'grid',
                        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], halign: 'center' },
                        columnStyles: { 0: {halign:'center'}, 1: {halign:'center', fontStyle:'bold'}, 2: {halign:'center'}, 3: {halign:'center'} },
                        styles: { fontSize: 9, cellPadding: 3 },
                        didParseCell: function(data) {
                            if (data.section === 'body' && data.column.index === 1) {
                                const val = parseInt(data.cell.raw);
                                data.cell.styles.textColor = val >= 700 ? [39, 174, 96] : [192, 57, 43];
                            }
                        }
                    });
                    
                    doc.setFontSize(8); doc.setTextColor(150);
                    doc.text(`Reporte generado el ${new Date().toLocaleDateString()}`, 14, 285);
                }
            }

            if (!pageAdded) alert("No hay datos para generar el reporte.");
            else doc.save("Reporte_Sparta_Completo.pdf");

            btnPDF.innerHTML = originalText;
            btnPDF.disabled = false;
        };
    }

    function drawStatBox(doc, x, y, label, value, r, g, b) {
        doc.setFillColor(245, 245, 245); doc.rect(x, y, 25, 20, 'F');
        doc.setFontSize(7); doc.setTextColor(100); doc.text(label, x + 12.5, y + 5, {align:"center"});
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(r, g, b); doc.text(String(value), x + 12.5, y + 15, {align:"center"});
    }

    async function generateChartImage(dataIntentos) {
        return new Promise((resolve) => {
            const ctx = canvasHidden.getContext('2d');
            if (window.myReportChart) window.myReportChart.destroy();
            
            const labels = dataIntentos.map((_, idx) => `${idx + 1}`);
            const scores = dataIntentos.map(i => i.puntaje);
            const colors = scores.map(s => s >= 700 ? '#27ae60' : '#b22222');

            window.myReportChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{ label: 'Puntaje', data: scores, backgroundColor: colors, borderRadius: 3, barPercentage: 0.6 }]
                },
                options: {
                    responsive: false, animation: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: { y: { beginAtZero: true, max: 1000, grid: { color: '#eee' } }, x: { grid: { display: false } } }
                }
            });
            setTimeout(() => { resolve(canvasHidden.toDataURL('image/png', 1.0)); }, 150);
        });
    }

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
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        };
    }
});
