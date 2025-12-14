// CONEXIÓN
const supabaseUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    // Referencias
    const lobby = document.getElementById('lobby-container');
    const simulador = document.getElementById('simulador-container');
    const resultados = document.getElementById('resultados-container');
    const btnStart = document.getElementById('comenzar-btn');
    const btnNext = document.getElementById('siguiente-btn');
    const navContainer = document.getElementById('navegador-preguntas');
    
    let questions = [];
    let userAnswers = [];
    let currentIdx = 0;
    let timerInterval;
    let timeLeft = 3600;
    let totalPreguntas = 50;

    const materias = {
        'sociales': 'Ciencias Sociales', 'matematicas': 'Matemáticas', 'lengua': 'Lengua', 'ingles': 'Inglés', 'general': 'General',
        'inteligencia': 'Inteligencia', 'personalidad': 'Personalidad', 'ppnn1': 'PPNN 1', 'ppnn2': 'PPNN 2',
        'ppnn3': 'PPNN 3', 'ppnn4': 'PPNN 4', 'sociales_esmil': 'Sociales ESMIL', 'matematicas_esmil': 'Matemáticas ESMIL',
        'lengua_esmil': 'Lenguaje ESMIL', 'ingles_esmil': 'Inglés ESMIL', 'general_esmil': 'General ESMIL'
    };

    const ordenGeneralPolicia = ['sociales', 'matematicas', 'lengua', 'ingles'];
    const ordenGeneralEsmil = ['sociales_esmil', 'matematicas_esmil', 'lengua_esmil', 'ingles_esmil'];

    function showError(msg) {
        document.getElementById('error-text').textContent = msg;
        document.getElementById('error-modal').style.display = 'flex';
        btnStart.textContent = "Error"; btnStart.style.background = "#c0392b";
    }

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia');
        const title = materias[materiaKey] || 'Simulador';
        
        document.getElementById('titulo-materia').textContent = title.toUpperCase();
        document.getElementById('lobby-materia').textContent = title;
        
        if(materiaKey.includes('matematicas')) timeLeft = 5400; 
        else if(materiaKey.includes('general')) { timeLeft = 10800; totalPreguntas = 200; }
        
        document.getElementById('lobby-tiempo').textContent = Math.floor(timeLeft/60) + " Minutos";
        document.getElementById('lobby-preguntas').textContent = totalPreguntas;

        try {
            let filesToLoad = [];
            if(materiaKey === 'general') filesToLoad = ordenGeneralPolicia;
            else if(materiaKey === 'general_esmil') filesToLoad = ordenGeneralEsmil;
            else filesToLoad = [materiaKey];

            const promises = filesToLoad.map(m => fetch(`DATA/preguntas_${m}.json`).then(r => r.json()));
            const results = await Promise.all(promises);
            let allQ = [];
            results.forEach(d => allQ = allQ.concat(d));

            if(materiaKey.startsWith('ppnn')) {
                questions = allQ.sort(() => 0.5 - Math.random());
                totalPreguntas = questions.length;
                document.getElementById('lobby-preguntas').textContent = totalPreguntas;
            } else if (materiaKey.includes('general')) {
                questions = allQ.sort(() => 0.5 - Math.random()).slice(0, 200);
            } else {
                questions = allQ.sort(() => 0.5 - Math.random()).slice(0, 50);
            }

            if(questions.length === 0) throw new Error("Sin preguntas.");
            btnStart.disabled = false;
            btnStart.textContent = 'COMENZAR INTENTO';
            btnStart.onclick = startQuiz;

        } catch (e) { showError(e.message); }
    }

    function startQuiz() {
        lobby.style.display = 'none';
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
        imgDiv.innerHTML = q.imagen ? `<img src="${q.imagen}" onerror="this.style.display='none'" style="max-width:100%; border-radius:8px;">` : '';

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
            let imgHtml = q.imagen ? `<div style="text-align:center; margin:10px 0;"><img src="${q.imagen}" style="max-width:150px; border-radius:5px;"></div>` : '';
            div.innerHTML = `<p><strong>${i+1}. ${q.pregunta}</strong></p>
                             ${imgHtml}
                             <p>Tu respuesta: <span style="font-weight:bold; color:${correct?'green':'red'}">${userAnswers[i]||'---'}</span></p>
                             ${!correct ? `<p style="color:green;">Correcta: <strong>${q.respuesta}</strong></p>` : ''}`;
            revContainer.appendChild(div);
        });

        const userStr = sessionStorage.getItem('userInfo'); 
        if(userStr) {
            const user = JSON.parse(userStr);
            const params = new URLSearchParams(window.location.search);
            const title = materias[params.get('materia')] || params.get('materia');
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
