// CONEXIÓN
const simuladorUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const simuladorKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const simuladorDB = window.supabase.createClient(simuladorUrl, simuladorKey);

document.addEventListener('DOMContentLoaded', () => {
    // Referencias
    const lobbyBanner = document.getElementById('lobby-banner');
    const lobbyContainer = document.getElementById('lobby-container');
    const simulador = document.getElementById('simulador-container');
    const resultados = document.getElementById('resultados-container');
    const btnStart = document.getElementById('comenzar-btn');
    const txtTituloMateria = document.getElementById('lobby-titulo-materia');
    const txtMateria = document.getElementById('lobby-materia');
    const txtPreguntas = document.getElementById('lobby-preguntas');
    const txtTiempo = document.getElementById('lobby-tiempo');
    
    const btnBack = document.getElementById('btn-regresar-lobby');
    if(btnBack) btnBack.addEventListener('click', () => window.history.length > 1 ? window.history.back() : window.location.href = 'index.html');

    let questions = [];
    let phase1Data = []; 
    let phase2Blocks = []; 
    let userAnswers = [];
    let tableAnswersText = {};
    let tableAnswersImg = {}; 
    let currentIdx = 0;
    let timerInterval;
    let timeLeft = 3600;
    let totalPreguntas = 50;
    let carpetaEspecialID = null;
    let isMultiPhaseMode = false;

    const materias = {
        'sociales': 'Ciencias Sociales', 'matematicas': 'Matemáticas y Física', 'lengua': 'Lengua y Literatura', 'ingles': 'Inglés', 'general': 'General (Todas)',
        'inteligencia': 'Inteligencia', 'personalidad': 'Personalidad', 'ppnn1': 'Cuestionario 1 PPNN', 'ppnn2': 'Cuestionario 2 PPNN', 'ppnn3': 'Cuestionario 3 PPNN', 'ppnn4': 'Cuestionario 4 PPNN',
        'sociales_esmil': 'Ciencias Sociales (ESMIL)', 'matematicas_esmil': 'Matemáticas (ESMIL)', 'lengua_esmil': 'Lenguaje (ESMIL)', 'ingles_esmil': 'Inglés (ESMIL)', 'general_esmil': 'General ESMIL',
        'int_esmil_1': 'Inteligencia ESMIL 1', 
        'int_esmil_2': 'Inteligencia ESMIL 2',
        'int_esmil_3': 'Inteligencia ESMIL 3 (Mixto)', 
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
        document.getElementById('error-text').textContent = "Error cargando datos. Recarga la página.";
        document.getElementById('error-modal').style.display = 'flex';
    }

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia') || 'sociales';
        const title = materias[materiaKey] || 'Simulador';
        
        if(txtTituloMateria) txtTituloMateria.textContent = title.toUpperCase();
        if(txtMateria) txtMateria.textContent = title;

        let fetchUrl = '';
        
        // --- 1. CONFIGURACIÓN ---
        if (materiaKey === 'int_esmil_3') {
            // SOLO EL 3 ES ESPECIAL
            isMultiPhaseMode = true; 
            fetchUrl = 'DATA/3/3.json'; 
            timeLeft = 3600;
        } 
        else if (materiaKey.startsWith('int_esmil_')) {
            // EL 1, 2, 4, 5, 6 SON NORMALES AHORA
            carpetaEspecialID = materiaKey.split('_')[2]; 
            fetchUrl = `DATA/${carpetaEspecialID}/${carpetaEspecialID}.json`; 
            timeLeft = 3600;
        } 
        else if (materiaKey.includes('matematicas')) {
            timeLeft = 5400; fetchUrl = `DATA/preguntas_${materiaKey}.json`;
        } else if (materiaKey.includes('general')) {
            timeLeft = 10800; totalPreguntas = 200; fetchUrl = `DATA/preguntas_${materiaKey}.json`;
        } else {
            timeLeft = 3600; fetchUrl = `DATA/preguntas_${materiaKey}.json`;
        }

        if(txtTiempo) txtTiempo.textContent = Math.floor(timeLeft/60) + " Minutos";

        try {
            // --- 2. CARGA ---
            let filesToLoad = [];
            if (isMultiPhaseMode || materiaKey.startsWith('int_esmil_')) filesToLoad = [fetchUrl];
            else if (materiaKey === 'general') filesToLoad = ordenGeneralPolicia.map(m => `DATA/preguntas_${m}.json`);
            else if (materiaKey === 'general_esmil') filesToLoad = ordenGeneralEsmil.map(m => `DATA/preguntas_${m}.json`);
            else filesToLoad = [fetchUrl];

            const promises = filesToLoad.map(url => fetch(url).then(r => r.ok ? r.json() : null));
            const results = await Promise.all(promises);
            
            // --- 3. PROCESAMIENTO ---
            if (isMultiPhaseMode) {
                // MODO MIXTO (SOLO SIM 3)
                const data = results[0];
                if (!data || !data.parte1 || !data.parte2_bloques) throw new Error("JSON de Sim 3 inválido.");
                phase1Data = data.parte1;
                phase2Blocks = data.parte2_bloques.map(b => {
                    b.imagen_bloque = `DATA/3/IMAGES/${b.imagen_bloque}`; 
                    return b;
                });
                totalPreguntas = phase1Data.length + 20; 
            } 
            else {
                // MODO NORMAL (1, 2, 4, 5, 6 y otros)
                let allQ = [];
                results.forEach(d => { if(d) allQ = allQ.concat(d); });
                if(allQ.length === 0) throw new Error("Archivo vacío");
                questions = allQ;

                if (materiaKey.startsWith('int_esmil_')) {
                    // Para 1, 2, 4, 5, 6 arreglamos rutas de imágenes
                    questions = questions.map(q => {
                        if (q.imagen) q.imagen = `DATA/${carpetaEspecialID}/IMAGES/${q.imagen.split('/').pop()}`;
                        return q;
                    }).sort(() => 0.5 - Math.random());
                } else {
                    questions = questions.sort(() => 0.5 - Math.random());
                    if (!materiaKey.includes('general') && !materiaKey.startsWith('ppnn')) questions = questions.slice(0, 50);
                }
                totalPreguntas = questions.length;
            }

            if(txtPreguntas) txtPreguntas.textContent = totalPreguntas;

            // --- 4. PRELOAD ---
            if (!isMultiPhaseMode && questions.some(q => q.imagen)) {
                btnStart.innerHTML = "CARGANDO RECURSOS...";
                await Promise.race([preloadImages(questions), new Promise(r => setTimeout(r, 2000))]);
            }
            
            btnStart.disabled = false;
            btnStart.innerHTML = 'COMENZAR INTENTO <i class="fas fa-play"></i>';
            
            // Si es mixto (3) -> startPhase1, si no (1, 2, 4...) -> startQuiz
            btnStart.onclick = isMultiPhaseMode ? startPhase1 : startQuiz;

        } catch (e) { showError(e.message); }
    }

    async function preloadImages(list) {
        const imgs = list.filter(q => q.imagen);
        await Promise.all(imgs.map(q => new Promise(resolve => {
            const i = new Image(); i.src = q.imagen; i.onload = resolve; i.onerror = resolve;
        })));
    }

    // ==========================================
    //  MODO MIXTO (SIM 3) - FASE 1: VOCAB
    // ==========================================
    function startPhase1() {
        lobbyBanner.style.display = 'none'; lobbyContainer.style.display = 'none';
        simulador.style.display = 'block'; simulador.className = ''; 
        let html = `<div class="full-width-container"><div style="display:flex; justify-content:space-between; margin-bottom:20px; align-items:center;"><h2>PARTE 1: VOCABULARIO</h2><div class="timer-box" style="padding:10px 20px;"><i class="fas fa-clock"></i> <span id="cronometro-tabla">00:00</span></div></div><div class="table-responsive-wrapper"><table class="vocab-table"><thead><tr><th style="width:50px;">#</th><th>PALABRA</th><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead><tbody>`;
        phase1Data.forEach((q, i) => {
            html += `<tr id="row-p1-${i}"><td><strong>${i+1}</strong></td><td class="vocab-word-cell">${q.palabra}</td>
            ${q.opciones.map(op => `<td class="vocab-option-cell" onclick="selectPhase1(${i}, '${op}', this)">${op}</td>`).join('')}</tr>`;
        });
        html += `</tbody></table></div><button class="btn-finish-table" onclick="goToPhase2()">CONTINUAR A LA SIGUIENTE SECCIÓN <i class="fas fa-arrow-right"></i></button></div>`;
        simulador.innerHTML = html;
        startTimer(finishMultiPhase);
    }

    window.selectPhase1 = (idx, val, el) => {
        tableAnswersText[idx] = val;
        const row = document.getElementById(`row-p1-${idx}`);
        const cells = row.getElementsByClassName('vocab-option-cell');
        for(let c of cells) c.classList.remove('vocab-selected');
        el.classList.add('vocab-selected');
    };

    window.goToPhase2 = () => { window.scrollTo(0,0); startPhase2(); };

    // ==========================================
    //  MODO MIXTO - FASE 2: BLOQUES IMÁGENES
    // ==========================================
    function startPhase2() {
        let html = `<div class="full-width-container"><div style="display:flex; justify-content:space-between; margin-bottom:20px; align-items:center;"><h2>PARTE 2: ABSTRACTO (Selección Múltiple)</h2><div class="timer-box" style="padding:10px 20px;"><i class="fas fa-clock"></i> <span id="cronometro-tabla-2">--:--</span></div></div>`;
        phase2Blocks.forEach((bloque, bIdx) => {
            html += `<div class="block-container"><div class="block-img-wrapper"><img src="${bloque.imagen_bloque}" alt="Bloque ${bIdx+1}"></div><div class="block-table-wrapper"><table class="block-table"><thead><tr><th>#</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th></tr></thead><tbody>`;
            for (let q = bloque.rango_inicio; q <= bloque.rango_fin; q++) {
                html += `<tr id="row-p2-${q}"><td><strong>${q}</strong></td>
                <td class="opt-cell" onclick="selectPhase2(${q}, 0, this)">A</td><td class="opt-cell" onclick="selectPhase2(${q}, 1, this)">B</td><td class="opt-cell" onclick="selectPhase2(${q}, 2, this)">C</td><td class="opt-cell" onclick="selectPhase2(${q}, 3, this)">D</td><td class="opt-cell" onclick="selectPhase2(${q}, 4, this)">E</td><td class="opt-cell" onclick="selectPhase2(${q}, 5, this)">F</td></tr>`;
            }
            html += `</tbody></table></div></div>`;
        });
        html += `<button class="btn-finish-table" id="btn-trigger-modal">TERMINAR Y CALIFICAR</button></div>`;
        simulador.innerHTML = html;

        document.getElementById('btn-trigger-modal').onclick = () => {
            let faltantes = 0;
            for(let i=0; i<phase1Data.length; i++) { if(!tableAnswersText[i]) faltantes++; }
            for(let i=1; i<=20; i++) { if(!tableAnswersImg[i] || tableAnswersImg[i].length === 0) faltantes++; }
            document.getElementById('modal-mensaje').textContent = `Faltan ${faltantes} preguntas.`;
            document.getElementById('modal-overlay').style.display = 'flex';
            document.getElementById('confirmar-modal-btn').onclick = () => {
                document.getElementById('modal-overlay').style.display='none';
                finishMultiPhase();
            };
        };
    }

    window.selectPhase2 = (qNum, valIdx, el) => {
        let currentAns = tableAnswersImg[qNum] || [];
        if (currentAns.includes(valIdx)) {
            currentAns = currentAns.filter(v => v !== valIdx);
            el.classList.remove('opt-selected');
        } else {
            currentAns.push(valIdx);
            el.classList.add('opt-selected');
        }
        tableAnswersImg[qNum] = currentAns;
    };

    // --- RESULTADOS MODO MIXTO ---
    window.finishMultiPhase = async () => {
        clearInterval(timerInterval);
        simulador.style.display = 'none';
        resultados.style.display = 'block';

        let ok1 = 0, ok2 = 0;
        let revHTML = '';

        revHTML += `<h3 style="background:#eee; padding:10px; border-left:5px solid var(--primary); margin-top:30px;">FASE 1: VOCABULARIO</h3>`;
        phase1Data.forEach((q, i) => {
            const userAns = tableAnswersText[i];
            const correct = userAns === q.respuesta;
            if (correct) ok1++;
            revHTML += `<div style="border-bottom:1px solid #eee; padding:15px; text-align:left;"><p><strong>${i+1}. ${q.palabra}</strong></p><p>Tu respuesta: <span style="font-weight:bold; color:${correct?'green':'red'}">${userAns || '---'}</span></p>${!correct ? `<p style="color:green">Correcta: <strong>${q.respuesta}</strong></p>` : ''}</div>`;
        });

        revHTML += `<h3 style="background:#eee; padding:10px; border-left:5px solid var(--primary); margin-top:30px;">FASE 2: ABSTRACTO</h3>`;
        const letras = ['A','B','C','D','E','F'];
        
        phase2Blocks.forEach((bloque, bIdx) => {
            revHTML += `<div style="margin-top:30px; border:1px solid #ccc; border-radius:8px; overflow:hidden;"><div style="background:#222; color:white; padding:5px 15px; font-family:'Teko'; font-size:1.2rem;">BLOQUE ${bIdx+1} (Preguntas ${bloque.rango_inicio}-${bloque.rango_fin})</div><div style="padding:10px; text-align:center; background:#f9f9f9; border-bottom:1px solid #eee;"><img src="${bloque.imagen_bloque}" style="max-width:100%;"></div>`;
            bloque.respuestas_bloque.forEach((correctArr, i) => {
                const qNum = bloque.rango_inicio + i;
                const userArr = tableAnswersImg[qNum] || [];
                const esCorrecto = (userArr.length === correctArr.length) && userArr.every(val => correctArr.includes(val));
                if (esCorrecto) ok2++;
                const userLetters = userArr.map(idx => letras[idx]).join(', ');
                const correctLetters = correctArr.map(idx => letras[idx]).join(', ');
                revHTML += `<div style="border-bottom:1px solid #eee; padding:15px; text-align:left; background:white;"><p><strong>Pregunta ${qNum}:</strong></p><p>Tu respuesta: <span style="font-weight:bold; color:${esCorrecto?'green':'red'}">${userLetters || '---'}</span></p>${!esCorrecto ? `<p style="color:green">Correctas: <strong>${correctLetters}</strong></p>` : ''}</div>`;
            });
            revHTML += `</div>`;
        });

        const totalOk = ok1 + ok2;
        const totalQ = phase1Data.length + 20;
        const score = Math.round((totalOk * 1000) / totalQ);
        const incorrectas = totalQ - totalOk;
        const enBlanco = (phase1Data.length - Object.keys(tableAnswersText).length) + (20 - Object.keys(tableAnswersImg).length);

        document.getElementById('puntaje-final').textContent = score;
        document.getElementById('stats-correctas').textContent = totalOk;
        document.getElementById('stats-incorrectas').textContent = incorrectas;
        document.getElementById('stats-en-blanco').textContent = enBlanco > 0 ? enBlanco : 0;
        document.getElementById('revision-container').innerHTML = revHTML;

        document.getElementById('retry-btn').onclick = () => location.reload();
        document.getElementById('reiniciar-btn').onclick = () => location.href='index.html';

        saveResult(score, totalQ, 'Inteligencia ESMIL 3 (Mixto)');
    };

    // ==========================================
    //  MODO NORMAL (Diapositivas - Sim 1, 2, 4...)
    // ==========================================
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
        questions.forEach((_, i) => { const b = document.createElement('button'); b.className = 'nav-dot'; b.textContent = i+1; nav.appendChild(b); });
    }

    function startTimer(callback) {
        timerInterval = setInterval(() => {
            timeLeft--;
            const timerEl = document.getElementById('cronometro') || document.getElementById('cronometro-tabla') || document.getElementById('cronometro-tabla-2');
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
        saveResult(score, questions.length, materias[new URLSearchParams(window.location.search).get('materia')]);
    }

    async function saveResult(score, total, title) {
        const userStr = sessionStorage.getItem('userInfo'); 
        if(userStr) {
            const user = JSON.parse(userStr);
            try {
                await simuladorDB.from('resultados').insert([{
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
