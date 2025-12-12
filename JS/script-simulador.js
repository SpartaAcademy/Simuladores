// JS/script-simulador.js

// Inicializar Supabase


// JS/script-simulador.js

console.log(">>> INICIANDO script-simulador.js <<<");

// 1. CONEXIÓN SUPABASE
const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';

let supabase;
try {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log("Supabase inicializado correctamente.");
} catch (e) {
    console.error("CRÍTICO: Falló la inicialización de Supabase:", e);
    alert("Error crítico: No se pudo conectar con la base de datos.");
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM completamente cargado. Iniciando lógica...");

    // Referencias DOM
    const lobbyContainer = document.getElementById('lobby-container');
    const simuladorContainer = document.getElementById('simulador-container');
    const resultadosContainer = document.getElementById('resultados-container');
    const lobbyMateria = document.getElementById('lobby-materia');
    const lobbyPreguntasDisplay = document.getElementById('lobby-preguntas');
    const comenzarBtn = document.getElementById('comenzar-btn');
    const preguntaNumero = document.getElementById('pregunta-numero');
    const preguntaTexto = document.getElementById('pregunta-texto');
    const opcionesContainer = document.getElementById('opciones-container');
    const navegadorPreguntas = document.getElementById('navegador-preguntas');
    const siguienteBtn = document.getElementById('siguiente-btn');
    const terminarIntentoBtn = document.getElementById('terminar-intento-btn');
    const puntajeFinalDisplay = document.getElementById('puntaje-final');
    const statsCorrectas = document.getElementById('stats-correctas');
    const statsIncorrectas = document.getElementById('stats-incorrectas');
    const statsEnBlanco = document.getElementById('stats-en-blanco');
    const revisionContainer = document.getElementById('revision-container');
    
    // Modales
    const modalOverlay = document.getElementById('modal-overlay');
    const modalError = document.getElementById('error-modal');
    const errorText = document.getElementById('error-text');

    if(!comenzarBtn) { console.error("CRÍTICO: No se encontró el botón 'comenzar-btn' en el HTML."); return; }

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

    const ordenGeneralPolicia = ['sociales', 'matematicas', 'lengua', 'ingles'];
    const ordenGeneralEsmil = ['sociales_esmil', 'matematicas_esmil', 'lengua_esmil', 'ingles_esmil'];

    function showError(msg) {
        console.error("MOSTRANDO ERROR AL USUARIO:", msg);
        if(errorText && modalError) {
            errorText.innerHTML = msg;
            modalError.style.display = 'flex';
        } else {
            alert("ERROR: " + msg);
        }
        if(comenzarBtn) {
            comenzarBtn.textContent = "Error de Carga";
            comenzarBtn.style.backgroundColor = "#d32f2f";
            comenzarBtn.disabled = true;
        }
    }

    function inicializar() {
        console.log("Ejecutando función inicializar()...");
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia');
        console.log("Materia detectada en URL:", materiaKey);

        if (!materiaKey) {
            showError("No se especificó ninguna materia.");
            return;
        }
        
        let nombreMateria = materias[materiaKey];
        if (!nombreMateria) {
            if (materiaKey.startsWith('ppnn')) nombreMateria = `Cuestionario ${materiaKey.replace('ppnn', '')} PPNN`;
            else nombreMateria = 'Materia Desconocida';
        }
        console.log("Nombre de materia resuelto:", nombreMateria);

        // Actualizar UI inicial
        if(document.getElementById('titulo-materia')) document.getElementById('titulo-materia').textContent = `SIMULADOR DE: ${nombreMateria.toUpperCase()}`;
        if(lobbyMateria) lobbyMateria.textContent = nombreMateria;

        let quizDurationSeconds = 3600; 
        if (materiaKey.startsWith('ppnn')) {
            quizDurationSeconds = 3600;
            const extra = document.getElementById('instrucciones-adicionales');
            if(extra) extra.innerHTML = '<p style="color:#b22222; font-weight:bold;">Prueba de velocidad y precisión.</p>';
        } else if (materiaKey.includes('matematicas')) {
            quizDurationSeconds = 5400; 
        } else if (materiaKey.includes('general')) {
            quizDurationSeconds = 10800; 
            TOTAL_PREGUNTAS_QUIZ = 200;
        }

        tiempoRestanteSeg = quizDurationSeconds;
        if(document.getElementById('lobby-tiempo')) document.getElementById('lobby-tiempo').textContent = Math.floor(quizDurationSeconds/60) + " Minutos";
        if(lobbyPreguntasDisplay) lobbyPreguntasDisplay.textContent = TOTAL_PREGUNTAS_QUIZ;

        console.log("Configuración inicial completa. Llamando a cargarPreguntas...");
        cargarPreguntas(materiaKey);
    }

    async function cargarPreguntas(materia) {
        console.log(`Iniciando carga de preguntas para: ${materia}`);
        let materiasACargar = [];
        if (materia === 'general') materiasACargar = ordenGeneralPolicia;
        else if (materia === 'general_esmil') materiasACargar = ordenGeneralEsmil;
        else materiasACargar = [materia];

        console.log("Archivos a cargar:", materiasACargar.map(m => `DATA/preguntas_${m}.json`));

        try {
            const promesas = materiasACargar.map(m => {
                const url = `DATA/preguntas_${m}.json`;
                console.log(`Haciendo fetch a: ${url}`);
                return fetch(url)
                    .then(res => {
                        if (!res.ok) {
                            console.error(`Error en fetch ${url}: Status ${res.status}`);
                            throw new Error(`No se encontró el archivo: <b>${url}</b> (Error ${res.status})`);
                        }
                        console.log(`Fetch OK: ${url}`);
                        return res.json();
                    });
            });

            const resultados = await Promise.all(promesas);
            console.log("Todos los fetch completados exitosamente.");
            
            let todas = [];
            resultados.forEach(data => todas = todas.concat(data));
            console.log(`Total preguntas cargadas: ${todas.length}`);

            if(todas.length === 0) throw new Error("Los archivos JSON estaban vacíos.");

            if(materia.startsWith('ppnn')) {
                TOTAL_PREGUNTAS_QUIZ = todas.length;
                if(lobbyPreguntasDisplay) lobbyPreguntasDisplay.textContent = TOTAL_PREGUNTAS_QUIZ;
            }

            preguntasPorMateria[materia] = todas;
            
            console.log("Habilitando botón Comenzar...");
            comenzarBtn.disabled = false;
            comenzarBtn.textContent = 'COMENZAR INTENTO';
            comenzarBtn.onclick = () => {
                console.log("Click en Comenzar. Iniciando intento...");
                iniciarIntento(materia);
            };

        } catch (error) {
            console.error("Error atrapado en cargarPreguntas:", error);
            showError(error.message);
        }
    }

    function iniciarIntento(materiaKey) {
        let pool = preguntasPorMateria[materiaKey];
        
        if(materiaKey.startsWith('ppnn')) {
            preguntasQuiz = pool.sort(() => 0.5 - Math.random());
        } else if (materiaKey.includes('general')) {
            preguntasQuiz = pool.sort(() => 0.5 - Math.random()).slice(0, TOTAL_PREGUNTAS_QUIZ);
        } else {
            preguntasQuiz = pool.sort(() => 0.5 - Math.random()).slice(0, 50);
        }
        
        console.log(`Quiz preparado con ${preguntasQuiz.length} preguntas.`);
        respuestasUsuario = new Array(preguntasQuiz.length).fill(null);
        
        lobbyContainer.style.display = 'none';
        simuladorContainer.style.display = 'flex';
        
        construirNavegador();
        mostrarPregunta(0);
        iniciarCronometro();
    }

    function mostrarPregunta(idx) {
        indicePreguntaActual = idx;
        const q = preguntasQuiz[idx];
        preguntaNumero.textContent = `Pregunta ${idx + 1}`;
        
        const imgDiv = document.getElementById('q-image-container');
        if(q.imagen) {
            // Intenta cargar imagen, si falla la oculta sin romper nada
            imgDiv.innerHTML = `<img src="${q.imagen}" onerror="this.style.display='none'; console.warn('No se pudo cargar imagen: ${q.imagen}');" class="pregunta-imagen">`;
        } else {
            imgDiv.innerHTML = '';
        }
        
        preguntaTexto.innerHTML = q.pregunta;
        
        opcionesContainer.innerHTML = '';
        q.opciones.forEach(op => {
            const btn = document.createElement('button');
            btn.className = 'opcion-btn';
            if(respuestasUsuario[idx] === op) btn.classList.add('selected');
            
            btn.textContent = op;
            btn.onclick = () => {
                respuestasUsuario[idx] = op;
                const navBtn = document.querySelectorAll('.nav-btn')[idx];
                if(navBtn) navBtn.classList.add('answered');
                mostrarPregunta(idx);
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
        const modalMensaje = document.getElementById('modal-mensaje');
        if(modalMensaje) modalMensaje.textContent = `¿Seguro que quieres terminar? Tienes ${respuestasUsuario.filter(r=>r===null).length} sin responder.`;
        if(modalOverlay) modalOverlay.style.display = 'flex';
    }

    function iniciarCronometro() {
        console.log("Cronómetro iniciado.");
        cronometroInterval = setInterval(() => {
            tiempoRestanteSeg--;
            const m = Math.floor(tiempoRestanteSeg / 60);
            const s = tiempoRestanteSeg % 60;
            const cronometroDisplay = document.getElementById('cronometro');
            if(cronometroDisplay) cronometroDisplay.textContent = `${m}:${s < 10 ? '0'+s : s}`;
            if(tiempoRestanteSeg <= 0) finalizarIntento();
        }, 1000);
    }

    async function finalizarIntento() {
        console.log("Finalizando intento...");
        clearInterval(cronometroInterval);
        simuladorContainer.style.display = 'none';
        resultadosContainer.style.display = 'block';

        let correctas = 0;
        preguntasQuiz.forEach((q, i) => { if(respuestasUsuario[i] === q.respuesta) correctas++; });
        
        const score = Math.round((correctas * 1000) / preguntasQuiz.length) || 0;
        if(puntajeFinalDisplay) puntajeFinalDisplay.textContent = score;
        if(statsCorrectas) statsCorrectas.textContent = correctas;
        if(statsIncorrectas) statsIncorrectas.textContent = preguntasQuiz.length - correctas;
        if(statsEnBlanco) statsEnBlanco.textContent = respuestasUsuario.filter(r=>r===null).length;

        // Feedback
        if(revisionContainer) {
            revisionContainer.innerHTML = '';
            preguntasQuiz.forEach((q, i) => {
                const div = document.createElement('div');
                div.className = 'revision-pregunta';
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
        const userStr = sessionStorage.getItem('userInfo'); 
        if(userStr) {
            const user = JSON.parse(userStr);
            console.log("Intentando guardar en Supabase para usuario:", user.usuario);
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
                console.log("Resultado guardado exitosamente en Supabase.");
            } catch(e) {
                console.error("Error al guardar en Supabase:", e.message);
                alert("Tu nota se calculó, pero hubo un error al guardarla en la nube. Toma una captura.");
            }
        } else {
            console.warn("No se encontró información de usuario en sessionStorage. No se guardó el resultado.");
        }
    }

    // Inicializar
    inicializar();

    // Listeners
    if(siguienteBtn) siguienteBtn.addEventListener('click', irPreguntaSiguiente);
    if(terminarIntentoBtn) terminarIntentoBtn.addEventListener('click', confirmarTerminarIntento);
    if(document.getElementById('reiniciar-btn')) document.getElementById('reiniciar-btn').addEventListener('click', () => location.href='index.html');
    if(document.getElementById('retry-btn')) document.getElementById('retry-btn').addEventListener('click', () => location.reload());
    if(document.getElementById('cancelar-modal-btn')) document.getElementById('cancelar-modal-btn').addEventListener('click', () => modalOverlay.style.display='none');
    if(document.getElementById('confirmar-modal-btn')) document.getElementById('confirmar-modal-btn').addEventListener('click', () => { modalOverlay.style.display='none'; finalizarIntento(); });
});
