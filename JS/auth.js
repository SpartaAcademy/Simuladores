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
        console.error("Error parsing user info from sessionStorage", e);
        clearSession();
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
    window.location.replace('login.html');
}

function checkAuth() {
    if (!isLoggedIn()) {
        window.location.replace('login.html');
    }
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert("Tu sesión ha expirado por inactividad.");
        logoutUser();
    }, SESSION_TIMEOUT_MS);
}

function setupActivityListeners() {
    ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
        window.addEventListener(event, resetInactivityTimer, { passive: true });
    });
}

function setupUserInfoDropdown() {
    const userInfo = getUserInfo();
    const userNameDisplayDesktop = document.getElementById('user-name-display-desktop');
    const dropdownBtn = document.querySelector('.dropdown-btn');
    const dropdownContent = document.querySelector('.dropdown-content');
    const logoutButtonDesktop = document.getElementById('logout-button-desktop');
    const resultadosBtnDesktop = document.getElementById('ver-resultados-desktop'); 

    if (userInfo && userInfo.nombre && userInfo.rol && userNameDisplayDesktop) {
        const prefix = (userInfo.rol === 'aspirante') ? 'Aspirante: ' : 'Usuario: ';
        userNameDisplayDesktop.textContent = prefix + userInfo.nombre;
        setupActivityListeners();

        if (userInfo.rol === 'admin') {
            if (resultadosBtnDesktop) resultadosBtnDesktop.style.display = 'block';
        } else {
            if (resultadosBtnDesktop) resultadosBtnDesktop.style.display = 'none';
        }

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
            logoutButtonDesktop.addEventListener('click', (e) => { e.preventDefault(); logoutUser(); });
        }
    } else if (!userInfo || !userInfo.nombre || !userInfo.rol) {
        console.warn("Falta información de usuario en sesión. Redirigiendo a login.");
        logoutUser();
    }
}

function setupMobileMenu() {
    const userInfo = getUserInfo();
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sideNav = document.getElementById('side-nav');
    const closeNavBtn = document.getElementById('close-nav-btn');
    const overlay = document.getElementById('overlay');
    const userNameDisplayMobile = document.getElementById('user-name-display-mobile');
    const userRoleDisplayMobile = document.getElementById('user-prefix-mobile'); 
    const logoutButtonMobile = document.getElementById('logout-button-mobile');
    const resultadosBtnMobile = document.getElementById('ver-resultados-mobile'); 

    if (hamburgerBtn && sideNav && closeNavBtn && overlay && userNameDisplayMobile && userRoleDisplayMobile && logoutButtonMobile) {
         if (userInfo && userInfo.nombre && userInfo.rol) {
            userNameDisplayMobile.textContent = userInfo.nombre;
            const prefix = (userInfo.rol === 'aspirante') ? 'Aspirante:' : 'Usuario:';
            userRoleDisplayMobile.textContent = prefix;

            if (userInfo.rol === 'admin') {
                if (resultadosBtnMobile) resultadosBtnMobile.style.display = 'block';
            } else {
                if (resultadosBtnMobile) resultadosBtnMobile.style.display = 'none';
            }
         }
        hamburgerBtn.addEventListener('click', () => { sideNav.classList.add('open'); overlay.classList.add('show'); });
        closeNavBtn.addEventListener('click', () => { sideNav.classList.remove('open'); overlay.classList.remove('show'); });
        overlay.addEventListener('click', () => { sideNav.classList.remove('open'); overlay.classList.remove('show'); });
        logoutButtonMobile.addEventListener('click', (e) => { e.preventDefault(); logoutUser(); });
    }
}
