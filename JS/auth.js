// JS/auth.js - Lógica compartida de autenticación y sesión

const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000;
let inactivityTimer;

function isLoggedIn() {
    const expiration = sessionStorage.getItem('sessionExpiration');
    if (!expiration || Date.now() > parseInt(expiration)) {
        clearSession();
        return false;
    }
    resetInactivityTimer();
    return true;
}

function getUserInfo() {
    if (!isLoggedIn()) return null;
    try {
        return JSON.parse(sessionStorage.getItem('userInfo'));
    } catch (e) {
        return null;
    }
}

function saveSession(userInfo) {
    const expirationTime = Date.now() + SESSION_TIMEOUT_MS;
    sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
    sessionStorage.setItem('sessionExpiration', expirationTime.toString());
    resetInactivityTimer();
}

function clearSession() {
    sessionStorage.removeItem('userInfo');
    sessionStorage.removeItem('sessionExpiration');
    clearTimeout(inactivityTimer);
}

function logoutUser() {
    clearSession();
    // Reemplaza el historial para que el botón "Atrás" no funcione
    window.location.replace('login.html');
}

function checkAuth() {
    if (!isLoggedIn()) {
        // Reemplaza el historial para que el botón "Atrás" no funcione
        window.location.replace('login.html');
    }
}

// --- Manejo del Timer de Inactividad ---
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert("Tu sesión ha expirado por inactividad.");
        logoutUser();
    }, SESSION_TIMEOUT_MS);
}

function setupActivityListeners() {
    // Reinicia el timer con cualquier interacción
    ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
        window.addEventListener(event, resetInactivityTimer, { passive: true }); // Use passive listener
    });
}

// --- Configuración Menú Escritorio ---
function setupUserInfoDropdown() {
    const userInfo = getUserInfo();
    const userNameDisplayDesktop = document.getElementById('user-name-display-desktop'); 
    const dropdownBtn = document.querySelector('.dropdown-btn');
    const dropdownContent = document.querySelector('.dropdown-content');
    const logoutButtonDesktop = document.getElementById('logout-button-desktop'); 

    if (userInfo && userInfo.nombre && userNameDisplayDesktop) {
        userNameDisplayDesktop.textContent = `Aspirante: ${userInfo.nombre}`;
        setupActivityListeners(); 

        if (dropdownBtn && dropdownContent) {
            dropdownBtn.addEventListener('click', (event) => {
                event.stopPropagation(); 
                dropdownContent.classList.toggle('show');
            });

            window.addEventListener('click', (event) => {
                if (!dropdownBtn.contains(event.target) && !dropdownContent.contains(event.target) && dropdownContent.classList.contains('show')) {
                     dropdownContent.classList.remove('show');
                }
            });
        }

        if (logoutButtonDesktop) {
            logoutButtonDesktop.addEventListener('click', (e) => {
                e.preventDefault();
                logoutUser();
            });
        }

    } else if (!userInfo || !userInfo.nombre) { 
        logoutUser();
    }
}

// --- Configuración Menú Móvil ---
function setupMobileMenu() {
    const userInfo = getUserInfo();
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sideNav = document.getElementById('side-nav');
    const closeNavBtn = document.getElementById('close-nav-btn');
    const overlay = document.getElementById('overlay');
    const userNameDisplayMobile = document.getElementById('user-name-display-mobile');
    const logoutButtonMobile = document.getElementById('logout-button-mobile');

    if (hamburgerBtn && sideNav && closeNavBtn && overlay && userNameDisplayMobile && logoutButtonMobile) {
        
         if (userInfo && userInfo.nombre) {
            userNameDisplayMobile.textContent = userInfo.nombre;
         }

        hamburgerBtn.addEventListener('click', () => {
            sideNav.classList.add('open');
            overlay.classList.add('show');
        });

        closeNavBtn.addEventListener('click', () => {
            sideNav.classList.remove('open');
            overlay.classList.remove('show');
        });

        overlay.addEventListener('click', () => {
            sideNav.classList.remove('open');
            overlay.classList.remove('show');
        });

        logoutButtonMobile.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }
}

// --- La sección de Script anti-back ha sido ELIMINADA ---
