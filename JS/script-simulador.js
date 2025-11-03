// JS/script-simulador.js

// (NUEVO) Importar la librería de Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// (NUEVO) Inicializar Supabase (¡Usa tus claves!)
const supabaseUrl = 'https://tgkbsaazxgnpllcwtbuk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRna2JzYWF6eGducGxsY3d0YnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzk0OTUsImV4cCI6MjA3Nzc1NTQ5NX0.877IdYJdJSczFaqCsz2P-w5uzAZvS7E6DzWTcwyT4IQ';
const supabase = createClient(supabaseUrl, supabaseKey);


document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERENCIAS A ELEMENTOS DEL DOM ---
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
    const puntajeFinalDisplay = document.getElementById('puntaje-final');
    const statsContestadas = document.getElementById('stats-contestadas');
    const statsCorrectas = document.getElementById('stats-correctas');
    const statsIncorrectas = document.getElementById('stats-incorrectas');
    const statsEnBlanco = document.getElementById('stats-en-blanco');
    const revisionContainer = document.getElementById('revision-container');
    const reiniciarBtn = document.getElementById('reiniciar-btn');
    const retryBtn = document.getElementById('retry-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalMensaje = document.getElementById('modal-mensaje');
    const cancelarModalBtn = document.getElementById('cancelar-modal-btn');
    const confirmarModalBtn = document.getElementById('confirmar-modal-btn');
    const modalBotones = document.querySelector('.modal-botones');

    // --- 2. VARIABLES GLOBALES DEL SIMULADOR ---
    let preguntasPorMateria = {};
    let preguntasQuiz = [];
    let respuestasUsuario = [];
    let indicePreguntaActual = 0;
    let cronometroInterval;
    let tiempoRestanteSeg;
    let TOTAL_PREGUNTAS_QUIZ = 50;

    const materias = {
        'sociales': 'Ciencias Sociales',
        'matematicas': 'Matemáticas y Física',
        'lengua': 'Lengua y Literatura',
        'ingles': 'Inglés',
        'general': 'General (Todas)',
        'inteligencia': 'Inteligencia',
        'personalidad': 'Personalidad'
    };
    const ordenGeneral = ['sociales', 'matematicas', 'lengua', 'ingles'];
    
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

        let quizDurationSeconds;
        let lobbyTiempoTexto;

        if (materiaKey === 'matematicas') {
            quizDurationSeconds = 90 * 60;
            lobbyTiempoTexto = "1 Hora y 30 Minutos (90 Minutos)";
            TOTAL_PREGUNTAS_QUIZ = 50;
        } else if (materiaKey === 'general') {
            quizDurationSeconds = 180 * 60;
            lobbyTiempoTexto = "3 Horas (180 Minutos)";
            TOTAL_PREGUNTAS_QUIZ = 200;
        } else if (materiaKey === 'personalidad' || materiaKey === 'inteligencia') {
            quizDurationSeconds = 60 * 60;
            lobbyTiempoTexto = "1 Hora (60 Minutos)";
            TOTAL_PREGUNTAS_QUIZ = 50;
        } else {
            quizDurationSeconds = 60 * 60;
            lobbyTiempoTexto = "1 Hora (60 Minutos)";
            TOTAL_PREGUNTAS_QUIZ = 50;
        }

        tiempoRestanteSeg = quizDurationSeconds;

        const lobbyTiempoDisplay = document.getElementById('lobby-tiempo');
        if (lobbyTiempoDisplay) lobbyTiempoDisplay.textContent = lobbyTiempoTexto;
        if (lobbyPreguntasDisplay) lobbyPreguntasDisplay.textContent = (materiaKey === 'general') ? '200' : '50';

        comenzarBtn.disabled = true;
        comenzarBtn.textContent = 'Cargando recursos...';
        
        cargarPreguntas(materiaKey);

        siguienteBtn.addEventListener('click', irPreguntaSiguiente);
        terminarIntentoBtn.addEventListener('click', confirmarTerminarIntento);
        reiniciarBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
        cancelarModalBtn.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
        confirmarModalBtn.addEventListener('click', () => { modalOverlay.style.display = 'none'; finalizarIntento(false); });
        
        retryBtn.addEventListener('click', () => {
            location.reload(); 
        });
    }

    // --- 4. LÓGICA DE PRECARGA ---
    async function precargarImagenes(listaPreguntas) {
        if (!listaPreguntas || listaPreguntas.length === 0) {
            return Promise.resolve();
        }
        const promesasDeImagenes = [];
        let urlsUnicas = new Set();
        listaPreguntas.forEach(pregunta => {
            if (pregunta.imagen) {
                urlsUnicas.add(pregunta.imagen);
            }
        });
        if (urlsUnicas.size === 0) {
            return Promise.resolve();
        }
        console.log(`Precargando ${urlsUnicas.size} imágenes únicas...`);
        urlsUnicas.forEach(url => {
            const promesa = new Promise((resolve, reject) => {
                const img = new Image();
                img.src = url;
                img.onload = resolve;
                img.onerror = reject;
            });
            promesasDeImagenes.push(promesa);
        });
        return Promise.all(promesasDeImagenes);
    }

    // --- 5. LÓGICA DE CARGA Y PREPARACIÓN ---
    async function cargarPreguntas(materia) {
        preguntasPorMateria = {};
        let materiasACargar = [];
        if (materia === 'general') {
            materiasACargar = ordenGeneral;
        } else {
            materiasACargar = [materia];
        }
        try {
            const promesas = materiasACargar.map(m =>
                fetch(`DATA/preguntas_${m}.json`)
                    .then(res => res.ok ? res.json() : Promise.reject(`Fallo al cargar ${m}`))
                    .then(data => ({ materia: m, preguntas: data }))
            );
            const resultados = await Promise.all(promesas);
            let totalPreguntasCargadas = 0;
            let todasLasPreguntasParaPrecarga = [];
            resultados.forEach(res => {
                 if (materia === 'general' && res.preguntas.length < 50) {
                     console.warn(`Advertencia: La materia '${res.materia}' tiene solo ${res.preguntas.length} preguntas (se necesitan 50 para el modo General). Se usarán todas.`);
                 }
                 else if (materia !== 'general' && res.preguntas.length < TOTAL_PREGUNTAS_QUIZ) {
                      console.warn(`Advertencia: La materia '${res.materia}' tiene solo ${res.preguntas.length} preguntas (se necesitan ${TOTAL_PREGUNTAS_QUIZ}). Se usarán todas.`);
                 }
                preguntasPorMateria[res.materia] = res.preguntas;
                totalPreguntasCargadas += res.preguntas.length;
                todasLasPreguntasParaPrecarga = todasLasPreguntasParaPrecarga.concat(res.preguntas);
            });
             if (totalPreguntasCargadas === 0) {
                 throw new Error("No se cargaron preguntas de ninguna materia relevante.");
             }
             await precargarImagenes(todasLasPreguntasParaPrecarga);
             console.log("¡Imágenes precargadas con éxito!");
             comenzarBtn.disabled = false;
             comenzarBtn.textContent = 'Comenzar Intento';
             comenzarBtn.addEventListener('click', iniciarIntento);
        } catch (error) {
            console.error("Error cargando recursos:", error);
            if (materia === 'inteligencia' && !error.message.includes('Fallo al cargar')) {
                 comenzarBtn.disabled = false;
                 comenzarBtn.textContent = 'Comenzar Intento';
                 comenzarBtn.addEventListener('click', iniciarIntento);
            } else {
                alert(`Error al cargar las preguntas o imágenes. ${error.message || ''}`);
                comenzarBtn.textContent = 'Error al Cargar';
            }
        }
    }
    
    function prepararQuiz() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia') || 'sociales';
        preguntasQuiz = [];
        let contadorPreguntas = 0;
        if (materiaKey === 'general') {
            TOTAL_PREGUNTAS_QUIZ = 0; 
            ordenGeneral.forEach(materia => {
                if (preguntasPorMateria[materia] && preguntasPorMateria[materia].length > 0) {
                    const preguntasMateriaBarajadas = [...preguntasPorMateria[materia]].sort(() => Math.random() - 0.5);
                    const preguntasSeleccionadas = preguntasMateriaBarajadas.slice(0, 50);
                    preguntasQuiz = preguntasQuiz.concat(preguntasSeleccionadas);
                    contadorPreguntas += preguntasSeleccionadas.length;
                } else {
                    console.warn(`No hay preguntas cargadas para ${materia} en modo general.`);
                }
            });
            TOTAL_PREGUNTAS_QUIZ = contadorPreguntas;
        } else {
             let numPreguntasDeseadas = 50;
             if (materiaKey === 'matematicas') numPreguntasDeseadas = 50;
             if (preguntasPorMateria[materiaKey] && preguntasPorMateria[materiaKey].length > 0) {
                const preguntasBarajadas = [...preguntasPorMateria[materiaKey]].sort(() => Math.random() - 0.5);
                preguntasQuiz = preguntasBarajadas.slice(0, numPreguntasDeseadas);
                TOTAL_PREGUNTAS_QUIZ = preguntasQuiz.length;
            } else {
                 console.error(`No hay preguntas cargadas para la materia ${materiaKey}`);
                 preguntasQuiz = [];
                 TOTAL_PREGUNTAS_QUIZ = 0;
            }
        }
         if (lobbyPreguntasDisplay) lobbyPreguntasDisplay.textContent = TOTAL_PREGUNTAS_QUIZ;
         respuestasUsuario = new Array(TOTAL_PREGUNTAS_QUIZ).fill(null);
    }
    
    // --- 6. LÓGICA DEL SIMULADOR ---
    function iniciarIntento() {
        prepararQuiz();
        if (preguntasQuiz.length === 0) { 
            const params = new URLSearchParams(window.location.search);
            const materiaKey = params.get('materia');
            if(materiaKey === 'inteligencia' && (!preguntasPorMateria['inteligencia'] || preguntasPorMateria['inteligencia'].length === 0)) {
                alert("El simulador de Inteligencia aún no está disponible. Próximamente.");
                window.location.href = 'index.html';
            } else {
                alert("No se cargaron preguntas para iniciar. Verifique los archivos .json.");
            }
            return; 
        }
        lobbyContainer.style.display = 'none';
        simuladorContainer.style.display = 'grid';
        construirNavegador();
        mostrarPregunta(0);
        iniciarCronometro();
    }

    function iniciarCronometro() {
        clearInterval(cronometroInterval);
        function formatTime(totalSeconds) {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        cronometroDisplay.textContent = formatTime(tiempoRestanteSeg);
        cronometroInterval = setInterval(() => {
            tiempoRestanteSeg--;
            cronometroDisplay.textContent = formatTime(tiempoRestanteSeg);
            if (tiempoRestanteSeg <= 0) { finalizarIntento(true); }
        }, 1000);
    }

    function construirNavegador() {
        navegadorPreguntas.innerHTML = '';
        for (let i = 0; i < TOTAL_PREGUNTAS_QUIZ; i++) {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.textContent = i + 1;
            btn.dataset.indice = i;
            navegadorPreguntas.appendChild(btn);
        }
    }

    function mostrarPregunta(indice) {
        if (indice < 0 || indice >= TOTAL_PREGUNTAS_QUIZ) return;
        indicePreguntaActual = indice;
        const pregunta = preguntasQuiz[indice];
        if (!pregunta) {
             console.error(`Intento de mostrar pregunta inválida en índice ${indice}`);
             if(indice < TOTAL_PREGUNTAS_QUIZ - 1) irPreguntaSiguiente();
             else finalizarIntento(false);
             return;
        }
        preguntaNumero.textContent = `Pregunta ${indice + 1}`;
        let preguntaHTML = `<span>${pregunta.pregunta}</span>`;
        if (pregunta.imagen) {
            preguntaHTML += `<img src="${pregunta.imagen}" alt="Imagen de la pregunta" class="pregunta-imagen">`;
        }
        preguntaTexto.innerHTML = preguntaHTML;
        opcionesContainer.innerHTML = '';
        pregunta.opciones.forEach(opcion => {
            const btn = document.createElement('button');
            btn.className = 'opcion-btn';
            btn.innerHTML = opcion;
            if (respuestasUsuario[indice] === opcion) btn.classList.add('selected');
            btn.addEventListener('click', () => seleccionarRespuesta(opcion));
            opcionesContainer.appendChild(btn);
        });
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

    function irPreguntaSiguiente() {
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
    
    // (NUEVO) Función para guardar en Supabase
    async function guardarResultadoEnSupabase(resultado) {
        try {
            // Deshabilita los botones de reintento/inicio mientras guarda
            retryBtn.disabled = true;
            reiniciarBtn.disabled = true;

            const { data, error } = await supabase
                .from('resultados') // El nombre de tu tabla
                .insert([
                    {
                        usuario_id: resultado.usuario_id,
                        usuario_nombre: resultado.usuario_nombre,
                        materia: resultado.materia,
                        puntaje: resultado.puntaje,
                        total_preguntas: resultado.total_preguntas,
                        ciudad: resultado.ciudad
                    }
                ]);
            
            if (error) {
                throw error;
            }
            
            console.log("Resultado guardado en Supabase:", data);
        } catch (error) {
            console.error("Error al guardar resultado en Supabase:", error.message);
             alert("¡Error! No se pudo guardar tu resultado en el servidor. Revisa tu conexión. Tu resultado local se mostrará, pero no se guardará en el reporte.");
        } finally {
            // Vuelve a habilitar los botones
            retryBtn.disabled = false;
            reiniciarBtn.disabled = false;
        }
    }

    // --- 7. LÓGICA DE FINALIZACIÓN Y RESULTADOS ---
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

    async function mostrarResultadosPantalla() { // (MODIFICADO) ahora es async
        simuladorContainer.style.display = 'none';
        resultadosContainer.style.display = 'block';
        
        const { puntaje, correctas, incorrectas, enBlanco } = calcularResultados();
        
        // (MODIFICADO) Guarda el resultado en Supabase
        try {
            const userInfo = getUserInfo(); // {usuario, nombre, rol, ciudad}
            const params = new URLSearchParams(window.location.search);
            const materiaKey = params.get('materia') || 'sociales';
            const nombreMateria = materias[materiaKey] || 'Desconocida';

            if (userInfo && userInfo.usuario) {
                const result = {
                    usuario_id: userInfo.usuario,
                    usuario_nombre: userInfo.nombre,
                    materia: nombreMateria,
                    puntaje: puntaje,
                    total_preguntas: TOTAL_PREGUNTAS_QUIZ,
                    ciudad: userInfo.ciudad // Añade la ciudad
                };
                
                // (NUEVO) Llama a la función de guardado
                await guardarResultadoEnSupabase(result);

            }
        } catch (e) {
            console.error("Error al obtener info de usuario para guardar:", e);
        }
        // --- Fin de guardar ---

        mostrarRevision(puntaje, correctas, incorrectas, enBlanco);
    }

    function calcularResultados() {
        let correctas = 0, incorrectas = 0, enBlanco = 0, puntaje = 0;
        const puntosPorPregunta = TOTAL_PREGUNTAS_QUIZ > 0 ? (1000 / TOTAL_PREGUNTAS_QUIZ) : 0;
        for (let i = 0; i < TOTAL_PREGUNTAS_QUIZ; i++) {
            const respUser = respuestasUsuario[i];
            if (preguntasQuiz[i]) {
                const respCorrecta = preguntasQuiz[i].respuesta;
                if (respUser === null) enBlanco++;
                else if (respUser === respCorrecta) { correctas++; puntaje += puntosPorPregunta; }
                else incorrectas++;
            } else {
                 console.error("Error: Pregunta no encontrada en índice", i, "durante el cálculo.");
                 enBlanco++;
            }
        }
        puntaje = Math.round(puntaje);
        if (puntaje < 0) puntaje = 0;
        return { puntaje, correctas, incorrectas, enBlanco };
    }

    function mostrarRevision(puntaje, correctas, incorrectas, enBlanco) {
        puntajeFinalDisplay.textContent = puntaje;
        statsContestadas.textContent = correctas + incorrectas;
        statsCorrectas.textContent = correctas;
        statsIncorrectas.textContent = incorrectas;
        statsEnBlanco.textContent = enBlanco;

        const puntosPorPregunta = TOTAL_PREGUNTAS_QUIZ > 0 ? (1000 / TOTAL_PREGUNTAS_QUIZ) : 0;
        revisionContainer.innerHTML = '';
        
        preguntasQuiz.forEach((pregunta, i) => {
            const respUser = respuestasUsuario[i];
            const respCorrecta = pregunta.respuesta;
            const divRevision = document.createElement('div');
            divRevision.className = 'revision-pregunta';
            let feedbackHTML = '';
            const puntosCorrecta = Math.round(puntosPorPregunta);
            let imagenHTML = '';
            if (pregunta.imagen) {
                imagenHTML = `<img src="${pregunta.imagen}" alt="Imagen de la pregunta" class="pregunta-imagen-revision">`;
            }
            if (respUser === null) {
                feedbackHTML = `<p class="respuesta-usuario">No contestada (0 Puntos)</p><div class="feedback incorrecta">RESPUESTA<span>La respuesta correcta era: <strong>${respCorrecta}</strong></span></div>`;
            } else if (respUser === respCorrecta) {
                feedbackHTML = `<p class="respuesta-usuario">Tu respuesta: ${respUser}</p><div class="feedback correcta">CORRECTA (+${puntosCorrecta} Puntos)</div>`;
            } else {
                feedbackHTML = `<p class="respuesta-usuario">Tu respuesta: ${respUser}</p><div class="feedback incorrecta">INCORRECTA (0 Puntos)<span>La respuesta correcta era: <strong>${respCorrecta}</strong></span></div>`;
            }
            divRevision.innerHTML = `<p><span class="pregunta-num">Pregunta ${i + 1}:</span> ${pregunta.pregunta}</p>${imagenHTML}${feedbackHTML}`;
            revisionContainer.appendChild(divRevision);
        });
    }

    // --- KICKOFF ---
    inicializar();
});
