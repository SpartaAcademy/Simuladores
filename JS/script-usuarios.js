// JS/script-usuarios.js - CRUD COMPLETO

const sbUrl = 'https://fgpqioviycmgwypidhcs.supabase.co';
const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHFpb3ZpeWNtZ3d5cGlkaGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTkwMDgsImV4cCI6MjA4MTA3NTAwOH0.5ckdzDtwFRG8JpuW5S-Qi885oOSVESAvbLoNiqePJYo';
const db = window.supabase.createClient(sbUrl, sbKey);

let allUsers = [];
let menuFolders = [];

document.addEventListener('DOMContentLoaded', async () => {
    await cargarCarpetasMenu();
    cargarUsuarios();
});

// Obtener carpetas para permisos
async function cargarCarpetasMenu() {
    try {
        const { data } = await db.from('menu_structure').select('json_data').order('id', {ascending:false}).limit(1);
        if(data && data.length > 0) {
            const menu = data[0].json_data;
            menuFolders = menu['root'].items.filter(i => i.type === 'folder');
        }
    } catch(e) { console.error("Error cargando carpetas", e); }
}

// Cargar tabla
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

// Modal y CRUD
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

    // Generar checks
    permContainer.innerHTML = `
        <div class="permiso-item">
            <input type="checkbox" id="perm-all" value="*" checked onchange="toggleAllPerms(this)">
            <label for="perm-all" style="margin:0"><strong>TODO EL CONTENIDO (Acceso Total)</strong></label>
        </div>
    `;
    
    menuFolders.forEach(f => {
        permContainer.innerHTML += `
            <div class="permiso-item">
                <input type="checkbox" class="folder-chk" value="${f.id}" disabled checked>
                <label style="margin:0">${f.label}</label>
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
        chk.checked = mainChk.checked;
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
