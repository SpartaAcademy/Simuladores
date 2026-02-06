// JS/script-resultados.js - CONECTADO 100% A SUPABASE

const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const tulcanDB = window.supabase.createClient(supabaseUrl, supabaseKey);
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    // Referencias DOM
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

    const cleanText = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

    console.log("Iniciando carga de datos Admin...");
    
    try {
        // 1. CARGAR USUARIOS DESDE SUPABASE (Tabla 'usuarios')
        const { data: usuariosData, error: userError } = await tulcanDB
            .from('usuarios')
            .select('*')
            .eq('rol', 'aspirante') // Solo traemos aspirantes para el reporte
            .order('nombre', { ascending: true });

        if (userError) throw new Error("Error cargando usuarios: " + userError.message);
        allUsuarios = usuariosData;

        // 2. CARGAR RESULTADOS
        const { data: intentos, error: resultError } = await tulcanDB
            .from('resultados')
            .select('*')
            .order('created_at', { ascending: true });

        if (resultError) throw new Error("Error cargando resultados: " + resultError.message);
        allIntentos = intentos || [];

        // 3. Llenar Filtro Materias
        if (allIntentos.length > 0) {
            const materiasUnicas = [...new Set(allIntentos.map(i => i.materia))].sort();
            materiasUnicas.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m; opt.textContent = m;
                fMateria.appendChild(opt);
            });
        }

        if (spinner) spinner.style.display = 'none';
        render();

    } catch (e) {
        if (spinner) spinner.innerHTML = `<p style="color:red; text-align:center;">Error: ${e.message}</p>`;
        console.error(e);
    }

    // --- RENDERIZADO ---
    function render() {
        container.innerHTML = '';
        const busqueda = cleanText(fNombre.value);
        
        const usuariosFiltrados = allUsuarios.filter(u => {
            const matchCiudad = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
            const matchNombre = busqueda === '' || cleanText(u.nombre).includes(busqueda);
            return matchCiudad && matchNombre;
        });

        if (usuariosFiltrados.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#666; margin-top:30px;">No se encontraron aspirantes.</p>';
            return;
        }

        const intentosParaWeb = [...allIntentos].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        usuariosFiltrados.forEach(user => {
            // Relacionamos intentos por el campo 'usuario_id' que coincide con el 'usuario' (login)
            const intentosUser = intentosParaWeb.filter(i => 
                String(i.usuario_id).trim() === String(user.usuario).trim() &&
                (fMateria.value === 'Todas' || i.materia === fMateria.value)
            );

            const card = document.createElement('div');
            card.className = 'user-card';
            const colorCount = intentosUser.length > 0 ? '#b22222' : '#999';
            
            let attemptsHTML = '';
            if (intentosUser.length === 0) {
                attemptsHTML = '<p style="text-align:center; color:#999; padding:15px;">Sin registros recientes.</p>';
            } else {
                const materiasUser = [...new Set(intentosUser.map(i => i.materia))].sort();
                materiasUser.forEach(mat => {
                    const intentosMat = intentosUser.filter(i => i.materia === mat);
                    attemptsHTML += `
                    <div class="materia-block">
                        <h4 class="materia-title">${mat} (${intentosMat.length})</h4>
                        <table class="table">
                            <thead><tr><th>NOTA</th><th>FECHA</th><th>HORA</th></tr></thead>
                            <tbody>
                                ${intentosMat.map(i => {
                                    const d = new Date(i.created_at);
                                    return `<tr>
                                        <td style="font-weight:bold; color:${i.puntaje >= 700 ? '#27ae60' : '#c0392b'}">${i.puntaje}</td>
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
                        <small><i class="fas fa-map-marker-alt"></i> ${user.ciudad || 'N/A'}</small>
                    </div>
                    <div style="display:flex; align-items:center;">
                        <button class="btn-pdf-mini"><i class="fas fa-file-pdf"></i> PDF</button>
                        <div style="text-align:right;">
                            <strong style="color:${colorCount}; font-size:1.8rem; font-family:'Teko'; line-height:1;">${intentosUser.length}</strong>
                            <span style="display:block; font-size:0.75rem; color:#666;">TOTAL</span>
                        </div>
                    </div>
                </div>
                <div class="user-attempts">${attemptsHTML}</div>`;
            
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

    // Listeners Filtros
    fCiudad.addEventListener('change', render);
    fMateria.addEventListener('change', render);
    fNombre.addEventListener('input', render);

    // --- GENERADOR PDF (Lógica Original) ---
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

                const dataParaGrafica = intentosMateria.slice(-20); 
                const chartImg = await generateChartImage(dataParaGrafica);
                if (chartImg) doc.addImage(chartImg, 'PNG', 14, 80, 180, 65);

                const intentosTabla = [...intentosMateria].reverse();
                const tableRows = intentosTabla.map((i, index) => {
                    const numIntento = intentosMateria.length - index;
                    return [numIntento, i.puntaje, new Date(i.created_at).toLocaleDateString(), new Date(i.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})];
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
        doc.text("SPARTA", 105, 18, { align: "center" });
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text("REPORTE DE RENDIMIENTO", 105, 26, { align: "center" });
        doc.setTextColor(0, 0, 0); doc.setFontSize(14); doc.text(user.nombre.toUpperCase(), 14, 48);
        doc.setFontSize(10); doc.setTextColor(100);
        doc.text(`CIUDAD: ${(user.ciudad || 'N/A').toUpperCase()}`, 14, 54);
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

    if (btnCSV) {
        btnCSV.onclick = () => {
            let csv = "Nombre,Ciudad,Materia,Nota,Fecha,Hora\n";
            const visibles = allUsuarios.filter(u => (fCiudad.value==='Todas'||u.ciudad===fCiudad.value));
            visibles.forEach(u => {
                const ints = allIntentos.filter(i => String(i.usuario_id)===String(u.usuario) && (fMateria.value==='Todas'||i.materia===fMateria.value));
                if(ints.length===0) csv += `${u.nombre},${u.ciudad},SIN INTENTOS,0,--,--\n`;
                else ints.forEach(i => csv += `${u.nombre},${u.ciudad},${i.materia},${i.puntaje},${new Date(i.created_at).toLocaleDateString()},${new Date(i.created_at).toLocaleTimeString()}\n`);
            });
            const link = document.createElement("a"); link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); link.download = "Reporte.csv"; document.body.appendChild(link); link.click(); document.body.removeChild(link);
        };
    }
});
