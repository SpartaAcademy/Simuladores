const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const lobbyBanner = document.getElementById('lobby-banner');
    const lobbyContainer = document.getElementById('lobby-container');
    const simulador = document.getElementById('simulador-container');
    const resultados = document.getElementById('resultados-container');
    const btnStart = document.getElementById('comenzar-btn');
    const txtTituloMateria = document.getElementById('lobby-titulo-materia');
    const txtMateria = document.getElementById('lobby-materia');
    const txtPreguntas = document.getElementById('lobby-preguntas');
    const txtTiempo = document.getElementById('lobby-tiempo');
    
    // Botón regresar
    const btnBack = document.getElementById('btn-regresar-lobby');
    if(btnBack) btnBack.addEventListener('click', () => window.history.length > 1 ? window.history.back() : window.location.href = 'index.html');

    let questions = [];
    let userAnswers = [];
    let currentIdx = 0;
    let timerInterval;
    let timeLeft = 3600;
    let carpetaEspecialID = null;
    let isTableMode = false;
    let tableUserAnswers = {};

    const materias = {
        'sociales': 'Ciencias Sociales', 'matematicas': 'Matemáticas y Física', 'lengua': 'Lengua y Literatura', 'ingles': 'Inglés', 'general': 'General (Todas)',
        'inteligencia': 'Inteligencia', 'personalidad': 'Personalidad',
        'ppnn1': 'Cuestionario 1 PPNN', 'ppnn2': 'Cuestionario 2 PPNN', 'ppnn3': 'Cuestionario 3 PPNN', 'ppnn4': 'Cuestionario 4 PPNN',
        'sociales_esmil': 'Ciencias Sociales (ESMIL)', 'matematicas_esmil': 'Matemáticas (ESMIL)', 'lengua_esmil': 'Lenguaje (ESMIL)', 'ingles_esmil': 'Inglés (ESMIL)', 'general_esmil': 'General ESMIL',
        'int_esmil_3': 'Inteligencia ESMIL 3 (Vocabulario)', 'int_esmil_4': 'Inteligencia ESMIL 4', 'int_esmil_5': 'Inteligencia ESMIL 5', 'int_esmil_6': 'Inteligencia ESMIL 6'
    };

    const ordenGeneralPolicia = ['sociales', 'matematicas', 'lengua', 'ingles'];
    const ordenGeneralEsmil = ['sociales_esmil', 'matematicas_esmil', 'lengua_esmil', 'ingles_esmil'];

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia') || 'sociales';
        const title = materias[materiaKey] || 'Simulador';
        
        if(txtTituloMateria) txtTituloMateria.textContent = title.toUpperCase();
        if(txtMateria) txtMateria.textContent = title;

        let fetchUrl = '';
        if (materiaKey === 'int_esmil_3') {
            isTableMode = true; fetchUrl = 'DATA/3/3.json'; timeLeft = 1800;
        } else if (materiaKey.startsWith('int_esmil_')) {
            carpetaEspecialID = materiaKey.split('_')[2]; fetchUrl = `DATA/${carpetaEspecialID}/${carpetaEspecialID}.json`; timeLeft = 3600;
        } else if (materiaKey.includes('matematicas')) {
            timeLeft = 5400; fetchUrl = `DATA/preguntas_${materiaKey}.json`;
        } else if (materiaKey.includes('general')) {
            timeLeft = 10800; fetchUrl = `DATA/preguntas_${materiaKey}.json`;
        } else {
            timeLeft = 3600; fetchUrl = `DATA/preguntas_${materiaKey}.json`;
        }

        if(txtTiempo) txtTiempo.textContent = Math.floor(timeLeft/60) + " Minutos";

        try {
            let filesToLoad = [];
            if (materiaKey === 'int_esmil_3' || materiaKey.startsWith('int_esmil_')) filesToLoad = [fetchUrl];
            else if(materiaKey === 'general') filesToLoad = ordenGeneralPolicia.map(m => `DATA/preguntas_${m}.json`);
            else if(materiaKey === 'general_esmil') filesToLoad = ordenGeneralEsmil.map(m => `DATA/preguntas_${m}.json`);
            else filesToLoad = [fetchUrl];

            const promises = filesToLoad.map(url => fetch(url).then(r => r.ok ? r.json() : null));
            const results = await Promise.all(promises);
            let allQ = [];
            results.forEach(d => { if(d) allQ = allQ.concat(d); });

            if(allQ.length === 0) throw new Error("No se encontraron preguntas.");
            questions = allQ;

            // Procesamiento
            if (!isTableMode && materiaKey.startsWith('int_esmil_')) {
                questions = questions.map(q => {
                    if (q.imagen) q.imagen = `DATA/${carpetaEspecialID}/IMAGES/${q.imagen.split('/').pop()}`;
                    return q;
                }).sort(() => 0.5 - Math.random());
            } else if (!isTableMode) {
                if (materiaKey.startsWith('ppnn')) questions.sort(() => 0.5 - Math.random());
                else if (materiaKey.includes('general')) questions.sort(() => 0.5 - Math.random()).slice(0, 200);
                else questions.sort(() => 0.5 - Math.random()).slice(0, 50);
            }

            if(txtPreguntas) txtPreguntas.textContent = questions.length;

            // Preload (Con seguridad)
            if(!isTableMode && questions.some(q => q.imagen)) {
                btnStart.innerHTML = "CARGANDO RECURSOS...";
                await Promise.race([preloadImages(questions), new Promise(r => setTimeout(r, 2500))]);
            }

            btnStart.disabled = false;
            btnStart.innerHTML = 'COMENZAR INTENTO <i class="fas fa-play"></i>';
            btnStart.onclick = isTableMode ? startTableQuiz : startQuiz;

        } catch (e) {
            btnStart.innerHTML = "ERROR AL CARGAR";
            btnStart.style.background = "#c0392b";
            console.error(e);
        }
    }

    async function preloadImages(list) {
        const imgs = list.filter(q => q.imagen);
        await Promise.all(imgs.map(q => new Promise(resolve => {
            const i = new Image(); i.src = q.imagen; i.onload = resolve; i.onerror = resolve;
        })));
    }

    // MODO TABLA
    function startTableQuiz() {
        lobbyBanner.style.display = 'none'; lobbyContainer.style.display = 'none';
        simulador.style.display = 'block'; simulador.className = ''; 
        
        let html = `
        <div class="full-width-container">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; align-items:center;">
                <h2>TEST DE VOCABULARIO</h2>
                <div class="timer-box" style="padding:10px 20px;"><i class="fas fa-clock"></i> <span id="cronometro-tabla">00:00</span></div>
            </div>
            <div class="table-responsive-wrapper">
                <table class="vocab-table">
                    <thead><tr><th style="width:50px;">#</th><th>PALABRA</th><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead>
                    <tbody>`;
        questions.forEach((q, i) => {
            html += `<tr id="row-${i}"><td><strong>${i+1}</strong></td><td class="vocab-word-cell">${q.palabra}</td>
            <td class="vocab-option-cell" onclick="selectCell(${i}, '${q.opciones[0]}', this)">${q.opciones[0]}</td>
            <td class="vocab-option-cell" onclick="selectCell(${i}, '${q.opciones[1]}', this)">${q.opciones[1]}</td>
            <td class="vocab-option-cell" onclick="selectCell(${i}, '${q.opciones[2]}', this)">${q.opciones[2]}</td>
            <td class="vocab-option-cell" onclick="selectCell(${i}, '${q.opciones[3]}', this)">${q.opciones[3]}</td></tr>`;
        });
        html += `</tbody></table></div><button class="btn-finish-table" onclick="finishTableQuiz()">TERMINAR Y CALIFICAR</button></div>`;
        simulador.innerHTML = html;
        startTimer(finishTableQuiz);
    }

    window.selectCell = (idx, val, el) => {
        if(document.querySelector('.btn-finish-table').style.display === 'none') return;
        tableUserAnswers[idx] = val;
        const cells = document.getElementById(`row-${idx}`).getElementsByClassName('vocab-option-cell');
        for(let c of cells) c.classList.remove('vocab-selected');
        el.classList.add('vocab-selected');
    };

    window.finishTableQuiz = async () => {
        clearInterval(timerInterval);
        let ok = 0;
        questions.forEach((q, i) => {
            const userAns = tableUserAnswers[i];
            const cells = document.getElementById(`row-${i}`).getElementsByClassName('vocab-option-cell');
            for(let c of cells) {
                if(c.innerText === q.respuesta) c.classList.add('vocab-correct');
                if(c.innerText === userAns && userAns !== q.respuesta) c.classList.add('vocab-incorrect');
            }
            if(userAns === q.respuesta) ok++;
        });
        const score = Math.round((ok * 1000) / questions.length);
        alert(`PUNTAJE: ${score}/1000\nACIERTOS: ${ok}/${questions.length}`);
        document.querySelector('.btn-finish-table').style.display = 'none';
        
        const btnExit = document.createElement('button');
        btnExit.textContent = "SALIR AL MENÚ"; btnExit.className = "btn-finish-table"; btnExit.style.background = "#333";
        btnExit.onclick = () => window.location.href = 'index.html';
        document.querySelector('.full-width-container').appendChild(btnExit);
        saveResult(score, questions.length);
    };

    // MODO NORMAL
    function startQuiz() {
        lobbyBanner.style.display = 'none'; lobbyContainer.style.display = 'none';
        simulador.className = 'quiz-layout'; simulador.style.display = window.innerWidth > 900 ? 'grid' : 'flex';
        userAnswers = new Array(questions.length).fill(null);
        renderNav(); showQ(0); startTimer(finish);
    }

    function showQ(idx) {
        currentIdx = idx;
        const q = questions[idx];
        document.getElementById('pregunta-numero').textContent = `Pregunta ${idx+1}`;
        document.getElementById('pregunta-texto').innerHTML = q.pregunta ? q.pregunta.replace(/\n/g, '<br>') : '';
        document.getElementById('q-image-container').innerHTML = q.imagen ? `<img src="${q.imagen}" style="max-width:100%; border-radius:8px;">` : '';
        const opts = document.getElementById('opciones-container'); opts.innerHTML = '';
        if(q.opciones) q.opciones.forEach(op => {
            const btn = document.createElement('button'); btn.className = 'opcion-btn';
            if(userAnswers[idx] === op) btn.classList.add('selected');
            btn.textContent = op;
            btn.onclick = () => {
                userAnswers[idx] = op;
                Array.from(opts.children).forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('navegador-preguntas').children[idx].classList.add('answered');
            };
            opts.appendChild(btn);
        });
        const nextBtn = document.getElementById('siguiente-btn');
        nextBtn.textContent = idx === questions.length - 1 ? "Finalizar" : "Siguiente";
        nextBtn.style.backgroundColor = idx === questions.length - 1 ? "#27ae60" : "#b22222";
        nextBtn.onclick = () => idx < questions.length - 1 ? showQ(idx + 1) : finish();
        
        const dots = document.getElementById('navegador-preguntas').children;
        for(let i=0; i<dots.length; i++) { dots[i].classList.remove('active'); if(i===idx) dots[i].classList.add('active'); }
    }

    function renderNav() {
        const nav = document.getElementById('navegador-preguntas'); nav.innerHTML = '';
        questions.forEach((_, i) => {
            const b = document.createElement('button'); b.className = 'nav-dot'; b.textContent = i+1; nav.appendChild(b);
        });
    }

    function startTimer(callback) {
        timerInterval = setInterval(() => {
            timeLeft--;
            const timerEl = document.getElementById('cronometro') || document.getElementById('cronometro-tabla');
            if(timerEl) timerEl.textContent = `${Math.floor(timeLeft/60).toString().padStart(2,'0')}:${(timeLeft%60).toString().padStart(2,'0')}`;
            if(timeLeft<=0) callback();
        }, 1000);
    }

    async function finish() {
        clearInterval(timerInterval);
        simulador.style.display = 'none'; resultados.style.display = 'block';
        let ok = 0; questions.forEach((q, i) => { if(userAnswers[i] === q.respuesta) ok++; });
        const score = Math.round((ok * 1000) / questions.length);
        
        document.getElementById('puntaje-final').textContent = score;
        document.getElementById('stats-correctas').textContent = ok;
        document.getElementById('stats-incorrectas').textContent = questions.length - ok;
        
        const rev = document.getElementById('revision-container'); rev.innerHTML = '';
        questions.forEach((q, i) => {
            const correct = userAnswers[i] === q.respuesta;
            rev.innerHTML += `<div style="border-bottom:1px solid #eee; padding:15px;">
                <p><strong>${i+1}. ${q.pregunta ? q.pregunta.replace(/\n/g, '<br>') : ''}</strong></p>
                ${q.imagen ? `<img src="${q.imagen}" style="max-width:150px;">` : ''}
                <p>Tu respuesta: <span style="color:${correct?'green':'red'}">${userAnswers[i]||'---'}</span></p>
                ${!correct ? `<p style="color:green">Correcta: <strong>${q.respuesta}</strong></p>` : ''}
            </div>`;
        });
        saveResult(score, questions.length);
    }

    async function saveResult(score, total) {
        const userStr = sessionStorage.getItem('userInfo'); 
        if(userStr) {
            const user = JSON.parse(userStr);
            const params = new URLSearchParams(window.location.search);
            const title = materias[params.get('materia')] || params.get('materia');
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
