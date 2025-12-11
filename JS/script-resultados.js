// JS/script-resultados.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// (ACTUALIZADO) Tus nuevas credenciales
const supabaseUrl = 'https://scfbvwqkgtyflzwcasqv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRna2JzYWF6eGducGxsY3d0YnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzk0OTUsImV4cCI6MjA3Nzc1NTQ5NX0.877IdYJdJSczFaqCsz2P-w5uzAZvS7E6DzWTcwyT4IQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Lista de materias para el filtro
const materias = {
    'sociales': 'Ciencias Sociales',
    'matematicas': 'Matemáticas y Física',
    'lengua': 'Lengua y Literatura',
    'ingles': 'Inglés',
    'general': 'General (Todas)',
    'inteligencia': 'Inteligencia',
    'personalidad': 'Personalidad',
    'ppnn1': 'Cuestionario 1 PPNN',
    'ppnn2': 'Cuestionario 2 PPNN',
    'ppnn3': 'Cuestionario 3 PPNN',
    'ppnn4': 'Cuestionario 4 PPNN',
    'sociales_esmil': 'Ciencias Sociales (ESMIL)',
    'matematicas_esmil': 'Matemáticas y Física (ESMIL)',
    'lengua_esmil': 'Lengua y Literatura (ESMIL)',
    'ingles_esmil': 'Inglés (ESMIL)',
    'general_esmil': 'General ESMIL (Todas)'
};

const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', () => {
    
    // Referencias
    const filtroCiudad = document.getElementById('filtro-ciudad');
    const filtroMateria = document.getElementById('filtro-materia');
    const filtroNombre = document.getElementById('filtro-nombre');
    const reporteContainer = document.getElementById('reporte-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const descargarGeneralBtn = document.getElementById('descargar-general-csv-btn');
    const descargarPdfBtn = document.getElementById('descargar-pdf-btn');

    let allUsers = [];
    let allAttempts = [];
    let currentFilteredUsers = [];
    
    function formatFecha(fechaISO) {
        if (!fechaISO) return 'N/A';
        const fecha = new Date(fechaISO);
        return fecha.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function getClasePuntaje(puntaje) {
        const p = parseFloat(puntaje) || 0;
        if (p >= 700) return 'alto';
        if (p >= 400) return 'medio';
        return 'bajo';
    }

    function popularFiltroMaterias() {
        filtroMateria.innerHTML = '<option value="Todas">Todas las Materias</option>';
        for (const [key, value] of Object.entries(materias)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value; 
            filtroMateria.appendChild(option);
        }
    }
    
    async function cargarDatosIniciales() {
        loadingSpinner.style.display = 'block';
        reporteContainer.innerHTML = '<p class="no-intentos">Cargando datos...</p>';
        
        try {
            popularFiltroMaterias();

            const [usuariosRes, intentosRes] = await Promise.all([
                fetch('DATA/usuarios.json').then(res => res.json()),
                supabase.from('resultados').select('*')
            ]);

            allUsers = usuariosRes.filter(u => !u._comment && u.rol === 'aspirante');
            
            if (intentosRes.error) throw intentosRes.error;
            allAttempts = intentosRes.data;

            renderizarListaUsuarios();

        } catch (error) {
            console.error("Error al cargar datos:", error);
            reporteContainer.innerHTML = `<p class="no-intentos" style="color: red;">Error: ${error.message}</p>`;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    // ... (El resto del código de renderizar es el mismo, pero lo pongo para que esté completo) ...

    function renderizarListaUsuarios() {
        const ciudad = filtroCiudad.value;
        const materia = filtroMateria.value;
        const nombreSearch = filtroNombre.value.toLowerCase();
        
        currentFilteredUsers = allUsers.filter(user => {
            const matchCiudad = (ciudad === 'Todos' || user.ciudad === ciudad);
            const matchNombre = user.nombre.toLowerCase().includes(nombreSearch);
            return matchCiudad && matchNombre;
        });

        currentFilteredUsers.sort((a, b) => a.nombre.localeCompare(b.nombre));
        reporteContainer.innerHTML = '';

        if (currentFilteredUsers.length === 0) {
            reporteContainer.innerHTML = '<p class="no-intentos">No se encontraron aspirantes con esos filtros.</p>';
            return;
        }

        currentFilteredUsers.forEach(user => {
            const intentosUsuarioFiltrados = allAttempts.filter(a => 
                a.usuario_id === user.usuario && (materia === 'Todas' || a.materia === materia)
            );
            
            if (materia !== 'Todas' && intentosUsuarioFiltrados.length === 0) return;

            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            userCard.innerHTML = `
                <div class="user-header" data-userid="${user.usuario}">
                    <div class="user-info">
                        <i class="fas fa-user-circle user-icon"></i>
                        <div><h3>${user.nombre}</h3><span class="user-ciudad">${user.ciudad}</span></div>
                    </div>
                    <div class="user-actions">
                        <span class="user-total-intentos">${intentosUsuarioFiltrados.length} Intento(s)</span>
                        <button class="user-pdf-btn" data-userid="${user.usuario}"><i class="fas fa-file-pdf"></i> PDF</button>
                        <button class="user-csv-btn" data-userid="${user.usuario}"><i class="fas fa-download"></i> CSV</button>
                        <i class="fas fa-chevron-down user-toggle-icon"></i>
                    </div>
                </div>
                <div class="user-attempts-container"></div>
            `;
            reporteContainer.appendChild(userCard);
        });

        reporteContainer.querySelectorAll('.user-header').forEach(h => h.addEventListener('click', toggleUserAttempts));
        reporteContainer.querySelectorAll('.user-csv-btn').forEach(b => b.addEventListener('click', descargarCSVUsuario));
        reporteContainer.querySelectorAll('.user-pdf-btn').forEach(b => b.addEventListener('click', descargarPDFUsuario));
    }

    function toggleUserAttempts(event) {
        if (event.target.closest('.user-csv-btn') || event.target.closest('.user-pdf-btn')) return;
        const header = event.currentTarget;
        const userCard = header.closest('.user-card');
        const attemptsContainer = userCard.querySelector('.user-attempts-container');
        const userId = header.dataset.userid;

        if (userCard.classList.contains('open')) {
            userCard.classList.remove('open');
            attemptsContainer.style.display = 'none';
        } else {
            userCard.classList.add('open');
            attemptsContainer.style.display = 'block';
            if (!attemptsContainer.innerHTML.trim()) buildAttemptDetails(attemptsContainer, userId);
        }
    }

    function buildAttemptDetails(container, userId) {
        const materiaFiltro = filtroMateria.value;
        const intentos = allAttempts.filter(a => a.usuario_id === userId && (materiaFiltro === 'Todas' || a.materia === materiaFiltro));
        
        if (intentos.length === 0) {
            container.innerHTML = '<p>No hay intentos.</p>';
            return;
        }

        const agrupados = {};
        intentos.forEach(i => {
            if (!agrupados[i.materia]) agrupados[i.materia] = [];
            agrupados[i.materia].push(i);
        });

        let html = '';
        Object.keys(agrupados).sort().forEach(materia => {
            html += `<div class="materia-group"><h4>${materia} (${agrupados[materia].length})</h4><table class="intentos-tabla"><thead><tr><th>Puntaje</th><th>Fecha</th></tr></thead><tbody>`;
            agrupados[materia].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            agrupados[materia].forEach(i => {
                html += `<tr><td class="puntaje ${getClasePuntaje(i.puntaje)}">${i.puntaje} / ${i.total_preguntas}</td><td>${formatFecha(i.created_at)}</td></tr>`;
            });
            html += '</tbody></table></div>';
        });
        container.innerHTML = html;
    }

    function generarYDescargarCSV(data, filename) {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + data.map(e => e.join(";")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
    }
    
    function descargarCSVUsuario(event) {
        event.stopPropagation();
        const userId = event.currentTarget.dataset.userid;
        const usuarioInfo = allUsers.find(u => u.usuario === userId);
        const intentos = allAttempts.filter(a => a.usuario_id === userId && (filtroMateria.value === 'Todas' || a.materia === filtroMateria.value));
        
        if (!intentos.length) { alert("Sin datos"); return; }
        
        const data = [["Reporte Individual"], ["Nombre:", usuarioInfo.nombre], ["Usuario:", usuarioInfo.usuario], ["Ciudad:", usuarioInfo.ciudad], [], ["Materia", "Puntaje", "Total", "Fecha"]];
        intentos.forEach(i => data.push([i.materia, i.puntaje, i.total_preguntas, formatFecha(i.created_at)]));
        generarYDescargarCSV(data, `reporte_${usuarioInfo.usuario}.csv`);
    }

    function descargarCSVGeneral() {
        const data = [["Reporte General"], ["Filtro:", filtroMateria.value], [], ["Nombre", "Usuario", "Ciudad", "Materia", "Puntaje", "Total", "Fecha"]];
        const intentosFiltrados = allAttempts.filter(i => {
             const user = allUsers.find(u => u.usuario === i.usuario_id);
             return user && (filtroMateria.value === 'Todas' || i.materia === filtroMateria.value);
        });
        intentosFiltrados.forEach(i => {
             const user = allUsers.find(u => u.usuario === i.usuario_id);
             data.push([user.nombre, user.usuario, user.ciudad, i.materia, i.puntaje, i.total_preguntas, formatFecha(i.created_at)]);
        });
        generarYDescargarCSV(data, "reporte_general.csv");
    }
    
    function descargarPDFUsuario(event) {
        event.stopPropagation();
        const userId = event.currentTarget.dataset.userid;
        const usuarioInfo = allUsers.find(u => u.usuario === userId);
        const intentos = allAttempts.filter(a => a.usuario_id === userId && (filtroMateria.value === 'Todas' || a.materia === filtroMateria.value));

        if (!intentos.length) { alert("Sin datos"); return; }

        const doc = new jsPDF();
        doc.text(`Reporte: ${usuarioInfo.nombre}`, 14, 20);
        
        let startY = 30;
        const agrupados = {};
        intentos.forEach(i => { if (!agrupados[i.materia]) agrupados[i.materia] = []; agrupados[i.materia].push(i); });

        Object.keys(agrupados).sort().forEach(materia => {
            if (startY > 250) { doc.addPage(); startY = 20; }
            doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text(materia, 14, startY);
            startY += 5;
            
            const body = agrupados[materia].map((i, idx) => [idx+1, i.puntaje, i.total_preguntas, formatFecha(i.created_at)]);
            doc.autoTable({ startY: startY, head: [['#', 'Puntaje', 'Total', 'Fecha']], body: body });
            startY = doc.lastAutoTable.finalY + 10;
        });
        doc.save(`reporte_${usuarioInfo.usuario}.pdf`);
    }

    function descargarPDFGeneral() { 
        alert("PDF General en construcción");
    }

    filtroCiudad.addEventListener('change', renderizarListaUsuarios);
    filtroMateria.addEventListener('change', renderizarListaUsuarios);
    filtroNombre.addEventListener('input', renderizarListaUsuarios);
    descargarGeneralBtn.addEventListener('click', descargarCSVGeneral);
    descargarPdfBtn.addEventListener('click', descargarPDFGeneral);

    cargarDatosIniciales();
});
