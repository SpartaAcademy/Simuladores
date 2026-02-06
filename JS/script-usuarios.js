// JS/script-usuarios.js - GESTIÓN AVANZADA Y RECURSIVA

const sbUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const db = window.supabase.createClient(sbUrl, sbKey);

let allUsers = [];
let fullMenuData = {}; 

document.addEventListener('DOMContentLoaded', async () => {
    await cargarEstructuraMenu();
    cargarUsuarios();
});

// --- 1. CARGAR ARBOL DE CARPETAS ---
async function cargarEstructuraMenu() {
    try {
        const { data } = await db.from('menu_structure').select('json_data').order('id', {ascending:false}).limit(1);
        if(data && data.length > 0) {
            fullMenuData = data[0].json_data;
        }
    } catch(e) { console.error("Error cargando menú", e); }
}

// Función recursiva para sacar todas las carpetas y subcarpetas
function listarCarpetasRecursivas(menuId, nivel = 0, lista = []) {
    const folderData = fullMenuData[menuId];
    if (!folderData || !folderData.items) return lista;

    folderData.items.forEach(item => {
        if (item.type === 'folder') {
            lista.push({ 
                id: item.id, 
                label: item.label, 
                level: nivel 
            });
            // Recursividad: Buscar dentro de esta carpeta
            listarCarpetasRecursivas(item.id, nivel + 1, lista);
        }
    });
    return lista;
}

// --- 2. TABLA DE USUARIOS ---
async function cargarUsuarios() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando...</td></tr>';

    const { data, error } = await db.from('usuarios').select('*').order('id', {ascending: true});
    
    if(error) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Error cargando usuarios</td></tr>';
        return;
    }
    allUsers = data;
    renderTabla();
}

function renderTabla() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    allUsers.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${u.usuario}</strong></td>
            <td>${u.nombre}</td>
            <td>${u.ciudad || '-'}</td>
            <td><span class="role-badge role-${u.rol}">${u.rol}</span></td>
            <td style="text-align:center;">
                <button class="action-btn btn-edit" onclick="editarUsuario(${u.id})"><i class="fas fa-pen"></i></button>
                <button class="action-btn btn-del" onclick="eliminarUsuario(${u.id})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- 3. MODAL Y PERMISOS ---
function abrirModal(userId = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('modal-title');
    const permContainer = document.getElementById('folder-permissions');
    
    document.getElementById('user-id').value = '';
    document.getElementById('inp-user').value = '';
    document.getElementById('inp-pass').value = '';
    document.getElementById('inp-name').value = '';
    document.getElementById('inp-city').value = '';
    document.getElementById('inp-role').value = 'aspirante';

    permContainer.innerHTML = `
        <div class="permiso-item" style="background:#e8f5e9; border:1px solid #c8e6c9;">
            <input type="checkbox" id="perm-all" value="*" checked onchange="toggleAllPerms(this)">
            <label for="perm-all" style="margin:0; font-weight:bold; color:#2e7d32;">ACCESO TOTAL (Admin)</label>
        </div>
    `;
    
    const listaPlana = listarCarpetasRecursivas('root');
    
    listaPlana.forEach(carpeta => {
        const indent = carpeta.level * 20; 
        const icon = carpeta.level === 0 ? 'fas fa-folder' : 'fas fa-folder-open';
        
        permContainer.innerHTML += `
            <div class="permiso-item" style="padding-left: ${indent + 10}px;">
                <input type="checkbox" class="folder-chk" value="${carpeta.id}" disabled checked>
                <label style="margin:0"><i class="${icon}" style="color:#f39c12; margin-right:5px;"></i> ${carpeta.label}</label>
            </div>
        `;
    });

    if (userId) {
        title.textContent = "EDITAR USUARIO";
        const u = allUsers.find(x => x.id === userId);
        document.getElementById('user-id').value = u.id;
        document.getElementById('inp-user').value = u.usuario;
        document.getElementById('inp-pass').value = u.contrasena;
        document.getElementById('inp-name').value = u.nombre;
        document.getElementById('inp-city').value = u.ciudad;
        document.getElementById('inp-role').value = u.rol;

        if (u.permisos && !u.permisos.includes('*')) {
            document.getElementById('perm-all').checked = false;
            document.querySelectorAll('.folder-chk').forEach(chk => {
                chk.disabled = false;
                chk.checked = u.permisos.includes(chk.value);
            });
        }
    } else {
        title.textContent = "NUEVO USUARIO";
    }
    
    modal.style.display = 'flex';
}

window.toggleAllPerms = (mainChk) => {
    const subs = document.querySelectorAll('.folder-chk');
    subs.forEach(chk => {
        chk.disabled = mainChk.checked;
        if(mainChk.checked) chk.checked = true;
    });
}

window.editarUsuario = (id) => abrirModal(id);

window.eliminarUsuario = async (id) => {
    if(!confirm("¿Seguro que quieres eliminar a este usuario?")) return;
    const { error } = await db.from('usuarios').delete().eq('id', id);
    if(error) alert("Error: " + error.message);
    else cargarUsuarios();
}

window.guardarUsuario = async () => {
    const id = document.getElementById('user-id').value;
    const usuario = document.getElementById('inp-user').value;
    const contrasena = document.getElementById('inp-pass').value;
    const nombre = document.getElementById('inp-name').value;
    const ciudad = document.getElementById('inp-city').value;
    const rol = document.getElementById('inp-role').value;

    if (!usuario || !contrasena) return alert("Usuario y contraseña obligatorios");

    let permisos = [];
    if (document.getElementById('perm-all').checked) {
        permisos = ['*'];
    } else {
        document.querySelectorAll('.folder-chk:checked').forEach(chk => permisos.push(chk.value));
    }

    const userData = { usuario, contrasena, nombre, ciudad, rol, permisos };

    let error;
    if (id) {
        const res = await db.from('usuarios').update(userData).eq('id', id);
        error = res.error;
    } else {
        const res = await db.from('usuarios').insert([userData]);
        error = res.error;
    }

    if(error) alert("Error al guardar: " + error.message);
    else {
        document.getElementById('user-modal').style.display = 'none';
        cargarUsuarios();
    }
}
