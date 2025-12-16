const MENU_DATA = {
    'root': {
        title: 'Seleccione una Institución',
        desc: 'Elija la institución o categoría para ver los simuladores disponibles.',
        items: [
            { id: 'policia', label: 'POLICÍA NACIONAL', type: 'folder', icon: 'fas fa-user-shield', desc: 'Pruebas Académicas y PPNN' },
            { id: 'ffaa', label: 'FUERZAS ARMADAS', type: 'folder', icon: 'fas fa-fighter-jet', desc: 'ESMIL, ESFORSE, FAE, NAVAL' },
            { id: 'general', label: 'GENERAL UNIFICADO', type: 'folder', icon: 'fas fa-globe', variant: 'wide', desc: 'Pruebas Psicométricas, Inteligencia y Personalidad.' }
        ]
    },
    'policia': {
        title: 'Policía Nacional',
        desc: 'Seleccione la categoría de pruebas.',
        items: [
            { id: 'policia_academicas', label: 'Simuladores Pruebas Académicas', type: 'folder', icon: 'fas fa-book' },
            { id: 'policia_ppnn', label: 'Pruebas PPNN 2025', type: 'folder', icon: 'fas fa-file-alt' }
        ]
    },
    'policia_academicas': {
        title: 'Pruebas Académicas (Policía)',
        desc: 'Elija una materia.',
        items: [
            { label: 'CIENCIAS SOCIALES', type: 'test', link: 'simulador.html?materia=sociales', icon: 'fas fa-landmark' },
            { label: 'MATEMÁTICAS Y FÍSICA', type: 'test', link: 'simulador.html?materia=matematicas', icon: 'fas fa-calculator' },
            { label: 'LENGUA Y LITERATURA', type: 'test', link: 'simulador.html?materia=lengua', icon: 'fas fa-pen-fancy' },
            { label: 'INGLÉS', type: 'test', link: 'simulador.html?materia=ingles', icon: 'fas fa-language' },
            { label: 'GENERAL (TODAS)', type: 'test', link: 'simulador.html?materia=general', icon: 'fas fa-layer-group' }
        ]
    },
    'policia_ppnn': {
        title: 'Pruebas PPNN 2025',
        desc: 'Cuestionarios específicos PPNN.',
        items: [
            { label: 'CUESTIONARIO 1 PPNN', type: 'test', link: 'simulador.html?materia=ppnn1', icon: 'fas fa-file-contract' },
            { label: 'CUESTIONARIO 2 PPNN', type: 'test', link: 'simulador.html?materia=ppnn2', icon: 'fas fa-file-contract' },
            { label: 'CUESTIONARIO 3 PPNN', type: 'test', link: 'simulador.html?materia=ppnn3', icon: 'fas fa-file-contract' },
            { label: 'CUESTIONARIO 4 PPNN', type: 'test', link: 'simulador.html?materia=ppnn4', icon: 'fas fa-file-contract' }
        ]
    },
    'ffaa': {
        title: 'Fuerzas Armadas',
        desc: 'Seleccione la escuela.',
        items: [
            { id: 'esmil_menu', label: 'ESMIL', type: 'folder', icon: 'fas fa-university', desc: 'Escuela Superior Militar Eloy Alfaro' }
        ]
    },
    'esmil_menu': {
        title: 'ESMIL',
        desc: 'Seleccione el tipo de prueba.',
        items: [
            { id: 'ffaa_esmil_academicas', label: 'Simuladores Pruebas Académicas ESMIL', type: 'folder', icon: 'fas fa-book-reader' },
            { id: 'ffaa_esmil_inteligencia', label: 'Tests Inteligencia ESMIL', type: 'folder', icon: 'fas fa-brain' }
        ]
    },
    'ffaa_esmil_academicas': {
        title: 'Pruebas Académicas ESMIL',
        desc: 'Elija una materia.',
        items: [
            { label: 'CIENCIAS SOCIALES', type: 'test', link: 'simulador.html?materia=sociales_esmil', icon: 'fas fa-landmark' },
            { label: 'MATEMÁTICAS Y FÍSICA', type: 'test', link: 'simulador.html?materia=matematicas_esmil', icon: 'fas fa-calculator' },
            { label: 'LENGUA Y LITERATURA', type: 'test', link: 'simulador.html?materia=lengua_esmil', icon: 'fas fa-pen-fancy' },
            { label: 'INGLÉS', type: 'test', link: 'simulador.html?materia=ingles_esmil', icon: 'fas fa-language' },
            { label: 'GENERAL (TODAS)', type: 'test', link: 'simulador.html?materia=general_esmil', icon: 'fas fa-layer-group' }
        ]
    },
    'ffaa_esmil_inteligencia': {
        title: 'Tests Inteligencia ESMIL',
        desc: 'Simuladores Psicométricos Específicos.',
        items: [
            // AHORA EL 1 Y EL 2 ESTÁN ACTIVOS (NORMALES)
            { label: 'SIMULADOR 1', type: 'test', link: 'simulador.html?materia=int_esmil_1', icon: 'fas fa-puzzle-piece' },
            { label: 'SIMULADOR 2', type: 'test', link: 'simulador.html?materia=int_esmil_2', icon: 'fas fa-puzzle-piece' },
            // EL 3 ES EL ESPECIAL
            { label: 'SIMULADOR 3 (Mixto)', type: 'test', link: 'simulador.html?materia=int_esmil_3', icon: 'fas fa-list-alt' },
            { label: 'SIMULADOR 4', type: 'test', link: 'simulador.html?materia=int_esmil_4', icon: 'fas fa-lightbulb' },
            { label: 'SIMULADOR 5', type: 'test', link: 'simulador.html?materia=int_esmil_5', icon: 'fas fa-lightbulb' },
            { label: 'SIMULADOR 6', type: 'test', link: 'simulador.html?materia=int_esmil_6', icon: 'fas fa-lightbulb' }
        ]
    },
    'general': {
        title: 'General',
        desc: 'Pruebas psicométricas generales.',
        items: [
            { id: 'general_psico', label: 'Simuladores Psicosométricos', type: 'folder', icon: 'fas fa-brain' }
        ]
    },
    'general_psico': {
        title: 'Simuladores Psicosométricos',
        desc: 'Pruebas de inteligencia y personalidad.',
        items: [
            { id: 'inteligencia_menu', label: 'INTELIGENCIA', type: 'folder', icon: 'fas fa-lightbulb' },
            { label: 'PERSONALIDAD', type: 'test', link: 'simulador.html?materia=personalidad', icon: 'fas fa-user' }
        ]
    },
    'inteligencia_menu': {
        title: 'Simuladores de Inteligencia',
        desc: 'Seleccione la versión.',
        items: [
            { label: 'INTELIGENCIA V1', type: 'test', link: 'simulador.html?materia=inteligencia', icon: 'fas fa-brain' },
            { label: 'INTELIGENCIA V2', type: 'test', link: '#', icon: 'fas fa-brain', disabled: true }
        ]
    }
};

let navigationHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    renderMenu('root');
    document.getElementById('btn-atras').addEventListener('click', goBack);
});

function renderMenu(menuId) {
    const data = MENU_DATA[menuId];
    if (!data) return;
    if (menuId === 'root') navigationHistory = ['root'];
    else if (navigationHistory[navigationHistory.length - 1] !== menuId) navigationHistory.push(menuId);
    
    document.getElementById('navigation-bar').style.display = navigationHistory.length > 1 ? 'flex' : 'none';
    document.getElementById('section-title').textContent = data.title;
    document.getElementById('section-desc').textContent = data.desc;
    const container = document.getElementById('dynamic-grid');
    container.innerHTML = '';

    data.items.forEach(item => {
        const card = document.createElement('a');
        let baseClass = item.type === 'folder' ? 'materia-card card-folder' : 'materia-card card-test';
        if (item.variant === 'wide') baseClass += ' card-wide';
        card.className = baseClass;
        
        if (item.disabled) {
            card.classList.add('disabled-card'); 
            card.href = '#';
        } else if (item.type === 'test') {
            card.href = item.link;
        } else {
            card.href = '#'; 
            card.onclick = (e) => { e.preventDefault(); renderMenu(item.id); };
        }

        if (item.variant === 'wide') {
            card.innerHTML = `<i class="${item.icon}"></i><div class="text-content"><h3>${item.label}</h3><p>${item.desc || ''}</p></div>`;
        } else {
            card.innerHTML = `<i class="${item.icon}"></i><h3>${item.label}${item.disabled ? ' (Próx.)' : ''}</h3>${item.desc ? `<p>${item.desc}</p>` : ''}`;
        }
        container.appendChild(card);
    });
}

function goBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop();
        renderMenu(navigationHistory[navigationHistory.length - 1]);
    }
}

function updateNavigationUI() {
    const navBar = document.getElementById('navigation-bar');
    if (navigationHistory.length > 1) navBar.style.display = 'flex';
    else navBar.style.display = 'none';
}
