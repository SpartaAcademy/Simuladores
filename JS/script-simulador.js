// JS/script-simulador.js

// Inicializar Supabase
const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = createClient(supabaseUrl, supabaseKey);


document.addEventListener('DOMContentLoaded', () => {

    // REFERENCIAS DOM
    const lobbyContainer = document.getElementById('lobby-container');
    const simuladorContainer = document.getElementById('simulador-container');
    const resultadosContainer = document.getElementById('resultados-container');
    
    // Elementos de texto
    const tituloMateria = document.getElementById('titulo-materia'); // Header
    const lobbyMateria = document.getElementById('lobby-materia');   // Lobby
    const lobbyPreguntasDisplay = document.getElementById('lobby-preguntas');
    const lobbyTiempoDisplay = document.getElementById('lobby-tiempo');
    
    const comenzarBtn = document.getElementById('comenzar-btn');
    const cronometroDisplay = document.getElementById('cronometro');
    const preguntaNumero = document.getElementById('pregunta-numero');
    const preguntaTexto = document.getElementById('pregunta-texto');
    const opcionesContainer = document.getElementById('opciones-container');
    const navegadorPreguntas = document.getElementById('navegador-preguntas');
    
    // Botones acción
    const siguienteBtn = document.getElementById('siguiente-btn');
    const terminarIntentoBtn = document.getElementById('terminar-intento-btn');
    const reiniciarBtn = document.getElementById('reiniciar-btn');
    const retryBtn = document.getElementById('retry-btn');

    // Resultados
    const puntajeFinalDisplay = document.getElementById('puntaje-final');
    const statsCorrectas = document.getElementById('stats-correctas');
    const statsIncorrectas = document.getElementById('stats-incorrectas');
    const statsEnBlanco = document.getElementById('stats-en-blanco');
    const revisionContainer = document.getElementById('revision-container');

    // Modales
    const modalOverlay = document.getElementById('modal-overlay');
    const modalMensaje = document.getElementById('modal-mensaje');
    const errorModal = document.getElementById('error-modal');
    const errorText = document.getElementById('error-text');

    // Variables de Estado
    let preguntasPorMateria = {};
    let preguntasQuiz = [];
    let respuestasUsuario = [];
    let indicePreguntaActual = 0;
    let cronometroInterval;
    let tiempoRestanteSeg;
    let TOTAL_PREGUNTAS_QUIZ = 50;

    // NOMBRES PARA EL TÍTULO (Deben coincidir con tu ?materia=...)
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

    // Listas para los modos "General"
    const ordenGeneralPolicia = ['sociales', 'matematicas', 'lengua', 'ingles'];
    const ordenGeneralEsmil = ['sociales_esmil', 'matematicas_esmil', 'lengua_esmil', 'ingles_esmil'];

    // --- FUNCIÓN DE ERROR ---
    function showError(msg) {
        console.error(msg);
        if (errorText && errorModal) {
            errorText.innerHTML = msg;
            errorModal.style.display = 'flex';
        } else {
            alert(msg);
        }
        if(comenzarBtn) {
            comenzarBtn.textContent = "Error de Archivos";
            comenzarBtn.style.background = "#d32f2f";
        }
    }
    
    // --- INICIALIZAR ---
    function inicializar() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia') || 'sociales';
        
        let nombreMateria = materias[materiaKey];
        if (!nombreMateria) {
            // Fallback si no está en la lista pero es PPNN
            if (materiaKey.startsWith('ppnn')) {
                nombreMateria = `Cuestionario ${materiaKey.replace('ppnn', '')} PPNN`;
            } else {
                nombreMateria = 'Materia Desconocida';
            }
        }

        // Poner Títulos
        if(tituloMateria) tituloMateria.textContent = `SIMULADOR DE: ${nombreMateria.toUpperCase()}`;
        if(lobbyMateria) lobbyMateria.textContent = nombreMateria;

        // Reset Vistas
        if(lobbyContainer) lobbyContainer.style.display = 'block';
        if(simuladorContainer) simuladorContainer.style.display = 'none';
        if(resultadosContainer) resultadosContainer.style.display = 'none';

        // Configurar Tiempos
        let quizDurationSeconds = 3600; // 60 min

        if (materiaKey.startsWith('ppnn')) {
            quizDurationSeconds = 3600;
        } else if (materiaKey.includes('matematicas')) {
            quizDurationSeconds = 5400; // 90 min
        } else if (materiaKey.includes('general')) {
            quizDurationSeconds = 10800; // 3 horas
            TOTAL_PREGUNTAS_QUIZ = 200;
        }

        tiempoRestanteSeg = quizDurationSeconds;
        
        if(lobbyTiempoDisplay) 
            lobbyTiempoDisplay.textContent = Math.floor(quizDurationSeconds/60) + " Minutos";
        if(lobbyPreguntasDisplay) 
            lobbyPreguntasDisplay.textContent = TOTAL_PREGUNTAS_QUIZ;

        comenzarBtn.disabled = true;
        comenzarBtn.textContent = 'Cargando recursos...';

        // INICIAR CARGA DE JSON
        cargarPreguntas(materiaKey);

        // Listeners Botones
        if(siguienteBtn) siguienteBtn.addEventListener('click', irPreguntaSiguiente);
        if(terminarIntentoBtn) terminarIntentoBtn.addEventListener('click', confirmarTerminarIntento);
        if(reiniciarBtn) reiniciarBtn.addEventListener('click', () => location.href='index.html');
        if(retryBtn) retryBtn.addEventListener('click', () => location.reload());
        
        // Listeners Modales
        const btnCancel = document.getElementById('cancelar-modal-btn');
        const btnConfirm = document.getElementById('confirmar-modal-btn');
        const btnCloseErr = document.querySelector('.btn-close-modal');

        if(btnCancel) btnCancel.addEventListener('click', () => modalOverlay.style.display='none');
        if(btnConfirm) btnConfirm.addEventListener('click', () => { modalOverlay.style.display='none'; finalizarIntento(); });
        if(btnCloseErr) btnCloseErr.addEventListener('click', () => errorModal.style.display='none');
    }

    // --- CARGA DE DATOS ---
    async function cargarPreguntas(materia) {
        preguntasPorMateria = {};
        let materiasACargar = [];

        // Determinar qué archivos cargar
        if (materia === 'general') materiasACargar = ordenGeneralPolicia;
        else if (materia === 'general_esmil') materiasACargar = ordenGeneralEsmil;
        else materiasACargar = [materia];

        try {
            const promesas = materiasACargar.map(m =>
                // AQUÍ ESTÁ LA CORRECCIÓN: Busca en DATA/preguntas_X.json
                fetch(`DATA/preguntas_${m}.json`)
                    .then(res => {
                        if (!res.ok) throw new Error(`No se encontró: <b>DATA/preguntas_${m}.json</b>`);
                        return res.json();
                    })
            );

            const resultados = await Promise.all(promesas);
            
            // Unir todas las preguntas cargadas
            let todas = [];
            resultados.forEach(data => todas = todas.concat(data));

            // Ajuste especial para PPNN (usar todas las que vengan)
            if(materia.startsWith('ppnn')) {
                TOTAL_PREGUNTAS_QUIZ = todas.length;
                if(lobbyPreguntasDisplay) lobbyPreguntasDisplay.textContent = TOTAL_PREGUNTAS_QUIZ;
            }

            // Guardar en memoria
            preguntasPorMateria[materia] = todas;
            
            // Activar botón
            comenzarBtn.disabled = false;
            comenzarBtn.textContent = 'COMENZAR INTENTO';
            comenzarBtn.onclick = () => iniciarIntento(materia);

        } catch (error) {
            showError(error.message);
        }
    }

    function iniciarIntento(materiaKey) {
        let pool = preguntasPorMateria[materiaKey];
        
        if (!pool || pool.length === 0) {
            showError("El archivo de preguntas está vacío.");
            return;
        }

        // Selección de preguntas
        if(materiaKey.startsWith('ppnn')) {
            preguntasQuiz = pool.sort(() => 0.5 - Math.random()); // Todas
        } else if (materiaKey.includes('general')) {
            // En modo general, tomamos un mix aleatorio hasta completar 200
            preguntasQuiz = pool.sort(() => 0.5 - Math.random()).slice(0, TOTAL_PREGUNTAS_QUIZ);
        } else {
            // Modo normal: 50 preguntas
            preguntasQuiz = pool.sort(() => 0.5 - Math.random()).slice(0, 50);
        }
        
        respuestasUsuario = new Array(preguntasQuiz.length).fill(null);
        
        // Cambiar pantalla
        lobbyContainer.style.display = 'none';
        simuladorContainer.style.display = 'flex'; // O 'grid' segun tu CSS, 'flex' es seguro
        
        construirNavegador();
        mostrarPregunta(0);
        iniciarCronometro();
    }

    function mostrarPregunta(idx) {
        indicePreguntaActual = idx;
        const q = preguntasQuiz[idx];
        
        preguntaNumero.textContent = `Pregunta ${idx + 1}`;
        
        // Manejo seguro de imagen
        let imgHtml = '';
        if(q.imagen) {
            imgHtml = `<img src="${q.imagen}" onerror="this.style.display='none'" class="pregunta-imagen">`;
        }
        
        preguntaTexto.innerHTML = `<span>${q.pregunta}</span>${imgHtml}`;
        
        opcionesContainer.innerHTML = '';
        q.opciones.forEach(op => {
            const btn = document.createElement('button');
            btn.className = 'opcion-btn'; // Asegúrate que tu CSS tenga esta clase
            if(respuestasUsuario[idx] === op) btn.classList.add('selected');
            
            btn.textContent = op;
            btn.onclick = () => {
                respuestasUsuario[idx] = op;
                // Marcar navegador
                const navBtn = document.querySelectorAll('.nav-btn')[idx]; // Asumiendo clase nav-btn
                if(navBtn) navBtn.style.background = "#2196f3"; 
                if(navBtn) navBtn.style.color = "#fff";
                mostrarPregunta(idx); // Refrescar para ver selección
            };
            opcionesContainer.appendChild(btn);
        });
    }

    function construirNavegador() {
        navegadorPreguntas.innerHTML = '';
        preguntasQuiz.forEach((_, i) => {
            const btn = document.createElement('button');
            // Usamos estilos inline básicos por si falta CSS, pero idealmente usa clases
            btn.className = 'nav-btn'; 
            btn.style.width = "35px";
            btn.style.height = "35px";
            btn.style.margin = "2px";
            btn.style.cursor = "pointer";
            btn.textContent = i + 1;
            btn.onclick = () => mostrarPregunta(i);
            navegadorPreguntas.appendChild(btn);
        });
    }

    function irPreguntaSiguiente() {
        if(indicePreguntaActual < preguntasQuiz.length - 1) mostrarPregunta(indicePreguntaActual + 1);
    }

    function confirmarTerminarIntento() {
        if(modalMensaje) modalMensaje.textContent = "¿Estás seguro de terminar?";
        if(modalOverlay) modalOverlay.style.display = 'flex';
    }

    function iniciarCronometro() {
        cronometroInterval = setInterval(() => {
            tiempoRestanteSeg--;
            const m = Math.floor(tiempoRestanteSeg / 60);
            const s = tiempoRestanteSeg % 60;
            if(cronometroDisplay) cronometroDisplay.textContent = `${m}:${s < 10 ? '0'+s : s}`;
            if(tiempoRestanteSeg <= 0) finalizarIntento();
        }, 1000);
    }

    async function finalizarIntento() {
        clearInterval(cronometroInterval);
        simuladorContainer.style.display = 'none';
        resultadosContainer.style.display = 'block';

        let correctas = 0;
        let incorrectas = 0;
        let enBlanco = 0;

        preguntasQuiz.forEach((q, i) => { 
            if(respuestasUsuario[i] === q.respuesta) correctas++;
            else if(respuestasUsuario[i] === null) enBlanco++;
            else incorrectas++;
        });
        
        // Puntaje sobre 1000
        const score = Math.round((correctas * 1000) / preguntasQuiz.length);
        
        if(puntajeFinalDisplay) puntajeFinalDisplay.textContent = score;
        if(statsCorrectas) statsCorrectas.textContent = correctas;
        if(statsIncorrectas) statsIncorrectas.textContent = incorrectas;
        if(statsEnBlanco) statsEnBlanco.textContent = enBlanco;

        // Mostrar Revisión (Feedback)
        if(revisionContainer) {
            revisionContainer.innerHTML = '';
            preguntasQuiz.forEach((q, i) => {
                const div = document.createElement('div');
                div.className = 'revision-item';
                div.style.borderBottom = "1px solid #eee";
                div.style.padding = "10px";
                div.style.textAlign = "left";
                
                const esCorrecta = respuestasUsuario[i] === q.respuesta;
                const color = esCorrecta ? 'green' : 'red';
                
                div.innerHTML = `
                    <p><strong>${i+1}. ${q.pregunta}</strong></p>
                    <p>Tu respuesta: <span style="color:${color}">${respuestasUsuario[i] || 'En blanco'}</span></p>
                    ${!esCorrecta ? `<p>Correcta: <strong>${q.respuesta}</strong></p>` : ''}
                `;
                revisionContainer.appendChild(div);
            });
        }

        // GUARDAR EN BASE DE DATOS
        const userStr = sessionStorage.getItem('userInfo'); // Tu auth.js guarda esto
        if(userStr) {
            const user = JSON.parse(userStr);
            try {
                // Obtener nombre limpio de materia
                const params = new URLSearchParams(window.location.search);
                const matCode = params.get('materia');
                const matName = materias[matCode] || matCode;

                const { error } = await supabase.from('resultados').insert([{
                    usuario_id: user.usuario,
                    usuario_nombre: user.nombre,
                    materia: matName,
                    puntaje: score,
                    total_preguntas: preguntasQuiz.length,
                    ciudad: user.ciudad
                }]);
                
                if(error) throw error;
                console.log("Resultado guardado en la nube.");
            } catch(e) {
                showError("No se pudo guardar tu nota en la base de datos: " + e.message);
            }
        }
    }

    // Arranque
    inicializar();
});
