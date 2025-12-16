// --- 1. CONFIGURACIÓN Y CONEXIÓN ---
const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Librería PDF
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    // Referencias al DOM
    const container = document.getElementById('reporte-container');
    const fMateria = document.getElementById('filtro-materia');
    const fCiudad = document.getElementById('filtro-ciudad');
    const fNombre = document.getElementById('filtro-nombre');
    const spinner = document.getElementById('loading-spinner');
    
    // Botones
    const btnPDFGeneral = document.getElementById('descargar-pdf-btn');
    const btnCSV = document.getElementById('descargar-general-csv-btn');
    const canvasHidden = document.getElementById('hidden-chart-canvas');

    let allIntentos = [];
    let allUsuarios = [];

    // Función para limpiar texto
    const cleanText = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

    // --- 2. CARGA DE DATOS (DIAGNÓSTICO) ---
    console.log("Iniciando carga de datos...");
    
    try {
        // PASO A: Cargar Usuarios (Local)
        const resUsuarios = await fetch('DATA/usuarios.json');
        if (!resUsuarios.ok) throw new Error("No se encontró el archivo DATA/usuarios.json");
        allUsuarios = await resUsuarios.json();
        console.log("Usuarios cargados:", allUsuarios.length);

        // PASO B: Cargar Resultados (Supabase)
        const { data: intentos, error } = await supabase
            .from('resultados')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error Supabase:", error);
            throw new Error(`Error de Base de Datos: ${error.message}`);
        }

        allIntentos = intentos || [];
        console.log("Intentos cargados:", allIntentos.length);

        if (allIntentos.length === 0) {
            console.warn("La tabla 'resultados' está vacía.");
        }

        // PASO C: Llenar Filtro de Materias
        if (allIntentos.length > 0) {
            const materiasUnicas = [...new Set(allIntentos.map(i => i.materia))].sort();
            materiasUnicas.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                fMateria.appendChild(opt);
            });
        }

        // Ocultar spinner y mostrar datos
        if (spinner) spinner.style.display = 'none';
        render();

    } catch (e) {
        if (spinner) {
            spinner.innerHTML = `
                <div style="color: #c0392b; background: #fff5f5; padding: 20px; border-radius: 8px; border: 1px solid #c0392b;">
                    <h3><i class="fas fa-exclamation-triangle"></i> Error de Conexión</h3>
                    <p>${e.message}</p>
                    <small>Verifica tu conexión a internet o las credenciales.</small>
                </div>`;
        }
        console.error("Error Fatal:", e);
    }

    // --- 3. RENDERIZADO ---
    function render() {
        container.innerHTML = '';
        const busqueda = cleanText(fNombre.value);
        
        // Filtrar Usuarios Aspirantes
        const usuariosFiltrados = allUsuarios.filter(u => {
            const esAspirante = u.rol && u.rol.toLowerCase() === 'aspirante';
            const matchCiudad = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
            const matchNombre = busqueda === '' || cleanText(u.nombre).includes(busqueda);
            return esAspirante && matchCiudad && matchNombre;
        });

        if (usuariosFiltrados.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#666; margin-top:30px;">No se encontraron aspirantes.</p>';
            return;
        }

        // Ordenamos intentos para la vista web (Reciente arriba)
        const intentosParaWeb = [...allIntentos].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        usuariosFiltrados.forEach(user => {
            const intentosUser = intentosParaWeb.filter(i => 
                String(i.usuario_id).trim() === String(user.usuario).trim() &&
                (fMateria.value === 'Todas' || i.materia === fMateria.value)
            );

            const card = document.createElement('div');
            card.className = 'user-card';
            const colorCount = intentosUser.length > 0 ? '#b22222' : '#999';
            
            // HTML interno
            let attemptsHTML = '';
            if (intentosUser.length === 0) {
                attemptsHTML = '<p style="text-align:center; color:#999; padding:15px; font-style:italic;">No hay registros.</p>';
            } else {
                const materiasDelUsuario = [...new Set(intentosUser.map(i => i.materia))].sort();
                
                materiasDelUsuario.forEach(materiaNombre => {
                    const intentosDeMateria = intentosUser.filter(i => i.materia === materiaNombre);
                    
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
                    <div style="display:flex; align-items:center;">
                        <button class="btn-pdf-mini"><i class="fas fa-file-pdf"></i> PDF</button>
                        <div style="text-align:right;">
                            <strong style="color:${colorCount}; font-size:1.8rem; font-family:'Teko'; line-height:1;">${intentosUser.length}</strong>
                            <span style="display:block; font-size:0.75rem; color:#666; letter-spacing:1px;">TOTAL</span>
                        </div>
                    </div>
                </div>
                <div class="user-attempts">
                    ${attemptsHTML}
                </div>`;
            
            // Eventos
            card.querySelector('.user-header').onclick = (e) => {
                if(e.target.closest('.btn-pdf-mini')) return; 
                const body = card.querySelector('.user-attempts');
                body.style.display = body.style.display === 'block' ? 'none' : 'block';
            };

            card.querySelector('.btn-pdf-mini').onclick = (e) => {
                e.stopPropagation();
                generatePDF([user], `Reporte_${user.nombre.replace(/\s+/g, '_')}.pdf`);
            };

            container.appendChild(card);
        });
    }

    // Listeners
    fCiudad.addEventListener('change', render);
    fMateria.addEventListener('change', render);
    fNombre.addEventListener('input', render);

    // PDF General
    if (btnPDFGeneral) {
        btnPDFGeneral.onclick = () => {
            const busqueda = cleanText(fNombre.value);
            const usuariosVisibles = allUsuarios.filter(u => {
                const esAspirante = u.rol && u.rol.toLowerCase() === 'aspirante';
                const matchCiudad = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
                const matchNombre = busqueda === '' || cleanText(u.nombre).includes(busqueda);
                return esAspirante && matchCiudad && matchNombre;
            });
            if(usuariosVisibles.length > 0) generatePDF(usuariosVisibles, "Reporte_General_Sparta.pdf");
            else alert("No hay datos filtrados para generar reporte.");
        };
    }

    // --- GENERADOR PDF ---
    async function generatePDF(usersList, filename) {
        document.body.style.cursor = 'wait';
        const doc = new jsPDF();
        let pageAdded = false;

        for (const u of usersList) {
            let intentosTotalesUsuario = allIntentos.filter(i => String(i.usuario_id).trim() === String(u.usuario).trim());
            if (fMateria.value !== 'Todas') intentosTotalesUsuario = intentosTotalesUsuario.filter(i => i.materia === fMateria.value);

            if (intentosTotalesUsuario.length === 0) {
                if (pageAdded) doc.addPage(); pageAdded = true;
                drawHeader(doc, u, fMateria.value);
                doc.setTextColor(150); doc.setFontSize(20); doc.text("SIN INTENTOS", 105, 100, { align: "center" });
                continue; 
            }

            const materiasDelUsuario = [...new Set(intentosTotalesUsuario.map(i => i.materia))];
            
            for (const materiaNombre of materiasDelUsuario) {
                const intentosMateria = intentosTotalesUsuario.filter(i => i.materia === materiaNombre);
                if (intentosMateria.length === 0) continue;

                if (pageAdded) doc.addPage(); pageAdded = true;

                drawHeader(doc, u, materiaNombre);

                const promedio = (intentosMateria.reduce((acc, curr) => acc + curr.puntaje, 0) / intentosMateria.length).toFixed(0);
                const maxNota = Math.max(...intentosMateria.map(i => i.puntaje));
                drawStatBox(doc, 140, 45, "PROMEDIO", promedio, 178, 34, 34);
                drawStatBox(doc, 170, 45, "MEJOR NOTA", maxNota, 39, 174, 96);

                const dataParaGrafica = intentosMateria.slice(-20); // Últimos 20 para gráfica
                const chartImg = await generateChartImage(dataParaGrafica);
                if (chartImg) doc.addImage(chartImg, 'PNG', 14, 80, 180, 65);

                const intentosTabla = [...intentosMateria].reverse();
                const tableRows = intentosTabla.map((i, index) => {
                    const numIntento = intentosMateria.length - index;
                    return [
                        numIntento, i.puntaje, 
                        new Date(i.created_at).toLocaleDateString(), 
                        new Date(i.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    ];
                });

                doc.autoTable({
                    head: [['#', 'Puntaje', 'Fecha', 'Hora']], body: tableRows, startY: 155, theme: 'grid',
                    headStyles: { fillColor: [30, 30, 30] }, styles: { fontSize: 9, cellPadding: 3 }
                });
                
                doc.setFontSize(8); doc.setTextColor(150); doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 285);
            }
        }
        document.body.style.cursor = 'default';
        if(pageAdded) doc.save(filename);
        else alert("No hay datos para exportar.");
    }

    function drawHeader(doc, user, materiaName) {
        doc.setFillColor(178, 34, 34); doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
        doc.text("SPARTA ACADEMY", 105, 18, { align: "center" });
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text("REPORTE DE RENDIMIENTO", 105, 26, { align: "center" });
        doc.setTextColor(0, 0, 0); doc.setFontSize(14); doc.text(user.nombre.toUpperCase(), 14, 48);
        doc.setFontSize(10); doc.setTextColor(100);
        doc.text(`CIUDAD: ${user.ciudad.toUpperCase()}`, 14, 54);
        doc.text(`MATERIA: ${materiaName === 'Todas' ? 'TODAS' : materiaName.toUpperCase()}`, 14, 59);
    }

    function drawStatBox(doc, x, y, label, value, r, g, b) {
        doc.setFillColor(245, 245, 245); doc.rect(x, y, 25, 20, 'F');
        doc.setFontSize(7); doc.setTextColor(100); doc.text(label, x + 12.5, y + 5, {align:"center"});
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(r, g, b); doc.text(String(value), x + 12.5, y + 15, {align:"center"});
    }

    async function generateChartImage(dataIntentos) {
        return new Promise((resolve) => {
            if(dataIntentos.length === 0) { resolve(null); return; }
            const ctx = canvasHidden.getContext('2d');
            if (window.myReportChart) window.myReportChart.destroy();
            
            const labels = dataIntentos.map((_, idx) => `${idx + 1}`);
            const scores = dataIntentos.map(i => i.puntaje);
            const colors = scores.map(s => s >= 700 ? '#27ae60' : '#b22222');

            window.myReportChart = new Chart(ctx, {
                type: 'bar',
                data: { labels: labels, datasets: [{ label: 'Puntaje', data: scores, backgroundColor: colors }] },
                options: { animation: false, plugins: { legend: false }, scales: { y: { beginAtZero: true, max: 1000 } } }
            });
            setTimeout(() => { resolve(canvasHidden.toDataURL('image/png', 1.0)); }, 150);
        });
    }

    // CSV
    if (btnCSV) {
        btnCSV.onclick = () => {
            let csv = "Nombre,Ciudad,Materia,Nota,Fecha,Hora\n";
            const visibles = allUsuarios.filter(u => u.rol==='aspirante' && (fCiudad.value==='Todas'||u.ciudad===fCiudad.value));
            visibles.forEach(u => {
                const ints = allIntentos.filter(i => String(i.usuario_id)===String(u.usuario) && (fMateria.value==='Todas'||i.materia===fMateria.value));
                if(ints.length===0) csv += `${u.nombre},${u.ciudad},SIN INTENTOS,0,--,--\n`;
                else ints.forEach(i => csv += `${u.nombre},${u.ciudad},${i.materia},${i.puntaje},${new Date(i.created_at).toLocaleDateString()},${new Date(i.created_at).toLocaleTimeString()}\n`);
            });
            const link = document.createElement("a"); link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); link.download = "Reporte.csv"; document.body.appendChild(link); link.click(); document.body.removeChild(link);
        };
    }
});
