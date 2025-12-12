// JS/script-simulador.js

// Inicializar Supabase
const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {

    // REFERENCIAS
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
    const modalOverlay = document.getElementById('modal-overlay');
    const modalMensaje = document.getElementById('modal-mensaje');
    const errorModal = document.getElementById('error-modal');
    const errorText = document.getElementById('error-text');

    let preguntasPorMateria = {};
    let preguntasQuiz = [];
    let respuestasUsuario = [];
    let indicePreguntaActual = 0;
    let cronometroInterval;
    let tiempoRestanteSeg;
    let TOTAL_PREGUNTAS_QUIZ = 50;

    // LISTA DE MATERIAS (Estructura Original)
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
        console.error(msg);
        errorText.innerHTML = msg;
        errorModal.style.display = 'flex';
        comenzarBtn.textContent = "Error";
        comenzarBtn.style.background = "#d32f2f";
    }
    
    function inicializar() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia') || 'sociales';
        let nombreMateria = materias[materiaKey] || 'Desconocida';

        if(lobbyMateria) lobbyMateria.textContent = nombreMateria;

        let quizDurationSeconds = 3600; 

        if (materiaKey.startsWith('ppnn')) {
            // Instrucciones PPNN
            const instructionsDiv = document.getElementById('instructions');
            if(instructionsDiv) instructionsDiv.innerHTML = '<p><strong>ATENCIÓN:</strong> Responda rápido y eficazmente.</p>';
        } else if (materiaKey.includes('matematicas')) {
            quizDurationSeconds = 5400; // 90 min
        } else if (materiaKey.includes('general')) {
            quizDurationSeconds = 10800; // 3h
            TOTAL_PREGUNTAS_QUIZ = 200;
        }

        tiempoRestanteSeg = quizDurationSeconds;
        if(document.getElementById('lobby-tiempo')) 
            document.getElementById('lobby-tiempo').textContent = Math.floor(quizDurationSeconds/60) + " Minutos";

        cargarPreguntas(materiaKey);

        // Listeners
        if(siguienteBtn) siguienteBtn.addEventListener('click', irPreguntaSiguiente);
        if(terminarIntentoBtn) terminarIntentoBtn.addEventListener('click', confirmarTerminarIntento);
        if(document.getElementById('reiniciar-btn')) document.getElementById('reiniciar-btn').addEventListener('click', () => location.href='index.html');
        if(document.getElementById('retry-btn')) document.getElementById('retry-btn').addEventListener('click', () => location.reload());
        if(document.getElementById('cancelar-modal-btn')) document.getElementById('cancelar-modal-btn').addEventListener('click', () => modalOverlay.style.display='none');
        if(document.getElementById('confirmar-modal-btn')) document.getElementById('confirmar-modal-btn').addEventListener('click', () => { modalOverlay.style.display='none'; finalizarIntento(); });
    }

    async function cargarPreguntas(materia) {
        let materiasACargar = [];
        if (materia === 'general') materiasACargar = ordenGeneralPolicia;
        else if (materia === 'general_esmil') materiasACargar = ordenGeneralEsmil;
        else materiasACargar = [materia];

        try {
            const promesas = materiasACargar.map(m =>
                // IMPORTANTE: Aquí se define la ruta plana: DATA/preguntas_X.json
                fetch(`DATA/preguntas_${m}.json`)
                    .then(res => {
                        if (!res.ok) throw new Error(`Falta el archivo: <b>DATA/preguntas_${m}.json</b>`);
                        return res.json();
                    })
            );

            const resultados = await Promise.all(promesas);
            
            let todas = [];
            resultados.forEach(data => todas = todas.concat(data));

            // Si es PPNN, usar todas
            if(materia.startsWith('ppnn')) {
                TOTAL_PREGUNTAS_QUIZ = todas.length;
            }

            if(lobbyPreguntasDisplay) lobbyPreguntasDisplay.textContent = TOTAL_PREGUNTAS_QUIZ;

            // Precarga simple
            preguntasPorMateria[materia] = todas;
            
            comenzarBtn.disabled = false;
            comenzarBtn.textContent = 'COMENZAR INTENTO';
            comenzarBtn.onclick = () => iniciarIntento(materia);

        } catch (error) {
            showError(error.message);
        }
    }

    function iniciarIntento(materiaKey) {
        // Preparar array final
        let pool = preguntasPorMateria[materiaKey];
        
        if(materiaKey.startsWith('ppnn')) {
            preguntasQuiz = pool.sort(() => 0.5 - Math.random());
        } else if (materiaKey.includes('general')) {
            // Mezclar y tomar 50 de cada (lógica simplificada: tomar 200 random del total)
            preguntasQuiz = pool.sort(() => 0.5 - Math.random()).slice(0, TOTAL_PREGUNTAS_QUIZ);
        } else {
            preguntasQuiz = pool.sort(() => 0.5 - Math.random()).slice(0, 50);
        }
        
        if (preguntasQuiz.length === 0) { showError("Error: No hay preguntas cargadas."); return; }

        respuestasUsuario = new Array(preguntasQuiz.length).fill(null);
        lobbyContainer.style.display = 'none';
        simuladorContainer.style.display = 'block';
        
        construirNavegador();
        mostrarPregunta(0);
        iniciarCronometro();
    }

    function mostrarPregunta(idx) {
        indicePreguntaActual = idx;
        const q = preguntasQuiz[idx];
        preguntaNumero.textContent = `Pregunta ${idx + 1}`;
        
        // Manejo seguro imagen
        let imgHtml = '';
        if(q.imagen) imgHtml = `<img src="${q.imagen}" onerror="this.style.display='none'" style="max-width:100%; border-radius:8px; margin-top:10px;">`;
        
        preguntaTexto.innerHTML = `<span>${q.pregunta}</span>${imgHtml}`;
        
        opcionesContainer.innerHTML = '';
        q.opciones.forEach(op => {
            const btn = document.createElement('button');
            btn.className = 'opcion-btn'; // Asegúrate de tener este estilo en CSS
            btn.style.cssText = "display:block; width:100%; padding:10px; margin:5px 0; text-align:left; border:1px solid #ccc; background:white; cursor:pointer;";
            if(respuestasUsuario[idx] === op) btn.style.background = "#e3f2fd";
            
            btn.textContent = op;
            btn.onclick = () => {
                respuestasUsuario[idx] = op;
                document.querySelectorAll('.nav-btn')[idx].style.background = "#2196f3";
                document.querySelectorAll('.nav-btn')[idx].style.color = "white";
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
            btn.style.cssText = "width:35px; height:35px; margin:2px; border:1px solid #ccc; cursor:pointer;";
            btn.onclick = () => mostrarPregunta(i);
            navegadorPreguntas.appendChild(btn);
        });
    }

    function irPreguntaSiguiente() {
        if(indicePreguntaActual < preguntasQuiz.length - 1) mostrarPregunta(indicePreguntaActual + 1);
    }

    function confirmarTerminarIntento() {
        modalMensaje.textContent = "¿Estás seguro de terminar?";
        modalOverlay.style.display = 'flex';
    }

    function iniciarCronometro() {
        cronometroInterval = setInterval(() => {
            tiempoRestanteSeg--;
            const m = Math.floor(tiempoRestanteSeg / 60);
            const s = tiempoRestanteSeg % 60;
            document.getElementById('cronometro').textContent = `${m}:${s < 10 ? '0'+s : s}`;
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
        puntajeFinalDisplay.textContent = score;
        statsCorrectas.textContent = correctas;
        statsIncorrectas.textContent = preguntasQuiz.length - correctas;

        // GUARDAR (Protegido)
        const user = JSON.parse(sessionStorage.getItem('sparta_user') || sessionStorage.getItem('userInfo')); // Soporte para ambos nombres de sesion
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
            } catch(e) {
                showError("No se guardó el resultado: " + e.message);
            }
        }
    }

    inicializar();
});
