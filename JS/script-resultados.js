// JS/script-resultados.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://tgkbsaazxgnpllcwtbuk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRna2JzYWF6eGducGxsY3d0YnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzk0OTUsImV4cCI6MjA3Nzc1NTQ5NX0.877IdYJdJSczFaqCsz2P-w5uzAZvS7E6DzWTcwyT4IQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Inicializa jsPDF (global)
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', () => {
    
    // Referencias DOM
    const filtroCiudad = document.getElementById('filtro-ciudad');
    const filtroMateria = document.getElementById('filtro-materia');
    const filtroNombre = document.getElementById('filtro-nombre');
    const reporteContainer = document.getElementById('reporte-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const descargarGeneralBtn = document.getElementById('descargar-general-csv-btn');
    const descargarPdfBtn = document.getElementById('descargar-pdf-btn'); // Botón PDF General

    let allUsers = [];
    let allAttempts = [];
    let currentFilteredUsers = []; // Almacena los usuarios que se están mostrando
    
    function formatFecha(fechaISO) {
        if (!fechaISO) return 'N/A';
        const fecha = new Date(fechaISO);
        return fecha.toLocaleString('es-EC', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function getClasePuntaje(puntaje) {
        const p = parseFloat(puntaje) || 0;
        if (p >= 700) return 'alto';
        if (p >= 400) return 'medio';
        return 'bajo';
    }
    
    async function cargarDatosIniciales() {
        loadingSpinner.style.display = 'block';
        reporteContainer.innerHTML = '<p class="no-intentos">Cargando datos...</p>';
        
        try {
            const [usuariosRes, intentosRes] = await Promise.all([
                fetch('DATA/usuarios.json').then(res => res.json()),
                supabase.from('resultados').select('*')
            ]);

            allUsers = usuariosRes.filter(u => !u._comment && u.rol === 'aspirante');
            
            if (intentosRes.error) throw intentosRes.error;
            allAttempts = intentosRes.data;

            renderizarListaUsuarios();

        } catch (error) {
            console.error("Error al cargar datos iniciales:", error);
            reporteContainer.innerHTML = `<p class="no-intentos" style="color: red;">Error al cargar: ${error.message}</p>`;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    function renderizarListaUsuarios() {
        const ciudad = filtroCiudad.value;
        const materia = filtroMateria.value;
        const nombreSearch = filtroNombre.value.toLowerCase();
        
        currentFilteredUsers = allUsers.filter(user => { // Guarda los usuarios filtrados
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
                a.usuario_id === user.usuario &&
                (materia === 'Todas' || a.materia === materia)
            );
            const totalIntentos = intentosUsuarioFiltrados.length;
            
            if (materia !== 'Todas' && totalIntentos === 0) {
                return;
            }

            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            // (MODIFICADO) Añadido botón .user-pdf-btn
            userCard.innerHTML = `
                <div class="user-header" data-userid="${user.usuario}">
                    <div class="user-info">
                        <i class="fas fa-user-circle user-icon"></i>
                        <div>
                            <h3>${user.nombre}</h3>
                            <span class="user-ciudad">${user.ciudad}</span>
                        </div>
                    </div>
                    <div class="user-actions">
                        <span class="user-total-intentos">${totalIntentos} Intento(s)</span>
                        <button class="user-pdf-btn" data-userid="${user.usuario}" title="Descargar PDF de este usuario">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                        <button class="user-csv-btn" data-userid="${user.usuario}" title="Descargar CSV de este usuario">
                            <i class="fas fa-download"></i> CSV
                        </button>
                        <i class="fas fa-chevron-down user-toggle-icon"></i>
                    </div>
                </div>
                <div class="user-attempts-container">
                    </div>
            `;
            reporteContainer.appendChild(userCard);
        });
        
        if (reporteContainer.innerHTML === '') {
             reporteContainer.innerHTML = '<p class="no-intentos">No se encontraron aspirantes con esos filtros.</p>';
        }

        // Añadir Listeners a los elementos recién creados
        reporteContainer.querySelectorAll('.user-header').forEach(header => {
            header.addEventListener('click', toggleUserAttempts);
        });
        reporteContainer.querySelectorAll('.user-csv-btn').forEach(btn => {
            btn.addEventListener('click', descargarCSVUsuario);
        });
        // (NUEVO) Listener para el botón PDF individual
        reporteContainer.querySelectorAll('.user-pdf-btn').forEach(btn => {
            btn.addEventListener('click', descargarPDFUsuario);
        });
    }

    function toggleUserAttempts(event) {
        const header = event.currentTarget;
        const userCard = header.closest('.user-card');
        const attemptsContainer = userCard.querySelector('.user-attempts-container');
        const userId = header.dataset.userid;

        // (MODIFICADO) Si se hizo clic en CUALQUIER botón de descarga, no hagas nada
        if (event.target.closest('.user-csv-btn') || event.target.closest('.user-pdf-btn')) {
            return;
        }

        if (userCard.classList.contains('open')) {
            userCard.classList.remove('open');
            attemptsContainer.style.display = 'none';
        } else {
            userCard.classList.add('open');
            attemptsContainer.style.display = 'block';
            if (attemptsContainer.innerHTML.trim() === '') {
                buildAttemptDetails(attemptsContainer, userId);
            }
        }
    }

    // (CORREGIDO) Vuelve a agrupar por materia para arreglar el diseño
    function buildAttemptDetails(container, userId) {
        const materiaFiltro = filtroMateria.value;

        const intentosUsuario = allAttempts.filter(a => a.usuario_id === userId);
        const intentosFiltrados = intentosUsuario.filter(a => 
            materiaFiltro === 'Todas' || a.materia === materiaFiltro
        );

        if (intentosFiltrados.length === 0) {
            container.innerHTML = '<p class="no-intentos" style="padding: 10px 0;">No tiene intentos registrados (según los filtros actuales).</p>';
            return;
        }

        // Agrupar por materia
        const intentosAgrupados = {};
        intentosFiltrados.forEach(intento => {
            if (!intentosAgrupados[intento.materia]) {
                intentosAgrupados[intento.materia] = [];
            }
            intentosAgrupados[intento.materia].push(intento);
        });

        let html = '';
        const materiasOrdenadas = Object.keys(intentosAgrupados).sort();
        
        for (const materia of materiasOrdenadas) {
            // Fila de Título de Materia
            html += `<div class="materia-group"><h4>${materia} (${intentosAgrupados[materia].length} intentos)</h4>`;
            // Tabla para esta materia
            html += '<table class="intentos-tabla"><thead><tr><th class="col-puntaje">Puntaje</th><th class="col-fecha">Fecha y Hora</th></tr></thead><tbody>';
            
            // Ordenar intentos por fecha (más nuevos primero)
            intentosAgrupados[materia].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            // Filas de Intentos
            intentosAgrupados[materia].forEach(intento => {
                const clasePuntaje = getClasePuntaje(intento.puntaje);
                const puntajeTotal = 1000;
                html += `
                    <tr>
                        <td class="col-puntaje puntaje ${clasePuntaje}">${intento.puntaje} / ${puntajeTotal}</td>
                        <td class="col-fecha">${formatFecha(intento.created_at)}</td>
                    </tr>
                `;
            });
            html += '</tbody></table></div>';
        }
        container.innerHTML = html;
    }

    // --- Lógica de Descarga CSV ---

    function generarYDescargarCSV(data, filename) {
        // Usa punto y coma como separador para que Excel lo abra bien
        let csvContenido = data.map(filaArray => 
            filaArray.map(cell => `"${String(cell).replace(/"/g, '""')}"`)
        ).map(filaArray => filaArray.join(";")).join("\r\n");
        
        const bom = "\uFEFF";
        const csvBlob = new Blob([bom + csvContenido], { type: "text/csv;charset=utf-8;" });
        
        const link = document.createElement("a");
        const url = URL.createObjectURL(csvBlob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function descargarCSVUsuario(event) {
        event.stopPropagation();
        const userId = event.currentTarget.dataset.userid;
        const usuarioInfo = allUsers.find(u => u.usuario === userId);
        
        const intentosUsuario = allAttempts.filter(a => 
            a.usuario_id === userId &&
            (filtroMateria.value === 'Todas' || a.materia === filtroMateria.value)
        );

        if (intentosUsuario.length === 0) {
            alert(`El usuario ${usuarioInfo.nombre} no tiene intentos para descargar (según los filtros actuales).`);
            return;
        }
        
        const data = [
            ["Reporte Individual de Aspirante"],
            ["Nombre:", usuarioInfo.nombre],
            ["Usuario (ID):", usuarioInfo.usuario],
            ["Ciudad:", usuarioInfo.ciudad],
            [],
            ["Materia", "Puntaje", "Total", "Fecha y Hora"]
        ];

        intentosUsuario.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        intentosUsuario.forEach(intento => {
            const puntajeTotal = 1000;
            data.push([
                intento.materia,
                intento.puntaje,
                puntajeTotal,
                formatFecha(intento.created_at)
            ]);
        });
        
        generarYDescargarCSV(data, `reporte_csv_${usuarioInfo.usuario}.csv`);
    }

    function descargarCSVGeneral() {
        const ciudad = filtroCiudad.value;
        const materia = filtroMateria.value;
        const nombreSearch = filtroNombre.value.toLowerCase();
        
        const intentosFiltrados = allAttempts.filter(attempt => {
            const usuarioInfo = allUsers.find(u => u.usuario === attempt.usuario_id);
            if (!usuarioInfo) return false;
            const matchCiudad = (ciudad === 'Todos' || usuarioInfo.ciudad === ciudad);
            const matchMateria = (materia === 'Todas' || attempt.materia === materia);
            const matchNombre = usuarioInfo.nombre.toLowerCase().includes(nombreSearch);
            return matchCiudad && matchMateria && matchNombre;
        });
        
        if (intentosFiltrados.length === 0) {
            alert("No hay resultados para descargar (según los filtros actuales).");
            return;
        }

        const data = [
            ["Reporte General de Aspirantes"],
            ["Filtro Ciudad:", ciudad],
            ["Filtro Materia:", materia],
            ["Filtro Nombre:", nombreSearch || "Todos"],
            [],
            ["Nombre", "Usuario (ID)", "Ciudad", "Materia", "Puntaje", "Total", "Fecha y Hora"]
        ];

        intentosFiltrados.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        intentosFiltrados.forEach(intento => {
            const usuarioInfo = allUsers.find(u => u.usuario === intento.usuario_id);
            const nombre = usuarioInfo ? usuarioInfo.nombre : intento.usuario_nombre;
            const ciudadUsuario = usuarioInfo ? usuarioInfo.ciudad : 'N/A';
            const puntajeTotal = 1000;
            
            data.push([
                nombre,
                intento.usuario_id,
                ciudadUsuario,
                intento.materia,
                intento.puntaje,
                puntajeTotal,
                formatFecha(intento.created_at)
            ]);
        });
        generarYDescargarCSV(data, `reporte_general_sparta.csv`);
    }

    // --- (NUEVO) Lógica de Descarga PDF Individual ---
    function descargarPDFUsuario(event) {
        event.stopPropagation(); // Evita que se abra/cierre el acordeón
        const userId = event.currentTarget.dataset.userid;
        const usuarioInfo = allUsers.find(u => u.usuario === userId);

        const intentosUsuario = allAttempts.filter(a => 
            a.usuario_id === userId &&
            (filtroMateria.value === 'Todas' || a.materia === filtroMateria.value)
        );

        if (intentosUsuario.length === 0) {
            alert(`El usuario ${usuarioInfo.nombre} no tiene intentos para descargar (según los filtros actuales).`);
            return;
        }

        // --- Creación del PDF ---
        const doc = new jsPDF();
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(`Reporte de Aspirante`, 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`Nombre: ${usuarioInfo.nombre}`, 14, 30);
        doc.text(`Usuario (ID): ${usuarioInfo.usuario}`, 14, 36);
        doc.text(`Ciudad: ${usuarioInfo.ciudad}`, 14, 42);

        const intentosAgrupados = {};
        intentosUsuario.forEach(intento => {
            if (!intentosAgrupados[intento.materia]) {
                intentosAgrupados[intento.materia] = [];
            }
            intentosAgrupados[intento.materia].push(intento);
        });

        let startY = 50;
        const head = [['#', 'Puntaje', 'Total', 'Fecha y Hora']];
        const materiasOrdenadas = Object.keys(intentosAgrupados).sort();

        for (const materia of materiasOrdenadas) {
            // Evita que la tabla se corte mal si está muy cerca del final
            if (startY > 250) { 
                doc.addPage();
                startY = 22;
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(`${materia} (${intentosAgrupados[materia].length} intentos)`, 14, startY);
            startY += 7;

            const body = intentosAgrupados[materia]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((intento, index) => [
                    index + 1,
                    intento.puntaje,
                    1000,
                    formatFecha(intento.created_at)
                ]);

            doc.autoTable({
                startY: startY,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [44, 44, 44] }
            });
            
            startY = doc.autoTable.previous.finalY + 15;
        }

        // (MODIFICADO) Corregido el nombre del archivo
        doc.save(`reporte_pdf_${usuarioInfo.usuario}.pdf`);
    }
    
    // --- Lógica de Descarga PDF General ---
    function descargarPDFGeneral() {
        const ciudad = filtroCiudad.value;
        const materiaFiltro = filtroMateria.value;

        if (currentFilteredUsers.length === 0) {
            alert("No hay aspirantes para generar un PDF (según los filtros actuales).");
            return;
        }

        const doc = new jsPDF();
        let firstPage = true;

        currentFilteredUsers.forEach(user => {
            const intentosUsuario = allAttempts.filter(a => 
                a.usuario_id === user.usuario &&
                (materiaFiltro === 'Todas' || a.materia === materiaFiltro)
            );

            if (materiaFiltro !== 'Todas' && intentosUsuario.length === 0) {
                return;
            }

            if (!firstPage) {
                doc.addPage();
            }
            firstPage = false;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(`Reporte de Aspirante`, 14, 22);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text(`Nombre: ${user.nombre}`, 14, 30);
            doc.text(`Usuario (ID): ${user.usuario}`, 14, 36);
            doc.text(`Ciudad: ${user.ciudad}`, 14, 42);

            const intentosAgrupados = {};
            intentosUsuario.forEach(intento => {
                if (!intentosAgrupados[intento.materia]) {
                    intentosAgrupados[intento.materia] = [];
                }
                intentosAgrupados[intento.materia].push(intento);
            });

            const head = [['#', 'Puntaje', 'Total', 'Fecha y Hora']];
            let startY = 50;

            if (intentosUsuario.length === 0) {
                 doc.text("Este aspirante no tiene intentos registrados (según los filtros).", 14, 50);
            }

            const materiasOrdenadas = Object.keys(intentosAgrupados).sort();
            for (const materia of materiasOrdenadas) {
                 if (startY > 250) { // Evita cortes
                    doc.addPage();
                    startY = 22;
                }
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text(`${materia} (${intentosAgrupados[materia].length} intentos)`, 14, startY);
                startY += 7;

                const body = intentosAgrupados[materia]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .map((intento, index) => [
                        index + 1,
                        intento.puntaje,
                        1000,
                        formatFecha(intento.created_at)
                    ]);

                doc.autoTable({
                    startY: startY,
                    head: head,
                    body: body,
                    theme: 'grid',
                    headStyles: { fillColor: [44, 44, 44] }
                });
                
                startY = doc.autoTable.previous.finalY + 15;
            }
        });

        doc.save(`reporte_pdf_${ciudad}_${materiaFiltro}.pdf`);
    }


    // --- Listeners de Filtros ---
    filtroCiudad.addEventListener('change', renderizarListaUsuarios);
    filtroMateria.addEventListener('change', renderizarListaUsuarios);
    filtroNombre.addEventListener('input', renderizarListaUsuarios);
    descargarGeneralBtn.addEventListener('click', descargarCSVGeneral);
    descargarPdfBtn.addEventListener('click', descargarPDFGeneral);

    // --- Kickoff ---
    cargarDatosIniciales();
});
