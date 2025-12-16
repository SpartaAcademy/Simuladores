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
    let currentIdx = 0;
    let timerInterval;
    let timeLeft = 3600;
    let totalPreguntas = 50;
    let carpetaEspecialID = null;
    
    // Variables para el modo Tabla (Simulador 3)
    let isTableMode = false;
    let tableUserAnswers = {}; // { id_pregunta: "Respuesta" }

    const materias = {
        'int_esmil_3': 'Inteligencia ESMIL 3 (Vocabulario)', // NUEVO
        'int_esmil_4': 'Inteligencia ESMIL 4',
        'int_esmil_5': 'Inteligencia ESMIL 5',
        'int_esmil_6': 'Inteligencia ESMIL 6',
        // ... (resto de tus materias)
    };

    function showError(msg) {
        btnStart.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error: ${msg}`;
        btnStart.style.background = "#c0392b";
        alert("Error cargando archivo: " + msg);
    }

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const materiaKey = params.get('materia');
        const title = materias[materiaKey] || 'Simulador';
        
        if(txtTituloMateria) txtTituloMateria.textContent = title.toUpperCase();
        if(txtMateria) txtMateria.textContent = title;
        document.getElementById('header-subtitulo').textContent = title.toUpperCase();
        
        let fetchUrl = '';
        
        // --- DETECCIÓN DE MODO TABLA (SIMULADOR 3) ---
        if (materiaKey === 'int_esmil_3') {
            isTableMode = true;
            fetchUrl = 'DATA/3/3.json';
            timeLeft = 1800; // 30 minutos para 50 preguntas rápidas
            totalPreguntas = 50;
        } 
        else if (materiaKey.startsWith('int_esmil_')) {
            carpetaEspecialID = materiaKey.split('_')[2];
            fetchUrl = `DATA/${carpetaEspecialID}/${carpetaEspecialID}.json`;
            timeLeft = 3600;
        } else {
            // ... lógica normal para otros simuladores (general, mates, etc) ...
            fetchUrl = `DATA/preguntas_${materiaKey}.json`; // Simplificado para el ejemplo
        }

        if(txtTiempo) txtTiempo.textContent = Math.floor(timeLeft/60) + " Minutos";

        try {
            const res = await fetch(fetchUrl);
            if(!res.ok) throw new Error("Falta archivo JSON");
            questions = await res.json();

            // Si es tabla, no aleatorizamos para mantener el orden de la imagen (1-50)
            if(!isTableMode) {
                // Aleatorizar otros simuladores si es necesario
                if(materiaKey.startsWith('int_esmil_')) {
                     questions = questions.map(q => {
                        if (q.imagen) {
                            const imageName = q.imagen.split('/').pop(); 
                            q.imagen = `DATA/${carpetaEspecialID}/IMAGES/${imageName}`;
                        }
                        return q;
                    }).sort(() => 0.5 - Math.random());
                }
            }

            if(txtPreguntas) txtPreguntas.textContent = questions.length;

            // Precarga solo si NO es tabla (el 3 no tiene imágenes)
            if(!isTableMode) await preloadImages(questions);

            btnStart.disabled = false;
            btnStart.innerHTML = 'COMENZAR INTENTO <i class="fas fa-play"></i>';
            
            // Decidir qué función iniciar
            btnStart.onclick = isTableMode ? startTableQuiz : startQuiz;

        } catch (e) { showError(e.message); }
    }

    async function preloadImages(list) { /* ... Tu función de siempre ... */ }

    // ==========================================
    //  MODO TABLA (SIMULADOR 3)
    // ==========================================
    function startTableQuiz() {
        lobbyBanner.style.display = 'none';
        lobbyContainer.style.display = 'none';
        
        // Usamos el contenedor principal pero cambiamos su contenido
        simulador.style.display = 'block';
        simulador.className = ''; // Quitar grid layout para usar full width
        
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
                            <th style="width:50px;">#</th>
                            <th>PALABRA</th>
                            <th>A</th>
                            <th>B</th>
                            <th>C</th>
                            <th>D</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        questions.forEach((q, index) => {
            // Asumimos que q.opciones tiene 4 elementos. 
            // Si el JSON viene con 4 opciones exactas, las mapeamos.
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

        html += `
                    </tbody>
                </table>
            </div>
            <button class="btn-finish-table" onclick="finishTableQuiz()">TERMINAR Y CALIFICAR</button>
        </div>`;

        simulador.innerHTML = html;

        // Iniciar Cronómetro
        timerInterval = setInterval(() => {
            timeLeft--;
            const m = Math.floor(timeLeft/60).toString().padStart(2,'0');
            const s = (timeLeft%60).toString().padStart(2,'0');
            const timerEl = document.getElementById('cronometro-tabla');
            if(timerEl) timerEl.textContent = `${m}:${s}`;
            if(timeLeft<=0) finishTableQuiz();
        }, 1000);
    }

    // Función Global para seleccionar celda (necesaria para el onclick inline)
    window.selectCell = function(rowIndex, answerText, cellElement) {
        // Guardar respuesta
        tableUserAnswers[rowIndex] = answerText;

        // Visual: Quitar selección previa en esa fila
        const row = document.getElementById(`row-${rowIndex}`);
        const cells = row.getElementsByClassName('vocab-option-cell');
        for(let c of cells) {
            c.classList.remove('vocab-selected');
        }
        
        // Agregar selección a la clicada
        cellElement.classList.add('vocab-selected');
    };

    window.finishTableQuiz = async function() {
        clearInterval(timerInterval);
        
        let aciertos = 0;
        
        // Recorrer todas las preguntas para calificar y pintar
        questions.forEach((q, index) => {
            const row = document.getElementById(`row-${index}`);
            const cells = row.getElementsByClassName('vocab-option-cell');
            const userAnswer = tableUserAnswers[index];
            const correctAnswer = q.respuesta;

            // Pintar celdas
            for(let cell of cells) {
                const cellText = cell.innerText;
                
                // Si es la correcta, siempre verde (para mostrar corrección)
                if (cellText === correctAnswer) {
                    cell.classList.add('vocab-correct');
                }
                
                // Si el usuario seleccionó esta y estaba MAL, pintar rojo
                if (cellText === userAnswer && userAnswer !== correctAnswer) {
                    cell.classList.add('vocab-incorrect');
                }
            }

            if (userAnswer === correctAnswer) aciertos++;
        });

        // Calcular puntaje
        const score = Math.round((aciertos * 1000) / questions.length);
        alert(`¡Examen finalizado!\nTu puntaje: ${score}/1000\nAciertos: ${aciertos}/${questions.length}`);

        // Deshabilitar clics
        const allCells = document.getElementsByClassName('vocab-option-cell');
        for(let c of allCells) c.onclick = null;
        document.querySelector('.btn-finish-table').style.display = 'none';

        // Guardar en Supabase
        const userStr = sessionStorage.getItem('userInfo'); 
        if(userStr) {
            const user = JSON.parse(userStr);
            try {
                await supabase.from('resultados').insert([{
                    usuario_id: user.usuario, 
                    usuario_nombre: user.nombre, 
                    materia: 'Inteligencia ESMIL 3 (Vocabulario)',
                    puntaje: score, 
                    total_preguntas: questions.length, 
                    ciudad: user.ciudad
                }]);
            } catch(e) { console.error(e); }
        }
        
        // Botón salir
        const btnExit = document.createElement('button');
        btnExit.textContent = "SALIR AL MENÚ";
        btnExit.className = "btn-finish-table";
        btnExit.style.background = "#333";
        btnExit.onclick = () => window.location.href = 'index.html';
        document.querySelector('.full-width-container').appendChild(btnExit);
    };

    // ==========================================
    //  MODO NORMAL (Diapositivas)
    // ==========================================
    function startQuiz() {
        // ... (Tu código normal de siempre para los otros simuladores) ...
        // Copia aquí el contenido de tu función startQuiz() original
        // que maneja lobby.style.display = 'none', renderNav(), showQ(), etc.
        // Asegúrate de que use las variables globales definidas arriba.
        
        lobbyBanner.style.display = 'none'; 
        lobbyContainer.style.display = 'none';
        simulador.style.display = window.innerWidth > 900 ? 'grid' : 'flex';
        
        userAnswers = new Array(questions.length).fill(null);
        // ... renderNav() ... showQ(0) ... setInterval ...
        // (Por brevedad, asumo que mantienes tu lógica original aquí)
        renderNav();
        showQ(0);
        timerInterval = setInterval(() => {
            timeLeft--;
            const m = Math.floor(timeLeft/60).toString().padStart(2,'0');
            const s = (timeLeft%60).toString().padStart(2,'0');
            document.getElementById('cronometro').textContent = `${m}:${s}`;
            if(timeLeft<=0) finish(); // Llamar finish() normal
        }, 1000);
    }
    
    // ... Resto de funciones (showQ, renderNav, finish) ...
    // Asegúrate de copiar las funciones auxiliares de tu script anterior aquí.
    function renderNav() {
        const navContainer = document.getElementById('navegador-preguntas');
        navContainer.innerHTML = '';
        questions.forEach((_, i) => {
            const b = document.createElement('button');
            b.className = 'nav-dot';
            b.textContent = i+1;
            navContainer.appendChild(b);
        });
    }

    function showQ(idx) {
        currentIdx = idx;
        const q = questions[idx];
        document.getElementById('pregunta-numero').textContent = `Pregunta ${idx+1}`;
        const textoFormateado = q.pregunta.replace(/\n/g, '<br>');
        document.getElementById('pregunta-texto').innerHTML = textoFormateado;
        
        const imgDiv = document.getElementById('q-image-container');
        imgDiv.innerHTML = q.imagen ? `<img src="${q.imagen}" style="max-width:100%; border-radius:8px;">` : '';

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
                const dots = document.getElementById('navegador-preguntas').children;
                if(dots[idx]) dots[idx].classList.add('answered');
            };
            opts.appendChild(btn);
        });
        
        const btnNext = document.getElementById('siguiente-btn');
        if (idx === questions.length - 1) {
            btnNext.textContent = "Finalizar";
            btnNext.style.backgroundColor = "#27ae60"; 
        } else {
            btnNext.textContent = "Siguiente";
            btnNext.style.backgroundColor = "#b22222"; 
        }
        btnNext.onclick = () => {
            if (currentIdx < questions.length - 1) showQ(currentIdx + 1);
            else finish();
        };
    }

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
        
        // Guardar
        const userStr = sessionStorage.getItem('userInfo'); 
        if(userStr) {
            const user = JSON.parse(userStr);
            const params = new URLSearchParams(window.location.search);
            const materiaKey = params.get('materia');
            const title = materias[materiaKey] || materiaKey;
            try {
                await supabase.from('resultados').insert([{
                    usuario_id: user.usuario, usuario_nombre: user.nombre, materia: title,
                    puntaje: score, total_preguntas: questions.length, ciudad: user.ciudad
                }]);
            } catch(e) { console.error(e); }
        }
    }

    init();
});
