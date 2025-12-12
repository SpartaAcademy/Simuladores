const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
const { jsPDF } = window.jspdf;




document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('reporte-container');
    const statusMsg = document.getElementById('status-msg');
    const fMateria = document.getElementById('filtro-materia');
    const fCiudad = document.getElementById('filtro-ciudad');
    const fNombre = document.getElementById('filtro-nombre');

    // Datos globales
    let allIntentos = [];
    let allUsuarios = [];

    try {
        // 1. CARGAR DATOS
        // Supabase
        const { data: intentos, error } = await supabase.from('resultados').select('*').order('created_at', { ascending: false });
        if(error) throw new Error("Error conectando a Base de Datos: " + error.message);
        allIntentos = intentos || [];

        // Usuarios Local
        const res = await fetch('DATA/usuarios.json');
        if(!res.ok) throw new Error("No se encontró el archivo DATA/usuarios.json");
        allUsuarios = await res.json();
        
        // Ocultar mensaje de carga
        statusMsg.style.display = 'none';

        // 2. LLENAR FILTRO MATERIAS
        const mats = [...new Set(allIntentos.map(i => i.materia))].sort();
        mats.forEach(m => {
            if(m) {
                const opt = document.createElement('option');
                opt.value = m; opt.textContent = m;
                fMateria.appendChild(opt);
            }
        });

        // 3. RENDERIZAR
        const render = () => {
            container.innerHTML = '';
            
            // Filtro de usuarios (Solo aspirantes)
            const filteredUsers = allUsuarios.filter(u => u.rol === 'aspirante').filter(u => {
                const matchC = fCiudad.value === 'Todas' || u.ciudad === fCiudad.value;
                const matchN = fNombre.value === '' || u.nombre.toLowerCase().includes(fNombre.value.toLowerCase());
                return matchC && matchN;
            });

            if (filteredUsers.length === 0) {
                container.innerHTML = "<p style='text-align:center; padding:20px; color:#666;'>No se encontraron aspirantes con esos filtros.</p>";
                return;
            }

            filteredUsers.forEach(user => {
                // Buscar intentos de este usuario
                const userInt = allIntentos.filter(i => 
                    i.usuario_id === user.usuario && 
                    (fMateria.value === 'Todas' || i.materia === fMateria.value)
                );

                // Opcional: Ocultar si no tiene intentos (comentar si quieres ver a todos)
                // if (fMateria.value !== 'Todas' && userInt.length === 0) return;

                // Crear tarjeta HTML
                const card = document.createElement('div');
                card.className = 'user-card';
                card.innerHTML = `
                    <div class="user-header">
                        <div>
                            <h3 style="margin:0; font-family:'Teko'; font-size:1.4rem;">${user.nombre}</h3>
                            <span style="color:#666; font-size:0.9rem;">${user.ciudad}</span>
                        </div>
                        <div style="text-align:right;">
                            <strong style="color:var(--primary); font-size:1.2rem;">${userInt.length}</strong> <small>Intentos</small>
                            <i class="fas fa-chevron-down" style="margin-left:10px;"></i>
                        </div>
                    </div>
                    <div class="user-attempts" style="display:none;">
                        ${userInt.length === 0 ? '<p style="padding:10px; text-align:center; color:#888;">Sin intentos registrados.</p>' : `
                        <table class="table">
                            <thead><tr><th>Materia</th><th>Nota</th><th>Fecha</th></tr></thead>
                            <tbody>
                                ${userInt.map(i => `
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
                
                // Click para abrir/cerrar
                card.querySelector('.user-header').onclick = () => {
                    const b = card.querySelector('.user-attempts');
                    b.style.display = b.style.display==='none'?'block':'none';
                };
                container.appendChild(card);
            });
        };

        // Listeners
        fCiudad.onchange = render;
        fMateria.onchange = render;
        fNombre.oninput = render;
        
        render(); // Primer renderizado

        // --- PDF POR ALUMNO ---
        document.getElementById('descargar-pdf-btn').onclick = () => {
            if(allUsuarios.length === 0) { alert("No hay datos cargados."); return; }
            const doc = new jsPDF();
            let page = 0;
            const users = allUsuarios.filter(u => u.rol === 'aspirante');
            
            let alumnosConDatos = 0;

            users.forEach(user => {
                const ints = allIntentos.filter(i => i.usuario_id === user.usuario);
                if(ints.length === 0) return; // Solo imprimir si tiene intentos
                
                alumnosConDatos++;
                if(page > 0) doc.addPage();
                page++;
                
                // Header Rojo
                doc.setFillColor(178, 34, 34); doc.rect(0, 0, 210, 25, 'F');
                doc.setTextColor(255, 255, 255); doc.setFontSize(20); 
                doc.text("SPARTA ACADEMY", 105, 17, null, null, "center");
                
                // Info
                doc.setTextColor(0, 0, 0); doc.setFontSize(14); 
                doc.text(user.nombre.toUpperCase(), 14, 40);
                doc.setFontSize(11); 
                doc.text(`Ciudad: ${user.ciudad} | Total Intentos: ${ints.length}`, 14, 48);

                // Tabla
                const rows = ints.map(i => [
                    i.materia, 
                    i.puntaje + (i.puntaje>=700 ? " (APR)" : " (REP)"), 
                    new Date(i.created_at).toLocaleString()
                ]);
                
                doc.autoTable({ 
                    startY: 55, 
                    head: [['Materia','Nota','Fecha']], 
                    body: rows,
                    theme: 'grid',
                    headStyles: { fillColor: [20, 20, 20] }
                });
            });

            if (alumnosConDatos === 0) alert("Ningún aspirante ha realizado intentos todavía.");
            else doc.save('Reporte_General.pdf');
        };

        // --- CSV ---
        document.getElementById('descargar-general-csv-btn').onclick = () => {
             if (allIntentos.length === 0) { alert("No hay datos."); return; }
             let csv = "Nombre,Ciudad,Materia,Nota,Fecha\n";
             allIntentos.forEach(i => {
                 csv += `${i.usuario_nombre},${i.ciudad},${i.materia},${i.puntaje},${i.created_at}\n`;
             });
             const link = document.createElement("a");
             link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
             link.download = "reporte.csv";
             link.click();
        };

    } catch(e) {
        statusMsg.innerHTML = `<span style="color:red; font-size:1.2rem;"><i class="fas fa-exclamation-triangle"></i> ERROR CRÍTICO:</span><br>${e.message}<br><br>Verifica que <b>DATA/usuarios.json</b> exista y la base de datos tenga permisos.`;
    }
});
