// JS/script-home.js

// Estructura del Menú (Aquí se define todo el árbol de navegación)
const MENU_DATA = {
    'root': {
        title: 'Seleccione una Institución',
        desc: 'Elija la institución o categoría para ver los simuladores disponibles.',
        items: [
            { id: 'policia', label: 'POLICÍA NACIONAL', type: 'folder', icon: 'fas fa-user-shield' },
            { id: 'ffaa', label: 'FUERZAS ARMADAS', type: 'folder', icon: 'fas fa-jet' }, // Icono de avión/militar
            { id: 'general', label: 'GENERAL', type: 'folder', icon: 'fas fa-globe' }
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
    'ffaa': {
        title: 'Fuerzas Armadas',
        desc: 'Seleccione la categoría de pruebas.',
        items: [
            { id: 'ffaa_esmil', label: 'Simuladores Pruebas Académicas ESMIL', type: 'folder', icon: 'fas fa-university' }
        ]
    },
    'general': {
        title: 'General',
        desc: 'Pruebas psicométricas generales.',
        items: [
            { id: 'general_psico', label: 'Simuladores Psicosométricos', type: 'folder', icon: 'fas fa-brain' }
        ]
    },
    
    // --- Submenús de Nivel 3 ---
    
    // Policía - Académicas (Usa los JSON normales)
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
    
    // Policía - PPNN
    'policia_ppnn': {
        title: 'Pruebas PPNN 2025',
        desc: 'Cuestionarios específicos PPNN.',
        items: [
            { label: 'CUESTIONARIO 1 PPNN', type: 'test', link: 'simulador.html?materia=ppnn1', icon: 'fas fa-file-contract' },
            { label: 'CUESTIONARIO 2 PPNN', type: 'test', link: 'simulador.html?materia=ppnn2', icon: 'fas fa-file-contract' }, // Activar cuando tengas el JSON
            { label: 'CUESTIONARIO 3 PPNN', type: 'test', link: 'simulador.html?materia=ppnn3', icon: 'fas fa-file-contract' },
            { label: 'CUESTIONARIO 4 PPNN', type: 'test', link: 'simulador.html?materia=ppnn4', icon: 'fas fa-file-contract' }
        ]
    },

    // FFAA - ESMIL (Usa JSONs con sufijo _esmil)
    'ffaa_esmil': {
        title: 'Pruebas Académicas ESMIL',
        desc: 'Elija una materia para ESMIL.',
        items: [
            { label: 'CIENCIAS SOCIALES', type: 'test', link: 'simulador.html?materia=sociales_esmil', icon: 'fas fa-landmark' },
            { label: 'MATEMÁTICAS Y FÍSICA', type: 'test', link: 'simulador.html?materia=matematicas_esmil', icon: 'fas fa-calculator' },
            { label: 'LENGUA Y LITERATURA', type: 'test', link: 'simulador.html?materia=lengua_esmil', icon: 'fas fa-pen-fancy' },
            { label: 'INGLÉS', type: 'test', link: 'simulador.html?materia=ingles_esmil', icon: 'fas fa-language' },
            { label: 'GENERAL (TODAS)', type: 'test', link: 'simulador.html?materia=general_esmil', icon: 'fas fa-layer-group' }
        ]
    },

    // General - Psicométricas
    'general_psico': {
        title: 'Simuladores Psicosométricos',
        desc: 'Pruebas de inteligencia y personalidad.',
        items: [
            { id: 'inteligencia_menu', label: 'INTELIGENCIA', type: 'folder', icon: 'fas fa-lightbulb' }, // Abre submenú V1/V2
            { label: 'PERSONALIDAD', type: 'test', link: 'simulador.html?materia=personalidad', icon: 'fas fa-user' }
        ]
    },

    // General - Inteligencia (Submenú V1, V2...)
    'inteligencia_menu': {
        title: 'Simuladores de Inteligencia',
        desc: 'Seleccione la versión.',
        items: [
            { label: 'INTELIGENCIA V1', type: 'test', link: 'simulador.html?materia=inteligencia', icon: 'fas fa-brain' },
            { label: 'INTELIGENCIA V2', type: 'test', link: '#', icon: 'fas fa-brain', disabled: true } // Disabled
        ]
    }
};

// Historial de navegación para el botón "Atrás"
let navigationHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    renderMenu('root');

    document.getElementById('btn-atras').addEventListener('click', goBack);
});

function renderMenu(menuId) {
    const data = MENU_DATA[menuId];
    if (!data) return;

    // Actualizar historial
    if (menuId === 'root') {
        navigationHistory = ['root'];
    } else {
        if (navigationHistory[navigationHistory.length - 1] !== menuId) {
            navigationHistory.push(menuId);
        }
    }
    updateNavigationUI();

    // Actualizar Textos
    document.getElementById('section-title').textContent = data.title;
    document.getElementById('section-desc').textContent = data.desc;

    // Renderizar Botones
    const container = document.getElementById('dynamic-grid');
    container.innerHTML = '';

    data.items.forEach(item => {
        const card = document.createElement('a');
        
        // Clases base
        card.className = item.type === 'folder' ? 'materia-card card-folder' : 'materia-card card-test';
        
        if (item.disabled) {
            card.classList.add('disabled-card');
            card.href = '#';
        } else if (item.type === 'test') {
            card.href = item.link;
        } else {
            card.href = '#'; // Folder click handled by JS
            card.onclick = (e) => {
                e.preventDefault();
                renderMenu(item.id);
            };
        }

        card.innerHTML = `
            <i class="${item.icon}"></i>
            <h3>${item.label}${item.disabled ? ' (Próx.)' : ''}</h3>
        `;
        container.appendChild(card);
    });
}

function goBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop(); // Saca el actual
        const previousId = navigationHistory[navigationHistory.length - 1];
        // Renderizamos el anterior, pero tenemos que evitar que se vuelva a meter al historial en el render
        // Así que modificamos la lógica de render ligeramente o manipulamos el historial manualmente aquí.
        // Simplemente llamamos a render, y render gestionará el push, así que hacemos pop antes.
        
        // Corrección: renderMenu añade al historial. 
        // Para volver, sacamos el actual, y renderizamos el anterior.
        // Pero renderMenu volverá a añadir el anterior. 
        // Truco: renderMenu verifica si ya es el último.
        renderMenu(previousId);
    }
}

function updateNavigationUI() {
    const navBar = document.getElementById('navigation-bar');
    const breadcrumbs = document.getElementById('breadcrumbs');
    
    if (navigationHistory.length > 1) {
        navBar.style.display = 'flex';
        // Construir breadcrumbs visuales (opcional, por ahora solo texto simple)
        // breadcrumbs.textContent = navigationHistory.join(' > '); 
    } else {
        navBar.style.display = 'none';
    }
}
