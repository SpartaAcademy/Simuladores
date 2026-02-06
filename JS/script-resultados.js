// JS/script-resultados.js - FILTROS LIMPIOS, HISTORIAL COMPLETO

const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const tulcanDB = window.supabase.createClient(supabaseUrl, supabaseKey);
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const container = document.getElementById('reporte-container');
    const fMateria = document.getElementById('filtro-materia');
    const fCiudad = document.getElementById('filtro-ciudad');
    const fNombre = document.getElementById('filtro-nombre');
    const spinner = document.getElementById('loading-spinner');
    
    // Buttons
    const btnPDF = document.getElementById('descargar-pdf-btn');
    const btnCSV = document.getElementById('descargar-general-csv-btn');
    const canvas = document.getElementById('hidden-chart-canvas');

    let allUsuarios = [];
    let allIntentos = [];
    
    // Mapa para controlar duplicados en el select de materias
    let materiasEnSelect = {}; 

    const clean = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

    // --- CARGA DE DATOS ---
    try {
        console.log("Cargando datos...");

        // 1. CARGAR MENÚ (Para poblar el filtro de materias SOLO con lo activo)
        const { data: menuData } = await tulcanDB.from('menu_structure').select('json_data').order('id', {ascending: false}).limit(1);
        let menuStructure = (menuData && menuData.length > 0) ? menuData[0].json_data : null;

        // 2. OBTENER USUARIOS ACTIVOS (Solo Aspirantes)
        const { data: usersData, error: uErr } = await tulcanDB
            .from('usuarios')
            .select('*')
            .eq('rol', 'aspirante')
            .order('nombre', {ascending: true});
        
        if (uErr) throw uErr;
        allUsuarios = usersData;

        // 3. OBTENER TODO EL HISTORIAL DE RESULTADOS
        const { data: resData, error: rErr } = await tulcanDB
            .from('resultados')
            .select('*')
            .order('created_at', {ascending: true});

        if (rErr) throw rErr;
        allIntentos = resData || [];

        // --- A. LLENAR FILTRO DE CIUDADES ---
        // Solo usamos ciudades de usuarios que existen actualmente en la base de datos
        const ciudadesUnicas = [...new Set(allUsuarios.map(u => u.ciudad ? u.ciudad.trim() : "Sin Ciudad"))].sort();
        
        fCiudad.innerHTML = '<option value="Todas">Todas las Ciudades</option>';
        ciudadesUnicas.forEach(c => {
            if(c && c !== "Sin Ciudad") {
                const opt = document.createElement('option');
                opt.value = c; 
                opt.textContent = c.toUpperCase();
                fCiudad.appendChild(opt);
            }
        });

        // --- B. LLENAR FILTRO DE MATERIAS (SOLO LO ACTIVO) ---
        // Aquí está el cambio clave: Solo agregamos al select lo que está en el MENU.
        // NO agregamos el historial viejo al dropdown.
        fMateria.innerHTML = '<option value="Todas">Todas las Materias</option>';
        materiasEnSelect = {};

        if (menuStructure) {
            const grupos = extraerSimuladoresPorCarpeta(menuStructure['root'], menuStructure, "GENERAL");
            
            for (const [carpeta, simuladores] of Object.entries(grupos)) {
                if (simuladores.length > 0) {
                    const group = document.createElement('optgroup');
                    group.label = carpeta; 
                    
                    simuladores.forEach(sim => {
                        // Evitar duplicados visuales
                        if (!materiasEnSelect[sim.label]) {
                            const opt = document.createElement('option');
                            opt.value = sim.label; 
                            opt.textContent = sim.label;
                            group.appendChild(opt);
                            materiasEnSelect[sim.label] = true;
                        }
                    });
                    fMateria.appendChild(group);
                }
            }
        }

        spinner.style.display = 'none';
        renderCards();

    } catch (e) {
        spinner.innerHTML = `<p style="color:red">Error cargando datos: ${e.message}</p>`;
        console.error(e);
    }

    // --- FUNCIÓN RECURSIVA PARA ORDENAR MATERIAS ---
    function extraerSimuladoresPorCarpeta(itemRoot, fullMenu, nombreCarpetaActual, resultado = {}) {
        if (!itemRoot || !itemRoot.items) return resultado;

        itemRoot.items.forEach(item => {
            if (item.type === 'folder') {
                const subCarpetaNombre = item.label.toUpperCase();
                extraerSimuladoresPorCarpeta(fullMenu[item.id], fullMenu, subCarpetaNombre, resultado);
            } else if (item.type === 'test') {
                if (!resultado[nombreCarpetaActual]) {
                    resultado[nombreCarpetaActual] = [];
                }
                resultado[nombreCarpetaActual].push({ label: item.label, id: item.link });
            }
        });
        return resultado;
    }

    // --- RENDERIZADO ---
    function renderCards() {
        container.innerHTML = '';
        const busqueda = clean(fNombre.value);
        const ciudadFiltro = fCiudad.value;
        const materiaFiltro = fMateria.value;

        // 1. Filtrar Usuarios
        const usuariosVisibles = allUsuarios.filter(u => {
            const userCiudad = u.ciudad ? u.ciudad.trim() : "Sin Ciudad";
            const matchCiudad = ciudadFiltro === 'Todas' || userCiudad === ciudadFiltro;
            const matchNombre = busqueda === '' || clean(u.nombre).includes(busqueda);
            return matchCiudad && matchNombre;
        });

        if (usuariosVisibles.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#777; margin-top:20px;">No se encontraron estudiantes.</p>';
            return;
        }

        const intentosDisplay = [...allIntentos].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        usuariosVisibles.forEach(user => {
            // 2. Obtener TODOS los intentos del usuario (incluido historial borrado)
            let intentosUser = intentosDisplay.filter(i => String(i.usuario_id) === String(user.usuario));

            // 3. Si se seleccionó una materia ESPECÍFICA, filtramos.
            // Si dice "Todas las Materias", mostramos TODO (sin importar si el simulador existe o no en el menú).
            if (materiaFiltro !== 'Todas') {
                intentosUser = intentosUser.filter(i => i.materia === materiaFiltro);
            }

            // Omitir tarjeta solo si el filtro específico deja vacío al usuario
            if (materiaFiltro !== 'Todas' && intentosUser.length === 0) return;

            const card = document.createElement('div');
            card.className = 'user-card';
            const color = intentosUser.length > 0 ? '#b22222' : '#ccc';

            let htmlIntentos = '';
            if (intentosUser.length === 0) {
                htmlIntentos = '<p style="text-align:center; color:#999; padding:10px;">Sin registros.</p>';
            } else {
                const mats = [...new Set(intentosUser.map(i => i.materia))].sort();
                mats.forEach(m => {
                    const intsMateria = intentosUser.filter(i => i.materia === m);
                    htmlIntentos += `
                    <div class="materia-block">
                        <h4 class="materia-title">${m} (${intsMateria.length})</h4>
                        <table class="table">
                            <thead><tr><th>NOTA</th><th>FECHA</th></tr></thead>
                            <tbody>
                                ${intsMateria.map(i => {
                                    const notaColor = i.puntaje >= 700 ? '#27ae60' : '#c0392b';
                                    return `<tr>
                                        <td style="font-weight:bold; color:${notaColor}">${i.puntaje}</td>
                                        <td>${new Date(i.created_at).toLocaleDateString()}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>`;
                });
            }

            card.innerHTML = `
                <div class="user-header">
                    <div>
                        <h3>${user.nombre}</h3>
                        <small><i class="fas fa-map-marker-alt"></i> ${user.ciudad || 'N/A'}</small>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button class="btn-pdf-mini"><i class="fas fa-file-pdf"></i></button>
                        <div style="text-align:right;">
                            <strong style="color:${color}; font-size:1.5rem; font-family:'Teko';">${intentosUser.length}</strong>
                            <span style="display:block; font-size:0.7rem;">INTENTOS</span>
                        </div>
                    </div>
                </div>
                <div class="user-attempts">${htmlIntentos}</div>
            `;

            card.querySelector('.user-header').onclick = (e) => {
                if(e.target.closest('.btn-pdf-mini')) return;
                const body = card.querySelector('.user-attempts');
                body.style.display = body.style.display === 'block' ? 'none' : 'block';
            };

            card.querySelector('.btn-pdf-mini').onclick = () => {
                generarPDF([user], `Reporte_${user.nombre}.pdf`);
            };

            container.appendChild(card);
        });
    }

    // Listeners
    fCiudad.addEventListener('change', renderCards);
    fMateria.addEventListener('change', renderCards);
    fNombre.addEventListener('input', renderCards);

    // --- GENERAR PDF ---
    if(btnPDF) {
        btnPDF.onclick = () => {
            const busqueda = clean(fNombre.value);
            const ciudadFiltro = fCiudad.value;
            
            const list = allUsuarios.filter(u => {
                const userCiudad = u.ciudad ? u.ciudad.trim() : "Sin Ciudad";
                const matchCiudad = ciudadFiltro === 'Todas' || userCiudad === ciudadFiltro;
                const matchNombre = busqueda === '' || clean(u.nombre).includes(busqueda);
                return matchCiudad && matchNombre;
            });
            if(list.length > 0) generarPDF(list, "Reporte_General.pdf");
            else alert("No hay datos para generar el PDF.");
        };
    }

    async function generarPDF(users, filename) {
        document.body.style.cursor = 'wait';
        const doc = new jsPDF();
        let pageAdded = false;

        for (const user of users) {
            let intentos = allIntentos.filter(i => String(i.usuario_id) === String(user.usuario));
            
            // FILTRO PDF: Si elige "Todas", van todas (incluso borradas). Si elige una, solo esa.
            if (fMateria.value !== 'Todas') intentos = intentos.filter(i => i.materia === fMateria.value);

            if (intentos.length === 0) {
                if (users.length === 1) {
                    drawHeader(doc, user, fMateria.value);
                    doc.text("SIN REGISTROS", 105, 100, {align:'center'});
                    pageAdded = true;
                }
                continue;
            }

            const materias = [...new Set(intentos.map(i => i.materia))];
            
            for (const mat of materias) {
                if (pageAdded) doc.addPage();
                pageAdded = true;
                
                const intsMat = intentos.filter(i => i.materia === mat);
                
                drawHeader(doc, user, mat);
                
                const avg = (intsMat.reduce((a,b)=>a+b.puntaje,0) / intsMat.length).toFixed(0);
                const max = Math.max(...intsMat.map(i=>i.puntaje));
                
                doc.setFillColor(240,240,240); doc.rect(140, 40, 25, 15, 'F'); doc.rect(170, 40, 25, 15, 'F');
                doc.setFontSize(8); doc.text("PROMEDIO", 152.5, 45, {align:'center'}); doc.text("MÁXIMA", 182.5, 45, {align:'center'});
                doc.setFontSize(12); doc.setFont("helvetica","bold"); 
                doc.text(avg, 152.5, 52, {align:'center'}); doc.text(String(max), 182.5, 52, {align:'center'});

                const chartImg = await getChartImg(intsMat.slice(-15)); 
                if(chartImg) doc.addImage(chartImg, 'PNG', 15, 60, 180, 60);

                const rows = intsMat.reverse().map((i, idx) => [
                    intsMat.length - idx, 
                    i.puntaje, 
                    new Date(i.created_at).toLocaleDateString(),
                    new Date(i.created_at).toLocaleTimeString()
                ]);
                
                doc.autoTable({
                    head: [['#', 'Nota', 'Fecha', 'Hora']],
                    body: rows,
                    startY: 130,
                    theme: 'grid',
                    headStyles: { fillColor: [178, 34, 34] }
                });
            }
        }
        
        document.body.style.cursor = 'default';
        if(pageAdded) doc.save(filename);
        else if(users.length > 1) alert("Ningún usuario tiene intentos en los criterios seleccionados.");
    }

    function drawHeader(doc, user, mat) {
        doc.setFillColor(20,20,20); doc.rect(0,0,210,30,'F');
        doc.setTextColor(255,255,255); doc.setFontSize(18); doc.text("SPARTA ACADEMY", 105, 12, {align:'center'});
        doc.setFontSize(10); doc.text("REPORTE ACADÉMICO", 105, 20, {align:'center'});
        
        doc.setTextColor(0,0,0); doc.setFontSize(14); doc.text(user.nombre.toUpperCase(), 15, 45);
        doc.setFontSize(10); doc.setTextColor(100); 
        doc.text(`CIUDAD: ${user.ciudad || 'N/A'}`, 15, 50);
        doc.text(`MATERIA: ${mat}`, 15, 55);
    }

    async function getChartImg(data) {
        return new Promise(resolve => {
            const ctx = canvas.getContext('2d');
            if(window.myChart) window.myChart.destroy();
            
            window.myChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map((_,i)=>i+1),
                    datasets: [{
                        label: 'Puntaje',
                        data: data.map(d=>d.puntaje),
                        backgroundColor: data.map(d=>d.puntaje>=700?'#27ae60':'#c0392b')
                    }]
                },
                options: { animation: false, scales: { y: { beginAtZero: true, max: 1000 } } }
            });
            setTimeout(() => resolve(canvas.toDataURL('image/png')), 200);
        });
    }
});
