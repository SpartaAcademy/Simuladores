// CONEXIÓN
const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    // Referencias DOM
    const lobbyBanner = document.getElementById('lobby-banner');
    const lobbyContainer = document.getElementById('lobby-container');
    const simulador = document.getElementById('simulador-container');
    const resultados = document.getElementById('resultados-container');
    const btnStart = document.getElementById('comenzar-btn');
    const btnNext = document.getElementById('siguiente-btn');
    const navContainer = document.getElementById('navegador-preguntas');
    
    // Títulos y Textos
    const txtTituloMateria = document.getElementById('lobby-titulo-materia');
    const txtMateria = document.getElementById('lobby-materia');
    const txtPreguntas = document.getElementById('lobby-preguntas');
    const txtTiempo = document.getElementById('lobby-tiempo');
    
    // Botón Regresar
    const btnRegresarLobby = document.getElementById('btn-regresar-lobby');
    if(btnRegresarLobby) {
        btnRegresarLobby.addEventListener('click', () => {
            if (window.history.length > 1) { window.history.back(); } 
            else { window.location.href = 'index.html'; }
        });
    }
    
    let questions = [];
    let userAnswers = [];
    let currentIdx = 0;
    let timerInterval;
    let timeLeft = 3600;
    let totalPreguntas = 50;
    let carpetaEspecialID = null; // Para guardar el ID de carpeta (4, 5, 6)

    const materias = {
        'sociales': 'Ciencias Sociales', 'matematicas': 'Matemáticas y Física',
        'lengua': 'Lengua y Literatura', 'ingles': 'Inglés', 'general': 'General (Todas)',
        'inteligencia': 'Inteligencia', 'personalidad': 'Personalidad',
        'ppnn1': 'Cuestionario 1 PPNN', 'ppnn2': 'Cuestionario 2 PPNN',
        'ppnn3': 'Cuestionario 3 PPNN', 'ppnn4': 'Cuestionario 4 PPNN',
        'sociales_esmil': 'Ciencias Sociales (ESMIL)', 'matematicas_esmil': 'Matemáticas (ESMIL)',
        'lengua_esmil': 'Lenguaje (ESMIL)', 'ingles_esmil': 'Inglés (ESMIL)',
        'general_esmil': 'General ESMIL',
        // NUEVOS SIMULADORES ESMIL
        'int_esmil_4': 'Inteligencia ESMIL 4',
        'int_esmil_5': 'Inteligencia ESMIL 5',
        'int_esmil_6': 'Inteligencia ESMIL 6'
    };

    const ordenGeneralPolicia = ['sociales', 'matematicas', 'lengua', 'ingles'];
    const ordenGeneralEsmil = ['sociales_esmil', 'matematicas_esmil', 'lengua_esmil', 'ingles_esmil'];

    function showError(msg) {
        console.error(msg);
        btnStart.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error: ${msg}`;
        btnStart.style.background = "#c0392b";
        document.getElementById('error-text').textContent = "No se pudo cargar el archivo. Verifique la carpeta DATA.";
        document.getElementById('error-modal').style.display = 'flex';
    }

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia') || 'sociales';
        const title = materias[materiaKey] || 'Simulador';
        
        // Títulos
        if(txtTituloMateria) txtTituloMateria.textContent = title.toUpperCase();
        if(txtMateria) txtMateria.textContent = title;
        document.getElementById('header-subtitulo').textContent = title.toUpperCase();
        
        // --- CONFIGURACIÓN DE TIEMPO Y RUTA ---
        let fetchUrl = '';
        
        // Caso Especial: Simuladores Inteligencia ESMIL (DATA/N/N.json)
        if (materiaKey.startsWith('int_esmil_')) {
            carpetaEspecialID = materiaKey.split('_')[2]; // Obtiene '4', '5' o '6'
            fetchUrl = `DATA/${carpetaEspecialID}/${carpetaEspecialID}.json`;
            timeLeft = 3600; // 1 Hora
            totalPreguntas = 50; // Provisional hasta cargar
        } 
        // Casos Normales
        else if (materiaKey.includes('matematicas')) {
            timeLeft = 5400; 
            fetchUrl = `DATA/preguntas_${materiaKey}.json`;
        } else if (materiaKey.includes('general')) { 
            timeLeft = 10800; 
            totalPreguntas = 200;
            // General se maneja con array de cargas abajo
        } else {
            timeLeft = 3600; 
            fetchUrl = `DATA/preguntas_${materiaKey}.json`;
        }

        if(txtTiempo) txtTiempo.textContent = Math.floor(timeLeft/60) + " Minutos";

        try {
            let filesToLoad = [];
            
            // Definir qué cargar
            if (materiaKey.startsWith('int_esmil_')) {
                filesToLoad = [fetchUrl]; // Carga directa del archivo especial
            } else if(materiaKey === 'general') {
                filesToLoad = ordenGeneralPolicia.map(m => `DATA/preguntas_${m}.json`);
            } else if(materiaKey === 'general_esmil') {
                filesToLoad = ordenGeneralEsmil.map(m => `DATA/preguntas_${m}.json`);
            } else {
                filesToLoad = [fetchUrl];
            }

            const promises = filesToLoad.map(url => 
                fetch(url).then(r => {
                    if(!r.ok) throw new Error(`Falta: ${url}`);
                    return r.json();
                })
            );

            const results = await Promise.all(promises);
            let allQ = [];
            results.forEach(d => allQ = allQ.concat(d));

            // --- PROCESAMIENTO DE PREGUNTAS ---
            if(materiaKey.startsWith('ppnn')) {
                questions = allQ.sort(() => 0.5 - Math.random());
            } else if (materiaKey.includes('general')) {
                questions = allQ.sort(() => 0.5 - Math.random()).slice(0, 200);
            } else if (materiaKey.startsWith('int_esmil_')) {
                // Para Inteligencia ESMIL usamos todas las preguntas del JSON sin recortar (o recortamos a 50 si quieres)
                // Dejemos todas por ahora, o ajusta .slice(0,50) si prefieres
                questions = allQ; 
            } else {
                questions = allQ.sort(() => 0.5 - Math.random()).slice(0, 50);
            }

            if(questions.length === 0) throw new Error("Archivo vacío.");

            // Actualizar total real
            if(txtPreguntas) txtPreguntas.textContent = questions.length;

            btnStart.disabled = false;
            btnStart.innerHTML = 'COMENZAR INTENTO <i class="fas fa-play"></i>';
            btnStart.onclick = startQuiz;

        } catch (e) { 
            showError(e.message); 
        }
    }

    function startQuiz() {
        lobbyBanner.style.display = 'none'; 
        lobbyContainer.style.display = 'none';
        
        simulador.className = 'quiz-layout';
        simulador.style.display = window.innerWidth > 900 ? 'grid' : 'flex';
        
        userAnswers = new Array(questions.length).fill(null);
        renderNav();
        showQ(0);
        
        timerInterval = setInterval(() => {
            timeLeft--;
            const m = Math.floor(timeLeft/60).toString().padStart(2,'0');
            const s = (timeLeft%60).toString().padStart(2,'0');
            document.getElementById('cronometro').textContent = `${m}:${s}`;
            if(timeLeft<=0) finish();
        }, 1000);
    }

    function showQ(idx) {
        currentIdx = idx;
        const q = questions[idx];
        document.getElementById('pregunta-numero').textContent = `Pregunta ${idx+1}`;
        document.getElementById('pregunta-texto').textContent = q.pregunta;
        
        const imgDiv = document.getElementById('q-image-container');
        
        // --- LÓGICA DE IMÁGENES PARA CARPETAS ESPECIALES ---
        let imgSrc = q.imagen;
        if (imgSrc && carpetaEspecialID) {
            // Si estamos en un simulador especial (ej: 4), y la imagen en el JSON dice "IMAGES/foto.jpg"
            // Transformamos la ruta a "DATA/4/IMAGES/foto.jpg"
            if (!imgSrc.includes(`DATA/${carpetaEspecialID}`)) {
                imgSrc = `DATA/${carpetaEspecialID}/${q.imagen}`;
            }
        }

        imgDiv.innerHTML = imgSrc ? `<img src="${imgSrc}" onerror="this.style.display='none'" style="max-width:100%; border-radius:8px;">` : '';

        const opts = document.getElementById('opciones-container');
        opts.innerHTML = '';
        q.opciones.forEach(op => {
            const btn = document.createElement('button');
            btn.className = 'opcion-btn';
            if(userAnswers[idx] === op) btn.classList.add('selected');
            btn.textContent = op;
            btn.onclick = () => {
                userAnswers[idx] = op;
                const all = opts.querySelectorAll('.opcion-btn');
                all.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                const dots = navContainer.children;
                if(dots[idx]) dots[idx].classList.add('answered');
            };
            opts.appendChild(btn);
        });
        
        const dots = navContainer.children;
        for(let i=0; i<dots.length; i++) {
            dots[i].classList.remove('active');
            if(i === idx) dots[i].classList.add('active');
        }

        if (idx === questions.length - 1) {
            btnNext.textContent = "Finalizar";
            btnNext.style.backgroundColor = "#27ae60"; 
        } else {
            btnNext.textContent = "Siguiente";
            btnNext.style.backgroundColor = "#b22222"; 
        }
    }

    function renderNav() {
        navContainer.innerHTML = '';
        questions.forEach((_, i) => {
            const b = document.createElement('button');
            b.className = 'nav-dot';
            b.textContent = i+1;
            b.style.cursor = "default"; 
            navContainer.appendChild(b);
        });
    }

    btnNext.onclick = () => {
        if (currentIdx < questions.length - 1) showQ(currentIdx + 1);
        else finish();
    };

    async function finish() {
        clearInterval(timerInterval);
        simulador.style.display = 'none';
        resultados.style.display = 'block';

        let ok = 0;
        questions.forEach((q, i) => { if(userAnswers[i] === q.respuesta) ok++; });
        const score = Math.round((ok * 1000) / questions.length);

        document.getElementById('puntaje-final').textContent = score;
        document.getElementById('stats-correctas').textContent = ok;
        document.getElementById('stats-incorrectas').textContent = questions.length - ok;
        document.getElementById('stats-en-blanco').textContent = userAnswers.filter(a=>a===null).length;

        const revContainer = document.getElementById('revision-container');
        revContainer.innerHTML = '';
        questions.forEach((q, i) => {
            const div = document.createElement('div');
            div.style.borderBottom = '1px solid #eee'; div.style.padding = '15px';
            const correct = userAnswers[i] === q.respuesta;
            
            // Imagen en revisión también necesita la ruta corregida
            let imgSrc = q.imagen;
            if (imgSrc && carpetaEspecialID && !imgSrc.includes(`DATA/${carpetaEspecialID}`)) {
                imgSrc = `DATA/${carpetaEspecialID}/${q.imagen}`;
            }

            let imgHtml = imgSrc ? `<div style="text-align:center; margin:10px 0;"><img src="${imgSrc}" style="max-width:150px; border-radius:5px;"></div>` : '';
            
            div.innerHTML = `<p><strong>${i+1}. ${q.pregunta}</strong></p>
                             ${imgHtml}
                             <p>Tu respuesta: <span style="font-weight:bold; color:${correct?'green':'red'}">${userAnswers[i]||'---'}</span></p>
                             ${!correct ? `<p style="color:green; margin-top:5px;">Correcta: <strong>${q.respuesta}</strong></p>` : ''}`;
            revContainer.appendChild(div);
        });

        const userStr = sessionStorage.getItem('userInfo'); 
        if(userStr) {
            const user = JSON.parse(userStr);
            const params = new URLSearchParams(window.location.search);
            const materiaKey = params.get('materia');
            // Usamos el nombre bonito del mapa 'materias' o el código si no existe
            const title = materias[materiaKey] || materiaKey;
            
            try {
                await supabase.from('resultados').insert([{
                    usuario_id: user.usuario, usuario_nombre: user.nombre, materia: title,
                    puntaje: score, total_preguntas: questions.length, ciudad: user.ciudad
                }]);
            } catch(e) { console.error(e); }
        }
    }

    document.getElementById('terminar-intento-btn').onclick = () => {
        document.getElementById('modal-mensaje').textContent = `Faltan ${userAnswers.filter(a=>a===null).length} preguntas.`;
        document.getElementById('modal-overlay').style.display = 'flex';
    };
    document.getElementById('confirmar-modal-btn').onclick = () => { document.getElementById('modal-overlay').style.display='none'; finish(); };
    document.getElementById('cancelar-modal-btn').onclick = () => document.getElementById('modal-overlay').style.display='none';
    document.getElementById('retry-btn').onclick = () => location.reload();
    document.getElementById('reiniciar-btn').onclick = () => location.href='index.html';

    init();
});
