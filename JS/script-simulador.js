// JS/script-simulador.js

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERENCIAS A ELEMENTOS DEL DOM ---
    // (Sin cambios aquí, se mantienen las mismas referencias)
    const lobbyContainer = document.getElementById('lobby-container');
    const simuladorContainer = document.getElementById('simulador-container');
    const resultadosContainer = document.getElementById('resultados-container');
    const tituloMateria = document.getElementById('titulo-materia');
    const lobbyMateria = document.getElementById('lobby-materia');
    const lobbyPreguntasDisplay = document.getElementById('lobby-preguntas'); // Referencia al span de preguntas
    const comenzarBtn = document.getElementById('comenzar-btn');
    const cronometroDisplay = document.getElementById('cronometro');
    const preguntaNumero = document.getElementById('pregunta-numero');
    const preguntaTexto = document.getElementById('pregunta-texto');
    const opcionesContainer = document.getElementById('opciones-container');
    const navegadorPreguntas = document.getElementById('navegador-preguntas');
    const siguienteBtn = document.getElementById('siguiente-btn');
    const terminarIntentoBtn = document.getElementById('terminar-intento-btn');
    const puntajeFinalDisplay = document.getElementById('puntaje-final');
    const statsContestadas = document.getElementById('stats-contestadas');
    const statsCorrectas = document.getElementById('stats-correctas');
    const statsIncorrectas = document.getElementById('stats-incorrectas');
    const statsEnBlanco = document.getElementById('stats-en-blanco');
    const revisionContainer = document.getElementById('revision-container');
    const reiniciarBtn = document.getElementById('reiniciar-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalMensaje = document.getElementById('modal-mensaje');
    const cancelarModalBtn = document.getElementById('cancelar-modal-btn');
    const confirmarModalBtn = document.getElementById('confirmar-modal-btn');
    const modalBotones = document.querySelector('.modal-botones');

    // --- 2. VARIABLES GLOBALES DEL SIMULADOR ---
    let preguntasOriginales = [];
    let preguntasQuiz = [];
    let respuestasUsuario = [];
    let indicePreguntaActual = 0;
    let cronometroInterval;
    let tiempoRestanteSeg;
    let TOTAL_PREGUNTAS_QUIZ = 50; // Valor por defecto, se ajustará

    const materias = {
        'sociales': 'Ciencias Sociales',
        'matematicas': 'Matemáticas y Física',
        'lengua': 'Lengua y Literatura',
        'ingles': 'Inglés',
        'general': 'General (Todas)' // (NUEVO)
    };

    // --- 3. INICIALIZACIÓN ---
    function inicializar() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia') || 'sociales';
        const nombreMateria = materias[materiaKey] || 'Desconocida';

        tituloMateria.textContent = `SIMULADOR DE: ${nombreMateria.toUpperCase()}`;
        lobbyMateria.textContent = nombreMateria;

        lobbyContainer.style.display = 'block';
        simuladorContainer.style.display = 'none';
        resultadosContainer.style.display = 'none';

        // --- (MODIFICADO) Ajustes de tiempo y # preguntas según materia ---
        let quizDurationSeconds;
        let lobbyTiempoTexto;

        if (materiaKey === 'matematicas') {
            quizDurationSeconds = 90 * 60; // 90 min
            lobbyTiempoTexto = "1 Hora y 30 Minutos (90 Minutos)";
            TOTAL_PREGUNTAS_QUIZ = 50;
        } else if (materiaKey === 'general') { // (NUEVO)
            quizDurationSeconds = 180 * 60; // 180 min (3 horas)
            lobbyTiempoTexto = "3 Horas (180 Minutos)";
            TOTAL_PREGUNTAS_QUIZ = 200; // 200 preguntas
        } else {
            quizDurationSeconds = 60 * 60; // 60 min
            lobbyTiempoTexto = "1 Hora (60 Minutos)";
            TOTAL_PREGUNTAS_QUIZ = 50;
        }

        tiempoRestanteSeg = quizDurationSeconds;

        const lobbyTiempoDisplay = document.getElementById('lobby-tiempo');
        if (lobbyTiempoDisplay) lobbyTiempoDisplay.textContent = lobbyTiempoTexto;
        if (lobbyPreguntasDisplay) lobbyPreguntasDisplay.textContent = TOTAL_PREGUNTAS_QUIZ; // Actualiza # preguntas
        // --- Fin Modificación ---

        cargarPreguntas(materiaKey); // Llamar DESPUÉS de setear variables

        // Listeners
        comenzarBtn.addEventListener('click', iniciarIntento);
        siguienteBtn.addEventListener('click', irPreguntaSiguiente);
        terminarIntentoBtn.addEventListener('click', confirmarTerminarIntento);
        reiniciarBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
        cancelarModalBtn.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
        confirmarModalBtn.addEventListener('click', () => { modalOverlay.style.display = 'none'; finalizarIntento(false); });
    }

    // --- 4. LÓGICA DE CARGA Y PREPARACIÓN ---
    // (MODIFICADO)
    async function cargarPreguntas(materia) {
        if (materia === 'general') {
            // Cargar todas las materias
            const materiasACargar = ['sociales', 'matematicas', 'lengua', 'ingles'];
            let todasLasPreguntas = [];
            let cargaExitosa = true;

            try {
                // Usamos Promise.all para cargar en paralelo
                const promesas = materiasACargar.map(m => fetch(`DATA/preguntas_${m}.json`).then(res => res.ok ? res.json() : Promise.reject(`Fallo al cargar ${m}`)));
                const resultados = await Promise.all(promesas);

                // Concatenar todas las preguntas
                resultados.forEach(preguntas => {
                    todasLasPreguntas = todasLasPreguntas.concat(preguntas);
                });

                if (todasLasPreguntas.length === 0) {
                    throw new Error("No se cargaron preguntas de ninguna materia.");
                }
                preguntasOriginales = todasLasPreguntas;

            } catch (error) {
                console.error("Error cargando preguntas generales:", error);
                alert(`Error al cargar las preguntas generales. ${error.message || ''}`);
                window.location.href = 'index.html';
                cargaExitosa = false;
            }

        } else {
            // Cargar una sola materia
            const url = `DATA/preguntas_${materia}.json`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('No se encontró archivo.');
                const data = await response.json();
                preguntasOriginales = data;
                if (data.length === 0) { alert(`No hay preguntas para ${materias[materia]}.`); window.location.href = 'index.html'; }
            } catch (error) {
                console.error(error);
                alert(`Error cargando preguntas de ${materias[materia]}.`);
                window.location.href = 'index.html';
            }
        }
    }


    // (MODIFICADO)
    function prepararQuiz() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia') || 'sociales';

        // Barajar todas las preguntas disponibles
        const preguntasBarajadas = [...preguntasOriginales].sort(() => Math.random() - 0.5);

        // Tomar la cantidad correcta según la materia
        preguntasQuiz = preguntasBarajadas.slice(0, TOTAL_PREGUNTAS_QUIZ);

        // Inicializar el array de respuestas del usuario con el tamaño correcto
        respuestasUsuario = new Array(TOTAL_PREGUNTAS_QUIZ).fill(null);
    }

    // --- 5. LÓGICA DEL SIMULADOR ---
    function iniciarIntento() {
        prepararQuiz();
        if (preguntasQuiz.length === 0) { alert("No se cargaron preguntas."); return; }
        lobbyContainer.style.display = 'none';
        simuladorContainer.style.display = 'grid';
        construirNavegador(); // Construye según TOTAL_PREGUNTAS_QUIZ
        mostrarPregunta(0);
        iniciarCronometro();
    }

    function iniciarCronometro() {
        const minutosIni = Math.floor(tiempoRestanteSeg / 60);
        const segundosIni = tiempoRestanteSeg % 60;
        cronometroDisplay.textContent = `${minutosIni.toString().padStart(2, '0')}:${segundosIni.toString().padStart(2, '0')}`;
        clearInterval(cronometroInterval);
        cronometroInterval = setInterval(() => {
            tiempoRestanteSeg--;
            const minutos = Math.floor(tiempoRestanteSeg / 60);
            const segundos = tiempoRestanteSeg % 60;
            cronometroDisplay.textContent = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
            if (tiempoRestanteSeg <= 0) { finalizarIntento(true); }
        }, 1000);
    }

    // (MODIFICADO)
    function construirNavegador() {
        navegadorPreguntas.innerHTML = '';
        // Usa TOTAL_PREGUNTAS_QUIZ
        for (let i = 0; i < TOTAL_PREGUNTAS_QUIZ; i++) { 
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.textContent = i + 1;
            btn.dataset.indice = i;
            navegadorPreguntas.appendChild(btn);
        }
    }

    // (MODIFICADO)
    function mostrarPregunta(indice) {
        // Usa TOTAL_PREGUNTAS_QUIZ
        if (indice < 0 || indice >= TOTAL_PREGUNTAS_QUIZ) return; 
        indicePreguntaActual = indice;
        const pregunta = preguntasQuiz[indice];
        preguntaNumero.textContent = `Pregunta ${indice + 1}`;
        preguntaTexto.textContent = pregunta.pregunta;
        opcionesContainer.innerHTML = '';
        pregunta.opciones.forEach(opcion => {
            const btn = document.createElement('button');
            btn.className = 'opcion-btn';
            btn.innerHTML = opcion;
            if (respuestasUsuario[indice] === opcion) btn.classList.add('selected');
            btn.addEventListener('click', () => seleccionarRespuesta(opcion));
            opcionesContainer.appendChild(btn);
        });
        // Usa TOTAL_PREGUNTAS_QUIZ
        siguienteBtn.disabled = (indice === TOTAL_PREGUNTAS_QUIZ - 1); 
        actualizarNavegadorVisual();
    }

    function seleccionarRespuesta(opcion) {
        respuestasUsuario[indicePreguntaActual] = opcion;
        mostrarPregunta(indicePreguntaActual);
        const navBtn = navegadorPreguntas.querySelector(`[data-indice="${indicePreguntaActual}"]`);
        if (navBtn) navBtn.classList.add('answered');
    }

    function actualizarNavegadorVisual() {
        const botones = navegadorPreguntas.querySelectorAll('.nav-btn');
        botones.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.indice) === indicePreguntaActual) btn.classList.add('active');
        });
    }

    // (MODIFICADO)
    function irPreguntaSiguiente() {
        // Usa TOTAL_PREGUNTAS_QUIZ
        if (indicePreguntaActual < TOTAL_PREGUNTAS_QUIZ - 1) { 
            mostrarPregunta(indicePreguntaActual + 1);
        }
    }

    function confirmarTerminarIntento() {
        const enBlanco = respuestasUsuario.filter(r => r === null).length;
        let mensaje = "¿Estás seguro de que deseas terminar el intento?";
        if (enBlanco > 0) mensaje += `<br><br>Todavía tienes <strong>${enBlanco} preguntas en blanco.</strong>`;
        modalMensaje.innerHTML = mensaje;
        modalBotones.style.display = 'flex';
        modalOverlay.style.display = 'flex';
    }

    // --- 6. LÓGICA DE FINALIZACIÓN Y RESULTADOS ---
    function finalizarIntento(porTiempo = false) {
        clearInterval(cronometroInterval);
        if (porTiempo) {
            modalMensaje.innerHTML = "¡Se acabó el tiempo!<br>El intento ha finalizado.";
            modalBotones.style.display = 'none';
            modalOverlay.style.display = 'flex';
            setTimeout(() => { modalOverlay.style.display = 'none'; mostrarResultadosPantalla(); }, 3000);
        } else {
            mostrarResultadosPantalla();
        }
    }

    function mostrarResultadosPantalla() {
        simuladorContainer.style.display = 'none';
        resultadosContainer.style.display = 'block';
        calcularResultados();
    }

    // (MODIFICADO)
    function calcularResultados() {
        let correctas = 0, incorrectas = 0, enBlanco = 0, puntaje = 0;
        // Usa TOTAL_PREGUNTAS_QUIZ
        const puntosPorPregunta = 1000 / TOTAL_PREGUNTAS_QUIZ; // Calcula puntos por pregunta

        for (let i = 0; i < TOTAL_PREGUNTAS_QUIZ; i++) { 
            const respUser = respuestasUsuario[i];
            // Asegúrate que preguntasQuiz[i] exista antes de acceder a .respuesta
            if (preguntasQuiz[i]) { 
                const respCorrecta = preguntasQuiz[i].respuesta;
                if (respUser === null) enBlanco++;
                else if (respUser === respCorrecta) { 
                    correctas++; 
                    puntaje += puntosPorPregunta; // Suma puntos por correcta
                }
                else incorrectas++;
            } else {
                console.error("Error: Pregunta no encontrada en índice", i); // Ayuda a depurar
                enBlanco++; // O cuenta como en blanco si falta la pregunta
            }
        }
        
        // Redondear puntaje final a entero
        puntaje = Math.round(puntaje); 

        if (puntaje < 0) puntaje = 0; // Asegurar que no sea negativo (aunque no debería)

        puntajeFinalDisplay.textContent = puntaje;
        statsContestadas.textContent = correctas + incorrectas;
        statsCorrectas.textContent = correctas;
        statsIncorrectas.textContent = incorrectas;
        statsEnBlanco.textContent = enBlanco;

        mostrarRevision(puntosPorPregunta); // Pasa los puntos por pregunta a la revisión
    }

    // (MODIFICADO)
    function mostrarRevision(puntosPorPregunta) {
        revisionContainer.innerHTML = '';
        // Usa TOTAL_PREGUNTAS_QUIZ
        preguntasQuiz.forEach((pregunta, i) => { 
            const respUser = respuestasUsuario[i];
            const respCorrecta = pregunta.respuesta;
            const divRevision = document.createElement('div');
            divRevision.className = 'revision-pregunta';
            let feedbackHTML = '';

             // Redondea los puntos a mostrar
            const puntosCorrecta = Math.round(puntosPorPregunta);

            if (respUser === null) {
                feedbackHTML = `<p class="respuesta-usuario">No contestada (0 Puntos)</p><div class="feedback incorrecta">RESPUESTA<span>La respuesta correcta era: <strong>${respCorrecta}</strong></span></div>`;
            } else if (respUser === respCorrecta) {
                feedbackHTML = `<p class="respuesta-usuario">Tu respuesta: ${respUser}</p><div class="feedback correcta">CORRECTA (+${puntosCorrecta} Puntos)</div>`;
            } else {
                feedbackHTML = `<p class="respuesta-usuario">Tu respuesta: ${respUser}</p><div class="feedback incorrecta">INCORRECTA (0 Puntos)<span>La respuesta correcta era: <strong>${respCorrecta}</strong></span></div>`;
            }
            divRevision.innerHTML = `<p><span class="pregunta-num">Pregunta ${i + 1}:</span> ${pregunta.pregunta}</p>${feedbackHTML}`;
            revisionContainer.appendChild(divRevision);
        });
    }

    // --- KICKOFF ---
    inicializar();
});
