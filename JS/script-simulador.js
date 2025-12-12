// JS/script-simulador.js

// 1. CONEXIÓN (Credenciales del último mensaje)
const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {

    // --- REFERENCIAS ---
    const lobbyContainer = document.getElementById('lobby-container');
    const simuladorContainer = document.getElementById('simulador-container');
    const resultadosContainer = document.getElementById('resultados-container');
    
    // Textos
    const tituloMateria = document.getElementById('titulo-materia');
    const lobbyMateria = document.getElementById('lobby-materia');
    const lobbyPreguntasDisplay = document.getElementById('lobby-preguntas');
    const lobbyTiempoDisplay = document.getElementById('lobby-tiempo');
    
    // Quiz Elements
    const comenzarBtn = document.getElementById('comenzar-btn');
    const cronometroDisplay = document.getElementById('cronometro');
    const preguntaNumero = document.getElementById('pregunta-numero');
    const preguntaTexto = document.getElementById('pregunta-texto');
    const opcionesContainer = document.getElementById('opciones-container');
    const navegadorPreguntas = document.getElementById('navegador-preguntas');
    const siguienteBtn = document.getElementById('siguiente-btn');
    const terminarIntentoBtn = document.getElementById('terminar-intento-btn');
    
    // Resultados Elements
    const puntajeFinalDisplay = document.getElementById('puntaje-final');
    const statsContestadas = document.getElementById('stats-contestadas');
    const statsCorrectas = document.getElementById('stats-correctas');
    const statsIncorrectas = document.getElementById('stats-incorrectas');
    const statsEnBlanco = document.getElementById('stats-en-blanco');
    const revisionContainer = document.getElementById('revision-container');
    
    // Botones Resultados
    const reiniciarBtn = document.getElementById('reiniciar-btn');
    const retryBtn = document.getElementById('retry-btn');
    
    // Modales
    const modalOverlay = document.getElementById('modal-overlay');
    const modalMensaje = document.getElementById('modal-mensaje');
    const cancelarModalBtn = document.getElementById('cancelar-modal-btn');
    const confirmarModalBtn = document.getElementById('confirmar-modal-btn');

    // Variables
    let preguntasPorMateria = {};
    let preguntasQuiz = [];
    let respuestasUsuario = [];
    let indicePreguntaActual = 0;
    let cronometroInterval;
    let tiempoRestanteSeg;
    let TOTAL_PREGUNTAS_QUIZ = 50;

    // Lista de Materias
    const materias = {
        'sociales': 'Ciencias Sociales', 'matematicas': 'Matemáticas y Física',
        'lengua': 'Lengua y Literatura', 'ingles': 'Inglés', 'general': 'General (Todas)',
        'inteligencia': 'Inteligencia', 'personalidad': 'Personalidad',
        'ppnn1': 'Cuestionario 1 PPNN', 'ppnn2': 'Cuestionario 2 PPNN',
        'ppnn3': 'Cuestionario 3 PPNN', 'ppnn4': 'Cuestionario 4 PPNN',
        'sociales_esmil': 'Ciencias Sociales (ESMIL)', 'matematicas_esmil': 'Matemáticas (ESMIL)',
        'lengua_esmil': 'Lenguaje (ESMIL)', 'ingles_esmil': 'Inglés (ESMIL)',
        'general_esmil': 'General ESMIL'
    };

    const ordenGeneralPolicia = ['sociales', 'matematicas', 'lengua', 'ingles'];
    const ordenGeneralEsmil = ['sociales_esmil', 'matematicas_esmil', 'lengua_esmil', 'ingles_esmil'];

    // --- INICIALIZACIÓN ---
    function inicializar() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia') || 'sociales';
        
        let nombreMateria = materias[materiaKey];
        if (!nombreMateria) {
            if (materiaKey.startsWith('ppnn')) nombreMateria = `Cuestionario ${materiaKey.replace('ppnn', '')} PPNN`;
            else nombreMateria = 'Desconocida';
        }

        if(tituloMateria) tituloMateria.textContent = `SIMULADOR DE: ${nombreMateria.toUpperCase()}`;
        if(lobbyMateria) lobbyMateria.textContent = nombreMateria;

        lobbyContainer.style.display = 'block';
        simuladorContainer.style.display = 'none';
        resultadosContainer.style.display = 'none';

        let quizDurationSeconds = 3600; 

        if (materiaKey.startsWith('ppnn')) {
            quizDurationSeconds = 3600;
        } else if (materiaKey.includes('matematicas')) {
            quizDurationSeconds = 5400; 
        } else if (materiaKey.includes('general')) {
            quizDurationSeconds = 10800; 
            TOTAL_PREGUNTAS_QUIZ = 200;
        }

        tiempoRestanteSeg = quizDurationSeconds;
        if(lobbyTiempoDisplay) lobbyTiempoDisplay.textContent = Math.floor(quizDurationSeconds/60) + " Minutos";
        if(lobbyPreguntasDisplay) lobbyPreguntasDisplay.textContent = TOTAL_PREGUNTAS_QUIZ;

        comenzarBtn.disabled = true;
        comenzarBtn.textContent = 'Cargando recursos...';

        cargarPreguntas(materiaKey);

        // Listeners
        // IMPORTANTE: Aquí asignamos la función irPreguntaSiguiente al botón "Siguiente"
        if(siguienteBtn) siguienteBtn.addEventListener('click', irPreguntaSiguiente);
        if(terminarIntentoBtn) terminarIntentoBtn.addEventListener('click', confirmarTerminarIntento);
        
        if(reiniciarBtn) reiniciarBtn.addEventListener('click', () => window.location.href = 'index.html');
        if(retryBtn) retryBtn.addEventListener('click', () => location.reload());
        
        if(cancelarModalBtn) cancelarModalBtn.addEventListener('click', () => modalOverlay.style.display = 'none');
        if(confirmarModalBtn) confirmarModalBtn.addEventListener('click', () => { 
            modalOverlay.style.display = 'none'; 
            finalizarIntento(false); 
        });
    }

    async function cargarPreguntas(materia) {
        let materiasACargar = [];
        if (materia === 'general') materiasACargar = ordenGeneralPolicia;
        else if (materia === 'general_esmil') materiasACargar = ordenGeneralEsmil;
        else materiasACargar = [materia];

        try {
            const promesas = materiasACargar.map(m =>
                fetch(`DATA/preguntas_${m}.json`).then(res => {
                    if (!res.ok) throw new Error(`Fallo al cargar ${m}.json`);
                    return res.json();
                })
            );
            const resultados = await Promise.all(promesas);
            let totalPreguntasCargadas = 0;
            let todas = [];

            resultados.forEach(data => {
                todas = todas.concat(data);
            });
            totalPreguntasCargadas = todas.length;

            if (totalPreguntasCargadas === 0) throw new Error("No se cargaron preguntas.");

            if (materia.startsWith('ppnn')) {
                TOTAL_PREGUNTAS_QUIZ = totalPreguntasCargadas;
                if(lobbyPreguntasDisplay) lobbyPreguntasDisplay.textContent = TOTAL_PREGUNTAS_QUIZ;
            }

            preguntasPorMateria[materia] = todas;
            
            comenzarBtn.disabled = false;
            comenzarBtn.textContent = 'COMENZAR INTENTO';
            comenzarBtn.addEventListener('click', () => iniciarIntento(materia));
        } catch (error) {
            console.error(error);
            alert("Error cargando preguntas. Verifica la consola.");
        }
    }

    function iniciarIntento(materiaKey) {
        let pool = preguntasPorMateria[materiaKey];
        if(!pool) return;

        if (materiaKey.startsWith('ppnn')) {
             preguntasQuiz = pool.sort(() => Math.random() - 0.5);
        } else if (materiaKey.includes('general')) {
             preguntasQuiz = pool.sort(() => Math.random() - 0.5).slice(0, TOTAL_PREGUNTAS_QUIZ);
        } else {
             preguntasQuiz = pool.sort(() => Math.random() - 0.5).slice(0, 50);
        }
        
        respuestasUsuario = new Array(preguntasQuiz.length).fill(null);
        
        lobbyContainer.style.display = 'none';
        simuladorContainer.style.display = 'flex'; 
        
        construirNavegador();
        mostrarPregunta(0);
        iniciarCronometro();
    }

    function iniciarCronometro() {
        clearInterval(cronometroInterval);
        function formatTime(totalSeconds) {
            const m = Math.floor(totalSeconds / 60);
            const s = totalSeconds % 60;
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        if(cronometroDisplay) cronometroDisplay.textContent = formatTime(tiempoRestanteSeg);
        cronometroInterval = setInterval(() => {
            tiempoRestanteSeg--;
            if(cronometroDisplay) cronometroDisplay.textContent = formatTime(tiempoRestanteSeg);
            if (tiempoRestanteSeg <= 0) { finalizarIntento(true); }
        }, 1000);
    }

    // --- AQUÍ ESTÁ LA LÓGICA LINEAL Y VISUALIZACIÓN ---
    function construirNavegador() {
        navegadorPreguntas.innerHTML = '';
        for (let i = 0; i < TOTAL_PREGUNTAS_QUIZ; i++) {
            const btn = document.createElement('button');
            btn.className = 'nav-dot'; // Usamos tu clase nav-dot
            btn.textContent = i + 1;
            btn.dataset.indice = i;
            // IMPORTANTE: No agregamos evento onclick para bloquear el regreso
            btn.style.cursor = 'default'; 
            navegadorPreguntas.appendChild(btn);
        }
    }

    function mostrarPregunta(indice) {
        indicePreguntaActual = indice;
        const pregunta = preguntasQuiz[indice];
        
        if(preguntaNumero) preguntaNumero.textContent = `Pregunta ${indice + 1}`;
        
        // Mostrar Imagen si existe
        const imgContainer = document.getElementById('q-image-container'); 
        let imgHTML = '';
        if (pregunta.imagen) {
            imgHTML = `<img src="${pregunta.imagen}" class="pregunta-imagen" style="max-width:100%; border-radius:8px; margin-top:10px;" onerror="this.style.display='none'">`;
        }
        
        if(imgContainer) {
            imgContainer.innerHTML = imgHTML;
            if(preguntaTexto) preguntaTexto.innerHTML = pregunta.pregunta;
        } else {
            if(preguntaTexto) preguntaTexto.innerHTML = `<span>${pregunta.pregunta}</span><br>${imgHTML}`;
        }
        
        opcionesContainer.innerHTML = '';
        pregunta.opciones.forEach(opcion => {
            const btn = document.createElement('button');
            btn.className = 'opcion-btn';
            btn.innerHTML = opcion;
            if (respuestasUsuario[indice] === opcion) btn.classList.add('selected');
            btn.addEventListener('click', () => seleccionarRespuesta(opcion));
            opcionesContainer.appendChild(btn);
        });
        
        // Actualizar botón Siguiente/Finalizar
        if (indice === TOTAL_PREGUNTAS_QUIZ - 1) {
            if(siguienteBtn) {
                 siguienteBtn.textContent = "Finalizar Intento";
                 siguienteBtn.style.background = "#27ae60"; 
            }
        } else {
            if(siguienteBtn) {
                siguienteBtn.textContent = "Siguiente";
                siguienteBtn.style.background = ""; 
            }
        }
        
        actualizarNavegadorVisual();
    }

    function seleccionarRespuesta(opcion) {
        respuestasUsuario[indicePreguntaActual] = opcion;
        
        // Actualizar visualmente la opción seleccionada
        const opciones = opcionesContainer.querySelectorAll('.opcion-btn');
        opciones.forEach(btn => {
            if(btn.innerHTML === opcion) btn.classList.add('selected');
            else btn.classList.remove('selected');
        });

        // Marcar en el navegador (solo visual)
        const navBtn = navegadorPreguntas.children[indicePreguntaActual];
        if (navBtn) navBtn.classList.add('answered');
    }

    function actualizarNavegadorVisual() {
        const botones = navegadorPreguntas.children;
        for(let btn of botones) {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.indice) === indicePreguntaActual) btn.classList.add('active');
        }
    }

    function irPreguntaSiguiente() {
        // LINEALIDAD: Solo avanza, nunca retrocede
        if (indicePreguntaActual < TOTAL_PREGUNTAS_QUIZ - 1) {
            mostrarPregunta(indicePreguntaActual + 1);
        } else {
            // Si es la última pregunta, finaliza
            finalizarIntento(false);
        }
    }

    function confirmarTerminarIntento() {
        const enBlanco = respuestasUsuario.filter(r => r === null).length;
        if(modalMensaje) modalMensaje.innerHTML = `¿Seguro que quieres terminar?<br>Tienes <strong>${enBlanco}</strong> preguntas sin responder.`;
        if(modalOverlay) modalOverlay.style.display = 'flex';
    }

    async function guardarResultadoEnSupabase(resultado) {
        try {
            await supabase.from('resultados').insert([resultado]);
            console.log("Guardado OK");
        } catch (error) {
            console.error("Error guardando:", error);
        }
    }

    function finalizarIntento(porTiempo = false) {
        clearInterval(cronometroInterval);
        
        simuladorContainer.style.display = 'none';
        resultadosContainer.style.display = 'block';
        
        let correctas = 0, incorrectas = 0, enBlanco = 0, puntaje = 0;
        const puntosPorPregunta = TOTAL_PREGUNTAS_QUIZ > 0 ? (1000 / TOTAL_PREGUNTAS_QUIZ) : 0;
        
        for (let i = 0; i < TOTAL_PREGUNTAS_QUIZ; i++) {
            const respUser = respuestasUsuario[i];
            const respCorrecta = preguntasQuiz[i].respuesta;
            
            if (respUser === null) enBlanco++;
            else if (respUser === respCorrecta) { correctas++; }
            else incorrectas++;
        }
        puntaje = Math.round(correctas * puntosPorPregunta);

        if(puntajeFinalDisplay) puntajeFinalDisplay.textContent = puntaje;
        if(statsContestadas) statsContestadas.textContent = correctas + incorrectas;
        if(statsCorrectas) statsCorrectas.textContent = correctas;
        if(statsIncorrectas) statsIncorrectas.textContent = incorrectas;
        if(statsEnBlanco) statsEnBlanco.textContent = enBlanco;

        // --- MOSTRAR REVISIÓN CON IMÁGENES ---
        if(revisionContainer) {
            revisionContainer.innerHTML = '';
            preguntasQuiz.forEach((q, i) => {
                const div = document.createElement('div');
                div.className = 'revision-pregunta'; 
                div.style.borderBottom = "1px solid #ddd";
                div.style.padding = "15px";
                div.style.marginBottom = "10px";
                div.style.background = "#fff";
                div.style.borderRadius = "8px";

                const esCorrecta = respuestasUsuario[i] === q.respuesta;
                const colorResp = esCorrecta ? '#27ae60' : '#c0392b';
                
                // --- AQUÍ ESTÁ EL CAMBIO PARA LAS IMÁGENES EN RESULTADOS ---
                let imgHTML = '';
                if(q.imagen) {
                    imgHTML = `<div style="text-align:center; margin:10px 0;">
                        <img src="${q.imagen}" style="max-width:100%; max-height:200px; border-radius:5px; border:1px solid #eee;">
                    </div>`;
                }

                div.innerHTML = `
                    <p style="font-size:1.1rem; margin-bottom:5px;"><strong>${i+1}. ${q.pregunta}</strong></p>
                    ${imgHTML} 
                    <p>Tu respuesta: <span style="font-weight:bold; color:${colorResp}">${respuestasUsuario[i] || 'En Blanco'}</span></p>
                    ${!esCorrecta ? `<p style="color:#27ae60; margin-top:5px;">Correcta: <strong>${q.respuesta}</strong></p>` : ''}
                `;
                revisionContainer.appendChild(div);
            });
        }

        // Guardar
        const user = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
        if (user.usuario) {
            const params = new URLSearchParams(window.location.search);
            const materiaKey = params.get('materia') || 'sociales';
            const nombreMateria = materias[materiaKey] || materiaKey;
            
            guardarResultadoEnSupabase({
                usuario_id: user.usuario,
                usuario_nombre: user.nombre,
                materia: nombreMateria,
                puntaje: puntaje,
                total_preguntas: TOTAL_PREGUNTAS_QUIZ,
                ciudad: user.ciudad
            });
        }
    }

    inicializar();
});
