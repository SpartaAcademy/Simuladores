// JS/script-simulador.js

// Inicializar Supabase
const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = createClient(supabaseUrl, supabaseKey);


document.addEventListener('DOMContentLoaded', () => {

    // Referencias
    const lobbyContainer = document.getElementById('lobby-container');
    const simuladorContainer = document.getElementById('simulador-container');
    const resultadosContainer = document.getElementById('resultados-container');
    const tituloMateria = document.getElementById('titulo-materia');
    const lobbyMateria = document.getElementById('lobby-materia');
    const lobbyPreguntasDisplay = document.getElementById('lobby-preguntas');
    const comenzarBtn = document.getElementById('comenzar-btn');
    const cronometroDisplay = document.getElementById('cronometro');
    const preguntaNumero = document.getElementById('pregunta-numero');
    const preguntaTexto = document.getElementById('pregunta-texto');
    const opcionesContainer = document.getElementById('opciones-container');
    const navegadorPreguntas = document.getElementById('navegador-preguntas');
    const siguienteBtn = document.getElementById('siguiente-btn');
    const terminarIntentoBtn = document.getElementById('terminar-intento-btn');
    
    // Resultados
    const puntajeFinalDisplay = document.getElementById('puntaje-final');
    const statsCorrectas = document.getElementById('stats-correctas');
    const statsIncorrectas = document.getElementById('stats-incorrectas');
    const statsEnBlanco = document.getElementById('stats-en-blanco');
    const revisionContainer = document.getElementById('revision-container');
    
    // Botones extra
    const reiniciarBtn = document.getElementById('reiniciar-btn');
    const retryBtn = document.getElementById('retry-btn');
    
    // Modales
    const modalOverlay = document.getElementById('modal-overlay');
    const modalError = document.getElementById('modal-error');
    const errorMsg = document.getElementById('mensaje-error');

    let preguntasPorMateria = {};
    let preguntasQuiz = [];
    let respuestasUsuario = [];
    let indicePreguntaActual = 0;
    let cronometroInterval;
    let tiempoRestanteSeg;
    let TOTAL_PREGUNTAS_QUIZ = 50;

    // LISTA MAESTRA DE TÍTULOS
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

    // Arrays para los modos generales (Nombres de archivo base)
    const ordenGeneralPolicia = ['sociales', 'matematicas', 'lengua', 'ingles'];
    const ordenGeneralEsmil = ['sociales_esmil', 'matematicas_esmil', 'lengua_esmil', 'ingles_esmil'];

    // --- FUNCIÓN MOSTRAR ERROR ---
    function mostrarError(texto) {
        if(errorMsg && modalError) {
            errorMsg.innerHTML = texto;
            modalError.style.display = 'flex';
        } else {
            alert(texto);
        }
        comenzarBtn.textContent = "Error de Carga";
        comenzarBtn.style.backgroundColor = "#d32f2f";
    }

    // --- INICIALIZAR ---
    function inicializar() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia') || 'sociales';
        
        let nombreMateria = materias[materiaKey];
        if (!nombreMateria) {
            if (materiaKey.startsWith('ppnn')) nombreMateria = `Cuestionario ${materiaKey.replace('ppnn', '')} PPNN`;
            else nombreMateria = 'Materia Desconocida';
        }

        // Configurar Títulos
        if(tituloMateria) tituloMateria.textContent = `SIMULADOR DE: ${nombreMateria.toUpperCase()}`;
        if(lobbyMateria) lobbyMateria.textContent = nombreMateria;

        // Reset Visibilidad
        if(lobbyContainer) lobbyContainer.style.display = 'block';
        if(simuladorContainer) simuladorContainer.style.display = 'none';
        if(resultadosContainer) resultadosContainer.style.display = 'none';

        let quizDurationSeconds = 3600; // 1 hora base

        // Configuración específica por materia
        if (materiaKey.startsWith('ppnn')) {
            // Instrucciones especiales PPNN
            const extra = document.getElementById('instrucciones-extra');
            if(extra) extra.innerHTML = '<p style="color:#b22222; font-weight:bold;">¡Responda con rapidez!</p>';
        } else if (materiaKey.includes('matematicas')) {
            quizDurationSeconds = 5400; // 90 min
        } else if (materiaKey.includes('general')) {
            quizDurationSeconds = 10800; // 3 horas
            TOTAL_PREGUNTAS_QUIZ = 200;
        }

        tiempoRestanteSeg = quizDurationSeconds;
        const timeDisplay = document.getElementById('lobby-tiempo');
        if(timeDisplay) timeDisplay.textContent = Math.floor(quizDurationSeconds/60) + " Minutos";
        if(lobbyPreguntasDisplay) lobbyPreguntasDisplay.textContent = TOTAL_PREGUNTAS_QUIZ;

        // Cargar datos
        comenzarBtn.disabled = true;
        comenzarBtn.textContent = 'Cargando recursos...';
        cargarPreguntas(materiaKey);

        // Listeners
        if(siguienteBtn) siguienteBtn.addEventListener('click', irPreguntaSiguiente);
        if(terminarIntentoBtn) terminarIntentoBtn.addEventListener('click', confirmarTerminarIntento);
        if(reiniciarBtn) reiniciarBtn.addEventListener('click', () => location.href='index.html');
        if(retryBtn) retryBtn.addEventListener('click', () => location.reload());
        
        // Modal Confirmación
        const btnCancel = document.getElementById('cancelar-modal-btn');
        const btnConfirm = document.getElementById('confirmar-modal-btn');
        if(btnCancel) btnCancel.addEventListener('click', () => modalOverlay.style.display='none');
        if(btnConfirm) btnConfirm.addEventListener('click', () => { modalOverlay.style.display='none'; finalizarIntento(); });
    }

    // --- CARGAR PREGUNTAS ---
    async function cargarPreguntas(materia) {
        let materiasACargar = [];

        if (materia === 'general') {
            materiasACargar = ordenGeneralPolicia;
        } else if (materia === 'general_esmil') {
            materiasACargar = ordenGeneralEsmil;
        } else {
            materiasACargar = [materia];
        }

        try {
            const promesas = materiasACargar.map(m =>
                // AQUÍ ESTÁ LA CLAVE: Busca en DATA/preguntas_NOMBRE.json (Tu estructura real)
                fetch(`DATA/preguntas_${m}.json`)
                    .then(res => {
                        if (!res.ok) throw new Error(`No se encontró el archivo: <b>DATA/preguntas_${m}.json</b>`);
                        return res.json();
                    })
            );

            const resultados = await Promise.all(promesas);
            
            let todas = [];
            resultados.forEach(data => todas = todas.concat(data));

            // Si es PPNN, actualizar total
            if(materia.startsWith('ppnn')) {
                TOTAL_PREGUNTAS_QUIZ = todas.length;
                if(lobbyPreguntasDisplay) lobbyPreguntasDisplay.textContent = TOTAL_PREGUNTAS_QUIZ;
            }

            preguntasPorMateria[materia] = todas;
            
            // Habilitar botón
            comenzarBtn.disabled = false;
            comenzarBtn.textContent = 'COMENZAR INTENTO';
            comenzarBtn.onclick = () => iniciarIntento(materia);

        } catch (error) {
            mostrarError(error.message);
        }
    }

    function iniciarIntento(materiaKey) {
        let pool = preguntasPorMateria[materiaKey];
        
        if (!pool || pool.length === 0) {
            mostrarError("El archivo JSON está vacío.");
            return;
        }

        if(materiaKey.startsWith('ppnn')) {
            preguntasQuiz = pool.sort(() => 0.5 - Math.random()); // Todas
        } else if (materiaKey.includes('general')) {
            preguntasQuiz = pool.sort(() => 0.5 - Math.random()).slice(0, TOTAL_PREGUNTAS_QUIZ);
        } else {
            preguntasQuiz = pool.sort(() => 0.5 - Math.random()).slice(0, 50);
        }
        
        respuestasUsuario = new Array(preguntasQuiz.length).fill(null);
        
        lobbyContainer.style.display = 'none';
        simuladorContainer.style.display = 'flex'; // Importante para CSS flex
        
        construirNavegador();
        mostrarPregunta(0);
        iniciarCronometro();
    }

    function mostrarPregunta(idx) {
        indicePreguntaActual = idx;
        const q = preguntasQuiz[idx];
        preguntaNumero.textContent = `Pregunta ${idx + 1}`;
        
        // Imagen (con manejo de error inline)
        const imgDiv = document.getElementById('imagen-pregunta-container');
        if(q.imagen) {
            imgDiv.innerHTML = `<img src="${q.imagen}" onerror="this.style.display='none'" style="max-width:100%; border-radius:8px; border:1px solid #ccc;">`;
        } else {
            imgDiv.innerHTML = '';
        }
        
        preguntaTexto.innerHTML = q.pregunta;
        
        opcionesContainer.innerHTML = '';
        q.opciones.forEach(op => {
            const btn = document.createElement('button');
            btn.className = 'opcion-btn'; // Clase de tu CSS original
            if(respuestasUsuario[idx] === op) btn.classList.add('selected');
            
            btn.textContent = op;
            btn.onclick = () => {
                respuestasUsuario[idx] = op;
                // Marcar navegador
                const navBtn = document.querySelectorAll('.nav-btn')[idx]; // Asumiendo clase nav-btn
                if(navBtn) navBtn.classList.add('answered');
                mostrarPregunta(idx); // Refrescar
            };
            opcionesContainer.appendChild(btn);
        });
    }

    function construirNavegador() {
        navegadorPreguntas.innerHTML = '';
        preguntasQuiz.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.textContent = i + 1;
            btn.onclick = () => mostrarPregunta(i);
            navegadorPreguntas.appendChild(btn);
        });
    }

    function irPreguntaSiguiente() {
        if(indicePreguntaActual < preguntasQuiz.length - 1) mostrarPregunta(indicePreguntaActual + 1);
    }

    function confirmarTerminarIntento() {
        if(modalMensaje) modalMensaje.textContent = `¿Seguro que quieres terminar? Tienes ${respuestasUsuario.filter(r=>r===null).length} sin responder.`;
        if(modalOverlay) modalOverlay.style.display = 'block'; // Block para overlay original
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
        preguntasQuiz.forEach((q, i) => { if(respuestasUsuario[i] === q.respuesta) correctas++; });
        
        const score = Math.round((correctas * 1000) / preguntasQuiz.length);
        if(puntajeFinalDisplay) puntajeFinalDisplay.textContent = score;
        if(statsCorrectas) statsCorrectas.textContent = correctas;
        if(statsIncorrectas) statsIncorrectas.textContent = preguntasQuiz.length - correctas;
        if(statsEnBlanco) statsEnBlanco.textContent = respuestasUsuario.filter(r=>r===null).length;

        // Feedback
        if(revisionContainer) {
            revisionContainer.innerHTML = '';
            preguntasQuiz.forEach((q, i) => {
                const div = document.createElement('div');
                div.className = 'revision-pregunta'; // Clase de tu CSS
                const esCorrecta = respuestasUsuario[i] === q.respuesta;
                div.innerHTML = `
                    <p><strong>${i+1}. ${q.pregunta}</strong></p>
                    <p>Tu respuesta: <span style="color:${esCorrecta?'green':'red'}">${respuestasUsuario[i] || '---'}</span></p>
                    ${!esCorrecta ? `<p>Correcta: <strong>${q.respuesta}</strong></p>` : ''}
                `;
                revisionContainer.appendChild(div);
            });
        }

        // GUARDAR SUPABASE
        const userStr = sessionStorage.getItem('userInfo'); // Tu auth.js original usa 'userInfo'? o 'sparta_user'?
        // Verificando tu auth.js original... Ah, auth.js no lo pegaste ahora, asumo que usa 'userInfo' por el script viejo
        // Si usa 'sparta_user', cambia abajo. Probamos ambos.
        const user = JSON.parse(sessionStorage.getItem('userInfo') || sessionStorage.getItem('sparta_user')); 
        
        if(user) {
            try {
                const params = new URLSearchParams(window.location.search);
                const title = materias[params.get('materia')] || params.get('materia');

                const { error } = await supabase.from('resultados').insert([{
                    usuario_id: user.usuario,
                    usuario_nombre: user.nombre,
                    materia: title,
                    puntaje: score,
                    total_preguntas: preguntasQuiz.length,
                    ciudad: user.ciudad
                }]);
                
                if(error) throw error;
                console.log("Guardado OK");
            } catch(e) {
                console.error("Error guardando: " + e.message);
                // No mostramos modal de error al final para no molestar, pero logueamos
            }
        }
    }

    inicializar();
});
