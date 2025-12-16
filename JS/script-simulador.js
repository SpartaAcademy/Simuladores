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
    
    // Títulos
    const txtTituloMateria = document.getElementById('lobby-titulo-materia');
    const txtMateria = document.getElementById('lobby-materia');
    const txtPreguntas = document.getElementById('lobby-preguntas');
    const txtTiempo = document.getElementById('lobby-tiempo');
    
    const btnRegresarLobby = document.getElementById('btn-regresar-lobby');
    if(btnRegresarLobby) {
        btnRegresarLobby.addEventListener('click', () => {
            if (window.history.length > 1) window.history.back(); 
            else window.location.href = 'index.html'; 
        });
    }
    
    let questions = [];
    let userAnswers = [];
    let currentIdx = 0;
    let timerInterval;
    let timeLeft = 3600;
    let totalPreguntas = 50;
    let carpetaEspecialID = null;
    let isTableMode = false;
    let tableUserAnswers = {}; 

    const materias = {
        'sociales': 'Ciencias Sociales', 'matematicas': 'Matemáticas y Física',
        'lengua': 'Lengua y Literatura', 'ingles': 'Inglés', 'general': 'General (Todas)',
        'inteligencia': 'Inteligencia', 'personalidad': 'Personalidad',
        'ppnn1': 'Cuestionario 1 PPNN', 'ppnn2': 'Cuestionario 2 PPNN',
        'ppnn3': 'Cuestionario 3 PPNN', 'ppnn4': 'Cuestionario 4 PPNN',
        'sociales_esmil': 'Ciencias Sociales (ESMIL)', 'matematicas_esmil': 'Matemáticas (ESMIL)',
        'lengua_esmil': 'Lenguaje (ESMIL)', 'ingles_esmil': 'Inglés (ESMIL)',
        'general_esmil': 'General ESMIL',
        'int_esmil_3': 'Inteligencia ESMIL 3 (Vocabulario)',
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
        document.getElementById('error-text').textContent = "Error de carga. Intenta recargar la página.";
        document.getElementById('error-modal').style.display = 'flex';
    }

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia') || 'sociales';
        const title = materias[materiaKey] || 'Simulador';
        
        if(txtTituloMateria) txtTituloMateria.textContent = title.toUpperCase();
        if(txtMateria) txtMateria.textContent = title;
        const headerSub = document.getElementById('header-subtitulo');
        if(headerSub) headerSub.textContent = title.toUpperCase();
        
        let fetchUrl = '';
        
        // --- 1. CONFIGURACIÓN INICIAL SEGÚN TIPO ---
        if (materiaKey === 'int_esmil_3') {
            isTableMode = true;
            fetchUrl = 'DATA/3/3.json';
            timeLeft = 1800; 
            totalPreguntas = 50;
        } 
        else if (materiaKey.startsWith('int_esmil_')) {
            carpetaEspecialID = materiaKey.split('_')[2]; 
            fetchUrl = `DATA/${carpetaEspecialID}/${carpetaEspecialID}.json`;
            timeLeft = 3600;
        } 
        else if (materiaKey.includes('matematicas')) {
            timeLeft = 5400; 
            fetchUrl = `DATA/preguntas_${materiaKey}.json`;
        } else if (materiaKey.includes('general')) { 
            timeLeft = 10800; 
            totalPreguntas = 200;
        } else {
            timeLeft = 3600; 
            fetchUrl = `DATA/preguntas_${materiaKey}.json`;
        }

        if(txtTiempo) txtTiempo.textContent = Math.floor(timeLeft/60) + " Minutos";

        try {
            // --- 2. CARGA DE ARCHIVOS JSON ---
            let filesToLoad = [];
            
            if (materiaKey === 'int_esmil_3' || materiaKey.startsWith('int_esmil_')) {
                filesToLoad = [fetchUrl];
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

            if(allQ.length === 0) throw new Error("Archivo JSON vacío.");
            questions = allQ;

            // --- 3. PROCESAMIENTO (Imágenes y Aleatoriedad) ---
            
            // A) Si es un simulador ESMIL de Carpeta (4, 5, 6)
            if(!isTableMode && materiaKey.startsWith('int_esmil_')) {
                questions = questions.map(q => {
                    if (q.imagen) {
                        const imageName = q.imagen.split('/').pop(); 
                        q.imagen = `DATA/${carpetaEspecialID}/IMAGES/${imageName}`;
                    }
                    return q;
                });
                questions.sort(() => 0.5 - Math.random());
            } 
            // B) Si es tabla (3), NO TOCAMOS EL ORDEN
            else if (isTableMode) {
                // No hacemos sort para mantener orden 1-50
            }
            // C) Si es General o PPNN
            else if (materiaKey.startsWith('ppnn') || materiaKey.includes('general')) {
                questions = questions.sort(() => 0.5 - Math.random());
                if (materiaKey.includes('general')) questions = questions.slice(0, 200);
            } 
            // D) Simuladores Normales
            else {
                questions = questions.sort(() => 0.5 - Math.random()).slice(0, 50);
            }

            if(txtPreguntas) txtPreguntas.textContent = questions.length;

            // --- 4. PRECARGA DE IMÁGENES (CON TIMEOUT DE SEGURIDAD) ---
            // Solo precargamos si NO es tabla (el 3 es puro texto)
            if(!isTableMode) {
                // Usamos Promise.race para que si tarda más de 3 segundos, avance igual
                await Promise.race([
                    preloadImages(questions),
                    new Promise(resolve => setTimeout(resolve, 3000)) // Timeout de 3 seg
                ]);
            }

            // Habilitar botón FINALMENTE
            btnStart.disabled = false;
            btnStart.innerHTML = 'COMENZAR INTENTO <i class="fas fa-play"></i>';
            btnStart.onclick = isTableMode ? startTableQuiz : startQuiz;

        } catch (e) { 
            showError(e.message); 
        }
    }

    async function preloadImages(questionsList) {
        const imagesToLoad = questionsList.filter(q => q.imagen);
        const totalImages = imagesToLoad.length;
        if (totalImages === 0) return;

        btnStart.innerHTML = `CARGANDO RECURSOS... (0/${totalImages})`;
        let loadedCount = 0;
        
        const promises = imagesToLoad.map(q => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = q.imagen;
                // Importante: Resolvemos siempre, aunque falle, para no bloquear
                img.onload = () => { 
                    loadedCount++; 
                    btnStart.innerHTML = `CARGANDO RECURSOS... (${loadedCount}/${totalImages})`; 
                    resolve(); 
                };
                img.onerror = () => { 
                    loadedCount++; 
                    // No cambiamos el texto en error para no asustar, solo seguimos
                    resolve(); 
                };
            });
        });
        await Promise.all(promises);
    }

    // ==========================================
    //  MODO TABLA (SIMULADOR 3)
    // ==========================================
    function startTableQuiz() {
        lobbyBanner.style.display = 'none';
        lobbyContainer.style.display = 'none';
        simulador.style.display = 'block';
        simulador.className = ''; 
        
        let html = `
        <div class="full-width-container">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; align-items:center;">
                <h2>TEST DE VOCABULARIO</h2>
                <div class="timer-box" style="padding:10px 20px;">
                    <i class="fas fa-clock"></i> <span id="cronometro-tabla">00:00</span>
                </div>
            </div>
            <div class="table-responsive-wrapper">
                <table class="vocab-table">
                    <thead>
                        <tr>
                            <th style="width:50px;">#</th><th>PALABRA</th><th>A</th><th>B</th><th>C</th><th>D</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        questions.forEach((q, index) => {
            html += `
            <tr id="row-${index}">
                <td><strong>${index + 1}</strong></td>
                <td class="vocab-word-cell">${q.palabra}</td>
                <td class="vocab-option-cell" onclick="selectCell(${index}, '${q.opciones[0]}', this)">${q.opciones[0]}</td>
                <td class="vocab-option-cell" onclick="selectCell(${index}, '${q.opciones[1]}', this)">${q.opciones[1]}</td>
                <td class="vocab-option-cell" onclick="selectCell(${index}, '${q.opciones[2]}', this)">${q.opciones[2]}</td>
                <td class="vocab-option-cell" onclick="selectCell(${index}, '${q.opciones[3]}', this)">${q.opciones[3]}</td>
            </tr>`;
        });

        html += `</tbody></table></div>
            <button class="btn-finish-table" onclick="finishTableQuiz()">TERMINAR Y CALIFICAR</button>
        </div>`;

        simulador.innerHTML = html;

        timerInterval = setInterval(() => {
            timeLeft--;
            const m = Math.floor(timeLeft/60).toString().padStart(2,'0');
            const s = (timeLeft%60).toString().padStart(2,'0');
            const timerEl = document.getElementById('cronometro-tabla');
            if(timerEl) timerEl.textContent = `${m}:${s}`;
            if(timeLeft<=0) finishTableQuiz();
        }, 1000);
    }

    window.selectCell = function(rowIndex, answerText, cellElement) {
        if(document.querySelector('.btn-finish-table').style.display === 'none') return;
        tableUserAnswers[rowIndex] = answerText;
        const row = document.getElementById(`row-${rowIndex}`);
        const cells = row.getElementsByClassName('vocab-option-cell');
        for(let c of cells) c.classList.remove('vocab-selected');
        cellElement.classList.add('vocab-selected');
    };

    window.finishTableQuiz = async function() {
        clearInterval(timerInterval);
        let aciertos = 0;
        questions.forEach((q, index) => {
            const row = document.getElementById(`row-${index}`);
            const cells = row.getElementsByClassName('vocab-option-cell');
            const userAnswer = tableUserAnswers[index];
            const correctAnswer = q.respuesta;

            for(let cell of cells) {
                const cellText = cell.innerText;
                if (cellText === correctAnswer) cell.classList.add('vocab-correct');
                if (cellText === userAnswer && userAnswer !== correctAnswer) cell.classList.add('vocab-incorrect');
            }
            if (userAnswer === correctAnswer) aciertos++;
        });

        const score = Math.round((aciertos * 1000) / questions.length);
        alert(`¡EXAMEN FINALIZADO!\nPUNTAJE: ${score}/1000\nACIERTOS: ${aciertos}/${questions.length}`);
        document.querySelector('.btn-finish-table').style.display = 'none';
        saveResult(score, questions.length, 'Inteligencia ESMIL 3 (Vocabulario)');
        
        const btnExit = document.createElement('button');
        btnExit.textContent = "SALIR AL MENÚ";
        btnExit.className = "btn-finish-table";
        btnExit.style.background = "#333";
        btnExit.onclick = () => window.location.href = 'index.html';
        document.querySelector('.full-width-container').appendChild(btnExit);
    };

    // ==========================================
    //  MODO NORMAL
    // ==========================================
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
        const textoFormateado = q.pregunta ? q.pregunta.replace(/\n/g, '<br>') : '';
        document.getElementById('pregunta-texto').innerHTML = textoFormateado;
        
        const imgDiv = document.getElementById('q-image-container');
        imgDiv.innerHTML = q.imagen ? `<img src="${q.imagen}" style="max-width:100%; border-radius:8px;">` : '';

        const opts = document.getElementById('opciones-container');
        opts.innerHTML = '';
        if(q.opciones) {
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
        }
        
        // Actualizar Nav
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
            
            let imgHtml = q.imagen ? `<div style="text-align:center; margin:10px 0;"><img src="${q.imagen}" style="max-width:150px; border-radius:5px;"></div>` : '';
            const textoPregunta = q.pregunta ? q.pregunta.replace(/\n/g, '<br>') : '';

            div.innerHTML = `<p><strong>${i+1}. ${textoPregunta}</strong></p>
                             ${imgHtml}
                             <p>Tu respuesta: <span style="font-weight:bold; color:${correct?'green':'red'}">${userAnswers[i]||'---'}</span></p>
                             ${!correct ? `<p style="color:green; margin-top:5px;">Correcta: <strong>${q.respuesta}</strong></p>` : ''}`;
            revContainer.appendChild(div);
        });

        // Guardar
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia');
        const title = materias[materiaKey] || materiaKey;
        saveResult(score, questions.length, title);
    }

    async function saveResult(score, total, title) {
        const userStr = sessionStorage.getItem('userInfo'); 
        if(userStr) {
            const user = JSON.parse(userStr);
            try {
                await supabase.from('resultados').insert([{
                    usuario_id: user.usuario, usuario_nombre: user.nombre, materia: title,
                    puntaje: score, total_preguntas: total, ciudad: user.ciudad
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
