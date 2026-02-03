// JS/script-home.js - VERSIÓN DINÁMICA SUPABASE

// Estructura original como respaldo
const DEFAULT_MENU = {
    'root': {
        title: 'Seleccione una Institución',
        desc: 'Elija la institución o categoría.',
        items: [
            { id: 'policia', label: 'POLICÍA NACIONAL', type: 'folder', icon: 'fas fa-user-shield', desc: 'Pruebas Académicas y PPNN' },
            { id: 'ffaa', label: 'FUERZAS ARMADAS', type: 'folder', icon: 'fas fa-fighter-jet', desc: 'ESMIL, ESFORSE, FAE, NAVAL' },
            { id: 'general', label: 'GENERAL UNIFICADO', type: 'folder', icon: 'fas fa-globe', variant: 'wide', desc: 'Pruebas Psicométricas.' }
        ]
    },
    'policia': { title: 'Policía Nacional', desc: 'Categorías.', items: [{ id: 'policia_academicas', label: 'Pruebas Académicas', type: 'folder', icon: 'fas fa-book' }, { id: 'policia_ppnn', label: 'Pruebas PPNN 2025', type: 'folder', icon: 'fas fa-file-alt' }] },
    'policia_academicas': { title: 'Académicas Policía', desc: 'Materias.', items: [{ label: 'CIENCIAS SOCIALES', type: 'test', link: 'simulador.html?materia=sociales', icon: 'fas fa-landmark' }, { label: 'MATEMÁTICAS Y FÍSICA', type: 'test', link: 'simulador.html?materia=matematicas', icon: 'fas fa-calculator' }, { label: 'LENGUA Y LITERATURA', type: 'test', link: 'simulador.html?materia=lengua', icon: 'fas fa-pen-fancy' }, { label: 'INGLÉS', type: 'test', link: 'simulador.html?materia=ingles', icon: 'fas fa-language' }, { label: 'GENERAL (TODAS)', type: 'test', link: 'simulador.html?materia=general', icon: 'fas fa-layer-group' }] },
    'policia_ppnn': { title: 'Pruebas PPNN 2025', desc: 'Cuestionarios.', items: [{ label: 'CUESTIONARIO 1 PPNN', type: 'test', link: 'simulador.html?materia=ppnn1', icon: 'fas fa-file-contract' }, { label: 'CUESTIONARIO 2 PPNN', type: 'test', link: 'simulador.html?materia=ppnn2', icon: 'fas fa-file-contract' }, { label: 'CUESTIONARIO 3 PPNN', type: 'test', link: 'simulador.html?materia=ppnn3', icon: 'fas fa-file-contract' }, { label: 'CUESTIONARIO 4 PPNN', type: 'test', link: 'simulador.html?materia=ppnn4', icon: 'fas fa-file-contract' }] },
    'ffaa': { title: 'Fuerzas Armadas', desc: 'Escuelas.', items: [{ id: 'esmil_menu', label: 'ESMIL', type: 'folder', icon: 'fas fa-university' }] },
    'esmil_menu': { title: 'ESMIL', desc: 'Opciones.', items: [{ id: 'ffaa_esmil_academicas', label: 'Pruebas Académicas', type: 'folder', icon: 'fas fa-book-reader' }, { id: 'ffaa_esmil_inteligencia', label: 'Inteligencia', type: 'folder', icon: 'fas fa-brain' }] },
    'ffaa_esmil_academicas': { title: 'Académicas ESMIL', desc: 'Materias.', items: [{ label: 'SOCIALES', type: 'test', link: 'simulador.html?materia=sociales_esmil', icon: 'fas fa-landmark' }, { label: 'MATEMÁTICAS', type: 'test', link: 'simulador.html?materia=matematicas_esmil', icon: 'fas fa-calculator' }, { label: 'LENGUAJE', type: 'test', link: 'simulador.html?materia=lengua_esmil', icon: 'fas fa-pen-fancy' }, { label: 'INGLÉS', type: 'test', link: 'simulador.html?materia=ingles_esmil', icon: 'fas fa-language' }, { label: 'GENERAL', type: 'test', link: 'simulador.html?materia=general_esmil', icon: 'fas fa-layer-group' }] },
    'ffaa_esmil_inteligencia': { title: 'Inteligencia ESMIL', desc: 'Simuladores.', items: [{ label: 'SIMULADOR 1', type: 'test', link: 'simulador.html?materia=int_esmil_1', icon: 'fas fa-puzzle-piece' }, { label: 'SIMULADOR 2', type: 'test', link: 'simulador.html?materia=int_esmil_2', icon: 'fas fa-puzzle-piece' }, { label: 'SIMULADOR 3 (Mixto)', type: 'test', link: 'simulador.html?materia=int_esmil_3', icon: 'fas fa-list-alt' }, { label: 'SIMULADOR 4', type: 'test', link: 'simulador.html?materia=int_esmil_4', icon: 'fas fa-lightbulb' }, { label: 'SIMULADOR 5', type: 'test', link: 'simulador.html?materia=int_esmil_5', icon: 'fas fa-lightbulb' }, { label: 'SIMULADOR 6', type: 'test', link: 'simulador.html?materia=int_esmil_6', icon: 'fas fa-lightbulb' }, { label: 'SIMULADOR 7 (COMPLETO)', type: 'test', link: 'simulador.html?materia=int_esmil_7', icon: 'fas fa-brain' }] },
    'general': { title: 'General', desc: 'Psicométricas.', items: [{ id: 'general_psico', label: 'Psicosométricos', type: 'folder', icon: 'fas fa-brain' }] },
    'general_psico': { title: 'Psicosométricos', desc: 'Pruebas.', items: [{ id: 'inteligencia_menu', label: 'INTELIGENCIA', type: 'folder', icon: 'fas fa-lightbulb' }, { label: 'PERSONALIDAD', type: 'test', link: 'simulador.html?materia=personalidad', icon: 'fas fa-user' }] },
    'inteligencia_menu': { title: 'Inteligencia', desc: 'Versiones.', items: [{ label: 'INTELIGENCIA V1', type: 'test', link: 'simulador.html?materia=inteligencia', icon: 'fas fa-brain' }, { label: 'INTELIGENCIA V2', type: 'test', link: '#', icon: 'fas fa-brain', disabled: true }] }
};

// Variables Globales
let MENU_DATA = JSON.parse(JSON.stringify(DEFAULT_MENU));
let navigationHistory = [];
let currentMenuId = 'root';
let isEditMode = false;
let itemToEdit = null;

// Conexión Supabase (Misma del auth.js)
const sbUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const db = window.supabase.createClient(sbUrl, sbKey);

document.addEventListener('DOMContentLoaded', async () => {
    await cargarMenuDesdeNube();
    renderMenu('root');
    document.getElementById('btn-atras').addEventListener('click', goBack);
});

// --- LÓGICA SUPABASE ---
async function cargarMenuDesdeNube() {
    try {
        const { data, error } = await db.from('menu_structure').select('json_data').order('id', { ascending: false }).limit(1);
        if (data && data.length > 0) {
            MENU_DATA = data[0].json_data;
            console.log("Menú cargado desde Supabase ✅");
        }
    } catch (e) { console.error("Usando menú local."); }
}

async function guardarCambiosEnNube() {
    const btn = document.getElementById('btn-save-changes');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
    try {
        const { error } = await db.from('menu_structure').insert([{ json_data: MENU_DATA }]);
        if (error) throw error;
        alert("¡Menú guardado exitosamente!");
        toggleEditMode();
    } catch (e) { alert("Error al guardar: " + e.message); }
    btn.innerHTML = '<i class="fas fa-save"></i> GUARDAR';
}

// --- RENDERIZADO ---
function renderMenu(menuId) {
    currentMenuId = menuId;
    const data = MENU_DATA[menuId] || { title: 'Vacío', items: [] };
    
    // Historial y UI
    if (menuId === 'root') navigationHistory = ['root'];
    else if (navigationHistory[navigationHistory.length - 1] !== menuId) navigationHistory.push(menuId);
    
    document.getElementById('navigation-bar').style.display = navigationHistory.length > 1 ? 'flex' : 'none';
    document.getElementById('section-title').textContent = data.title;
    document.getElementById('section-desc').textContent = data.desc || '';
    
    const container = document.getElementById('dynamic-grid');
    container.innerHTML = '';

    // Botón AÑADIR (Solo en Edit Mode)
    if (isEditMode) {
        const addBtn = document.createElement('div');
        addBtn.className = 'materia-card';
        addBtn.style.border = "3px dashed #27ae60";
        addBtn.style.display = "flex"; addBtn.style.flexDirection = "column";
        addBtn.style.justifyContent = "center"; addBtn.style.alignItems = "center"; addBtn.style.cursor = "pointer"; addBtn.style.minHeight = "150px";
        addBtn.innerHTML = `<i class="fas fa-plus-circle" style="font-size:3rem; color:#27ae60;"></i><h3 style="color:#27ae60; margin-top:10px;">AÑADIR</h3>`;
        addBtn.onclick = () => { document.getElementById('nuevo-modal').style.display = 'flex'; };
        container.appendChild(addBtn);
    }

    data.items.forEach((item, index) => {
        const card = document.createElement('div');
        let baseClass = item.type === 'folder' ? 'materia-card card-folder' : 'materia-card card-test';
        if (item.variant === 'wide') baseClass += ' card-wide';
        card.className = baseClass;
        card.style.position = 'relative';

        let html = `<i class="${item.icon || (item.type==='folder'?'fas fa-folder':'fas fa-file-alt')}"></i>`;
        if (item.variant === 'wide') html += `<div class="text-content"><h3>${item.label}</h3><p>${item.desc || ''}</p></div>`;
        else html += `<h3>${item.label}${item.disabled?' (Próx.)':''}</h3>${item.desc ? `<p>${item.desc}</p>` : ''}`;

        // Controles de Edición
        if (isEditMode) {
            html += `<div style="position:absolute; top:5px; right:5px; display:flex; gap:5px; z-index:10;">
                <button onclick="moverItem('${menuId}', ${index}, -1)" style="background:#3498db; color:white; border:none; padding:5px; cursor:pointer;">⬅️</button>
                <button onclick="moverItem('${menuId}', ${index}, 1)" style="background:#3498db; color:white; border:none; padding:5px; cursor:pointer;">➡️</button>
                <button onclick="abrirEditor('${menuId}', ${index})" style="background:#f39c12; color:white; border:none; padding:5px; cursor:pointer;">✏️</button>
                <button onclick="borrarItem('${menuId}', ${index})" style="background:#c0392b; color:white; border:none; padding:5px; cursor:pointer;">🗑️</button>
            </div>`;
            card.style.border = "2px dashed #f39c12";
            card.style.transform = "scale(0.98)";
        } else {
            card.style.cursor = 'pointer';
            if (!item.disabled) {
                card.onclick = () => {
                    if (item.type === 'folder') renderMenu(item.id);
                    else location.href = item.link;
                };
            }
        }
        card.innerHTML = html;
        container.appendChild(card);
    });
}

// --- EDICIÓN ---
function toggleEditMode() {
    isEditMode = !isEditMode;
    document.getElementById('btn-save-changes').style.display = isEditMode ? 'flex' : 'none';
    document.getElementById('btn-edit-mode').innerHTML = isEditMode ? '<i class="fas fa-times"></i> SALIR' : '<i class="fas fa-edit"></i> EDITAR';
    renderMenu(currentMenuId);
}

function moverItem(menuId, index, direction) {
    const items = MENU_DATA[menuId].items;
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < items.length) {
        [items[index], items[newIndex]] = [items[newIndex], items[index]];
        renderMenu(menuId);
    }
}

function borrarItem(menuId, index) {
    if(confirm("¿Eliminar este elemento?")) {
        MENU_DATA[menuId].items.splice(index, 1);
        renderMenu(menuId);
    }
}

function abrirEditor(menuId, index) {
    itemToEdit = { menuId, index };
    const item = MENU_DATA[menuId].items[index];
    document.getElementById('edit-nombre').value = item.label;
    document.getElementById('edit-desc').value = item.desc || '';
    document.getElementById('editor-modal').style.display = 'flex';
}

function aplicarCambiosItem() {
    if (itemToEdit) {
        const item = MENU_DATA[itemToEdit.menuId].items[itemToEdit.index];
        item.label = document.getElementById('edit-nombre').value;
        item.desc = document.getElementById('edit-desc').value;
        renderMenu(currentMenuId);
        document.getElementById('editor-modal').style.display = 'none';
        itemToEdit = null;
    }
}

// --- CREACIÓN ---
function crearElemento() {
    const tipo = document.getElementById('new-type').value;
    const nombre = document.getElementById('new-name').value;
    if (!nombre) return alert("Escribe un nombre");

    if (tipo === 'folder') {
        const nuevoId = 'folder_' + Date.now();
        MENU_DATA[currentMenuId].items.push({ id: nuevoId, label: nombre, type: 'folder', icon: 'fas fa-folder', desc: 'Carpeta nueva' });
        MENU_DATA[nuevoId] = { title: nombre, desc: 'Contenido...', items: [] };
        document.getElementById('nuevo-modal').style.display = 'none';
        renderMenu(currentMenuId);
    } 
    else if (tipo === 'test') {
        // Redirige al creador de preguntas
        const nuevoSimId = 'custom_' + Date.now();
        location.href = `creador.html?id=${nuevoSimId}&nombre=${encodeURIComponent(nombre)}&parent=${currentMenuId}`;
    }
}

function goBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop();
        renderMenu(navigationHistory[navigationHistory.length - 1]);
    }
}
